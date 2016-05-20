'use strict';

var debug     = require('debug')('kiss.io:server');
var http      = require('http');
var eio       = require('engine.io');
var url       = require('url');

var Client    = require('./client.class');
var Namespace = require('./namespace.class');
var Socket    = require('./socket.class');
var Plugin    = require('./plugin.class');
var Router    = require('./router.class');


/**
 * @returns {Server} singleton or new instance.
 */
function Server(opts)
{
  if (!(this instanceof Server))
  {
    if(!Server.singleton)
    {
      Server.singleton = new Server(opts);
    }

    return Server.singleton;
  }

  this.engine = null;
  this.httpServer = null;

  this.nsps = {};
  this.nsps['/'] = this.of('/');

  this.opts = opts || {};

  this.path(this.opts.path || '/socket.io');
  this.origins(this.opts.origins || '*:*');
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
 * Sets the client serving path.
 *
 * @param {String} [v] pathname
 * @return {Server|String} self when setting or value when getting
 * @api public
 */

Server.prototype.path = function(v)
{
  if (!arguments.length)
  {
    return this._path;
  }

  this._path = v.replace(/\/$/, '');
  return this;
};

/**
 * Sets the allowed origins for requests.
 *
 * @param {String} [v] origins
 * @return {Server|Adapter} self when setting or value when getting
 * @api public
 */

Server.prototype.origins = function(v)
{
  if (!arguments.length)
  {
    return this._origins;
  }

  this._origins = v;
  return this;
};

Server.createHttpServer = function(app)
{
  function defaultListener(req, res)
  {
    res.writeHead(404);
    res.end();
  }

  return http.createServer(app || defaultListener);
};

// TODO: add support for https
Server.prototype.attach =
Server.prototype.attachHttp = function(srv, opts)
{
  if(this.httpServer)
  {
    this.close();
    delete this.httpServer;
  }

  if(!(srv instanceof http.Server))
  {
    srv = Server.createHttpServer(srv);
  }

  opts = opts || {};
  opts.path = opts.path || this.path();
  opts.allowRequest = opts.allowRequest || this.checkRequest.bind(this);

  this.httpServer = srv;

  // bind to engine events
  debug('creating engine.io instance with opts %j', opts);
  this.bind(eio.attach(srv, opts));

  return this;
};

Server.prototype.listen = function()
{
  if(!(this.httpServer instanceof http.Server))
  {
    this.attachHttp();
  }

  this.httpServer.listen.apply(this.httpServer, arguments);

  return this;
};

/**
 * Binds socket.io to an engine.io instance.
 *
 * @param {eio.Server} engine engine.io (or compatible) server
 * @return {Server} self
 * @api public
 */

Server.prototype.bind = function(engine)
{
  this.engine = engine;
  this.engine.on('connection', this.onConnection.bind(this));

  return this;
};

/**
 * Called with each incoming transport connection.
 *
 * @param {eio.Socket} conn - connection
 * @return {Server} self
 * @api public
 */

Server.prototype.onConnection = function(conn)
{
  var client;

  debug('incoming connection with id %s', conn.id);

  client = new Client(this, conn);
  client . connect('/');

  return this;
};

/**
 * Closes server connection
 *
 * @api public
 */

Server.prototype.close = function()
{
  for(let nspId of Object.keys(this.nsps))
  {
    let nsp = this.nsps[nspId];

    for(let sid of Object.keys(nsp.sockets))
    {
      let socket = nsp.sockets[sid];

      socket.onClose();
    }
  }

  this.engine.close();

  if(this.httpServer)
  {
    this.httpServer.close();
  }

  return this;
};

Server.prototype.createNsp =
Server.prototype.createNamespace = function(name, opts)
{
  return new Namespace(name, opts);
};

Server.prototype.nsp =
Server.prototype.of = function(name, opts)
{
  var nspId = Namespace.genId(name);
  var nsp = this.nsps[nspId];

  if(!nsp)
  {
    debug('initializing namespace %s', name);
    nsp = new Namespace(name, opts);

    this.nsps[nsp.id] = nsp;
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
  else
  {
    debug('could not mount nsp: must be instanceof Namespace!');
  }

  return this;
};

Server.Server = Server;
Server.Namespace = Namespace;
Server.Socket = Socket;
Server.Plugin = Plugin;
Server.Router = Router;

/**
 * Module exports.
 */

module.exports = Server;
