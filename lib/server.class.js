'use strict';

var debug         = require('debug')('kiss.io:server');
var http          = require('http');
var read          = require('fs').readFileSync;
var engine        = require('engine.io');
var client        = require('socket.io-client');
var clientVersion = require('socket.io-client/package').version;
var url           = require('url');

var Client        = require('./client.class');
var Namespace     = require('./namespace.class');
var Socket        = require('./socket.class');
var Plugin        = require('./plugin.class');

/**
 * Socket.IO client source.
 */

var clientSource  = read(require.resolve('socket.io-client/socket.io.js'), 'utf-8');

/**
 * @returns Server: singleton or new instance.
 */
function Server(srv, opts)
{
  if (!(this instanceof Server))
  {
    if(!Server.singleton)
    {
      Server.singleton = new Server(srv, opts);
    }

    return Server.singleton;
  }

  if (!(srv instanceof http.Server)
      && typeof srv == 'object')
  {
    opts = srv;
    srv = null;
  }

  opts = opts || {};

  this.nsps = {};
  this.nsps['/'] = this.of('/');

  this.path(opts.path || '/socket.io');
  this.serveClient(false !== opts.serveClient);
  this.origins(opts.origins || '*:*');

  if (srv) this.attach(srv, opts);
}

/**
 * Server request verification function, that checks for allowed origins
 *
 * @param {http.IncomingMessage} req request
 * @param {Function} fn callback to be called with the result: `fn(err, success)`
 */

Server.prototype.checkRequest = function(req, fn)
{
  var origin = req.headers.origin || req.headers.referer;

  // file:// URLs produce a null Origin which can't be authorized via echo-back
  if ('null' == origin || null == origin) origin = '*';

  if (!!origin && typeof(this._origins) == 'function')
  {
    return this._origins(origin, fn);
  }
  else if (this._origins.indexOf('*:*') !== -1)
  {
    return fn(null, true);
  }

  if (origin)
  {
    try
    {
      var parts = url.parse(origin);
      var defaultPort = 'https:' == parts.protocol ? 443 : 80;

      parts.port = parts.port != null
        ? parts.port
        : defaultPort;

      var ok =
        ~this._origins.indexOf(parts.hostname + ':' + parts.port) ||
        ~this._origins.indexOf(parts.hostname + ':*') ||
        ~this._origins.indexOf('*:' + parts.port);

      return fn(null, !!ok);
    }
    catch (e)
    {
    }
  }

  fn(null, false);
};

/**
 * Sets/gets whether client code is being served.
 *
 * @param {Boolean} v whether to serve client code
 * @return {Server|Boolean} self when setting or value when getting
 * @api public
 */

Server.prototype.serveClient = function(v)
{
  if (!arguments.length) return this._serveClient;

  this._serveClient = v;
  return this;
};

/**
 * Old settings for backwards compatibility
 */

var oldSettings = {
  "transports": "transports",
  "heartbeat timeout": "pingTimeout",
  "heartbeat interval": "pingInterval",
  "destroy buffer size": "maxHttpBufferSize"
};

/**
 * Sets the client serving path.
 *
 * @param {String} v pathname
 * @return {Server|String} self when setting or value when getting
 * @api public
 */

Server.prototype.path = function(v){
  if (!arguments.length) return this._path;

  this._path = v.replace(/\/$/, '');
  return this;
};

/**
 * Sets the allowed origins for requests.
 *
 * @param {String} v origins
 * @return {Server|Adapter} self when setting or value when getting
 * @api public
 */

Server.prototype.origins = function(v){
  if (!arguments.length) return this._origins;

  this._origins = v;
  return this;
};

Server.createHttpServer = function()
{
  return http.createServer(function(req, res)
  {
    res.writeHead(404);
    res.end();
  });
};

// TODO: add support for https
Server.prototype.attach = function(srv, opts)
{
  if(this.httpServer instanceof http.Server)
  {
    this.close();
  }

  if(!(srv instanceof http.Server))
  {
    debug('You are trying to start a socket.io server ' +
        'without a valid http.Server. creating http server.');

    srv = Server.createHttpServer();
  }

  // set engine.io path to `/socket.io`
  opts = opts || {};
  opts.path = opts.path || this.path();
  // set origins verification
  opts.allowRequest = opts.allowRequest || this.checkRequest.bind(this);

  // initialize engine
  debug('creating engine.io instance with opts %j', opts);
  this.eio = engine.attach(srv, opts);

  // attach static file serving
  if (this._serveClient) this.attachServe(srv);

  // Export http server
  this.httpServer = srv;

  // bind to engine events
  this.bind(this.eio);

  return this;
};

Server.prototype.listen = function()
{
  if(this.httpServer instanceof http.Server)
  {
    this.close();
  }
  else
  {
    this.attach();
  }

  this.httpServer.listen(...arguments);

  return this;
};

/**
 * Attaches the static file serving.
 *
 * @param {Function|http.Server} srv http server
 * @api private
 */

Server.prototype.attachServe = function(srv)
{
  debug('attaching client serving req handler');

  var url = this._path + '/socket.io.js';
  var evs = srv.listeners('request').slice(0);
  var self = this;

  srv.removeAllListeners('request');

  srv.on('request', function(req, res)
  {
    if (0 === req.url.indexOf(url))
    {
      self.serve(req, res);
    }
    else
    {
      for (var i = 0; i < evs.length; i++)
      {
        evs[i].call(srv, req, res);
      }
    }
  });
};

/**
 * Handles a request serving `/socket.io.js`
 *
 * @param {http.Request} req
 * @param {http.Response} res
 * @api private
 */

Server.prototype.serve = function(req, res)
{
  var etag = req.headers['if-none-match'];

  if (etag && etag == clientVersion)
  {
    debug('serve client 304');
    res.writeHead(304);
    res.end();
    return;
  }

  debug('serve client source');

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('ETag', clientVersion);
  res.writeHead(200);
  res.end(clientSource);
};

/**
 * Binds socket.io to an engine.io instance.
 *
 * @param {engine.Server} engine engine.io (or compatible) server
 * @return {Server} self
 * @api public
 */

Server.prototype.bind = function(engine)
{
  this.engine = engine;
  this.engine.on('connection', this.onconnection.bind(this));

  return this;
};

/**
 * Called with each incoming transport connection.
 *
 * @param {engine.Socket} conn
 * @return {Server} self
 * @api public
 */

Server.prototype.onconnection = function(conn)
{
  var client;

  debug('incoming connection with id %s', conn.id);

  client = new Client(this, conn);
  client.connect('/');

  return this;
};

Server.prototype.of = function(name, opts)
{
  var nspId = Namespace.genId(name);
  var nsp = this.nsps[nspId];

  if(!nsp)
  {
    debug('initializing namespace %s', name);
    nsp = new Namespace(name, opts);

    this.nsps[nspId] = nsp;
  }

  return nsp;
};

Server.prototype.use =
Server.prototype.mount = function(nsp)
{
  if(nsp instanceof Namespace)
  {
    this.nsps[nsp.id] = nsp;
  }

  return this;
};

/**
 * Closes server connection
 *
 * @api public
 */

Server.prototype.close = function()
{
  for (var id in this.nsps['/'].sockets)
  {
    if (this.nsps['/'].sockets.hasOwnProperty(id))
    {
      this.nsps['/'].sockets[id].onclose();
    }
  }

  this.engine.close();

  if(this.httpServer)
  {
    this.httpServer.close();
  }

  return this;
};

Server.Server = Server;
Server.Namespace = Namespace;
Server.Socket = Socket;
Server.Plugin = Plugin;

Server.prototype.createNamespace = function(name, opts)
{
  return new Namespace(name, opts);
};

/**
 * Module exports.
 */

module.exports = Server;
