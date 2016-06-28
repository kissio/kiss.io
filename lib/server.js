'use strict';

var debug     = require('debug')('kiss.io:server');
var http      = require('http');
var eio       = require('engine.io');
var url       = require('url');

var Client    = require('./client');
var Namespace = require('./namespace');
var Socket    = require('./socket');
var Plugin    = require('./plugin');
var Router    = require('./router');


/**
 * Server is the main component of kiss.io.
 * @constructs Server
 * @access public
 *
 * @param {Object} [opts]: special options for the server.
 * @returns {Server} singleton or new instance.
 */
function Server(opts)
{
  if (!(this instanceof Server))
  {
    return Server.instance(opts);
  }

  this.engine = null;
  this.httpServer = null;
  this.nsps = {};
  this.opts = opts || {};

  if(this.opts.sioCompatible)
  {
    this.makeCompatible();
  }

  this.path(this.opts.path || '/io');
  this.origins(this.opts.origins || '*:*');
}

/**
 * Get or create if not exists a Server instance which will act as
 * ..a global singleton which is accessible through the application.
 *
 * @access public
 *
 * @param {Object} [opts]: opts to pass to the `Server` constructor
 * @returns {Server} singleton instance
 */
Server.instance = function(opts)
{
  if(!Server.singleton)
  {
    Server.singleton = new Server(opts);
  }

  return Server.singleton;
};

/*!
 * Static `Server` exports/shortcuts.
 */
Server.Server = Server;
Server.Namespace = Namespace;
Server.Client = Client;
Server.Socket = Socket;
Server.Plugin = Plugin;
Server.Router = Router;

/**
 * Server request verification function, that checks for allowed origins
 *
 * @access private
 *
 * @param {http.IncomingMessage} req
 * @param {Function} fn: callback that takes `err, success`.
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
 * Sets/gets the transport path of the server, used by the clients to connect
 * ..to the server.
 *
 * @access public
 *
 * @param {String} [path] pathname
 * @returns {String} transport path
 */
Server.prototype.path = function(path)
{
  if (arguments.length)
  {
    this._path = path.replace(/\/$/, '');
    this.opts.path = this._path;
  }

  return this._path;
};

/**
 * Sets/gets the allowed origins for requests.
 *
 * @access public
 *
 * @param {String|Array<String>|Function} [origins]
 * @returns {String} app's allowed origins.
 */
Server.prototype.origins = function(origins)
{
  if (arguments.length)
  {
    if(typeof(origins) != 'function' &&
      !Array.isArray(origins))
    {
      origins = [origins];
    }

    this._origins = origins;
    this.opts.origins = this._origins;
  }

  return this._origins;
};

Server.prototype.makeCompatible = function()
{
  this.path('/socket.io');
  this.opts.sioCompatible = true;
  return this;
};

/**
 * Used internally.
 * Creates a basic http server to attach the transport layer on.
 * It can be used in conjunction with express.js by passing its instance as
 * ..param `app`.
 *
 * @static {Server::createHttpServer}
 * @access private
 *
 * @param {Function} [app]: if provided, used instead of the default listener.
 * ..(can be an instance of express.js).
 * @returns {http.Server}
 */
Server.createHttpServer = function(app)
{
  function defaultListener(req, res)
  {
    res.writeHead(404);
    res.end();
  }

  return http.createServer(app || defaultListener);
};

/**
 * Attaches a http sever to the kiss.io `Server`, to be used as a transport
 * ..layer for the clients to connect to.
 * If no http server is provided before calling `Server.listen` - a default
 * ..basic http server will be initiated for you.
 * If `attach` is called while there's already a http server attached to the
 * ..`Server`, the server will close and destroy the old http server and start
 * ..a new one as provided.
 *
 * TODO: add support for https
 *
 * @alias {Server.attachHttp}
 * @access public
 *
 * @param {http.Server|Function} srv
 * @param {Object} [opts]: special opts to pass to the underlying engine.io.
 * @returns {Server} self
 */
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

  opts = Object.assign({}, this.opts, (opts || {}));
  opts.path = opts.path || this.path();
  opts.allowRequest = opts.allowRequest || this.checkRequest.bind(this);

  this.httpServer = srv;

  // bind to engine events
  debug('creating engine.io instance with opts %j', opts);
  this.bind(eio.attach(srv, opts));

  return this;
};

/**
 * Until called, `Server` won't be accessible from the "outside world".
 * `arguments` are passed to the http.Server.listen function -- see docs.
 *
 * If no http server is provided before calling `listen` - a default, basic
 * ..http server is created with Server.attachHttp().
 *
 * @see http.Server.listen
 * @url https://nodejs.org/api/http.html#http_server_listen_handle_callback
 *
 * @access public
 *
 * @returns {Server} self
 */
Server.prototype.listen = function()
{
  if(!this.httpServer)
  {
    this.attachHttp();
  }

  this.httpServer.listen.apply(this.httpServer, arguments);

  return this;
};

/**
 * Binds `Server` to an engine.io instance.
 *
 * @access private
 *
 * @param {eio.Server} engine: engine.io (or compatible) server.
 * @return {Server} self
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
 * @access private
 *
 * @param {eio.Socket} conn
 * @return {Client} the new `Client` created for the connection.
 */
Server.prototype.onConnection = function(conn)
{
  debug('incoming connection with id %s', conn.id);

  var client = new Client(this, conn);

  // done to overcome a bug with socket.io-client when connecting
  // ..to default namespace '/'.
  // socket.io-client assumes that the client is connected to '/'
  // ..nsp by default and therefore doesn't send a connect packet
  // ..when trying to connect to '/'.
  // fires only if sioCompatible flag is ON.
  if(this.opts.sioCompatible && this.nsps['/'])
  {
    client.connect('/');
  }

  return client;
};

/**
 * Closes server connection, throws sockets and destroys http server instance.
 *
 * @access public
 */
Server.prototype.close = function()
{
  Object.keys(this.nsps).forEach(function(name)
  {
    var nsp = this.nsps[name];

    Object.keys(nsp.sockets).forEach(function(sid)
    {
      nsp.socket(sid).onClose();
    });
  }, this);

  this.engine.close();

  if(this.httpServer)
  {
    this.httpServer.close();
  }
};

/**
 * Targets (by returning) existing/newly-created namespace which is mounted
 * ..on the server.
 * If the namespace doesn't exists -- creates a new one with the parameters provided.
 *
 * @alias {Server.namespace}
 * @access public
 *
 * @param {String} name: the name of the namespace to return/create.
 * @param {Object} [opts]: if nsp doesn't exists -- create new and use these opts.
 * @returns {Namespace}
 */

Server.prototype.of =
Server.prototype.namespace = function(name, opts)
{
  var nsp = this.nsps[Namespace.slugify(name)];

  if(!nsp)
  {
    debug('initializing namespace %s', name);
    nsp = new Namespace(name, opts);
    this.nsps[nsp.name] = nsp;
  }

  return nsp;
};

/**
 * Mounts a namespace instance on the server.
 *
 * @alias {Server.mount}
 * @access public
 *
 * @param {String} [name]: if provided overrides the given nsp name.
 * @param {Namespace} nsp: the namespace instance to mount on the server.
 * @returns {Server} self
 */
Server.prototype.use =
Server.prototype.mount = function(name, nsp)
{
  if(!(nsp instanceof Namespace)
    && !(name instanceof Namespace))
  {
    debug('Server.mount: nsp must be instance of `Namespace` class!');
  }

  if(arguments.length == 1)
  {
    nsp = name;
  }
  else if(arguments.length == 2)
  {
    nsp.name = Namespace.slugify(name);
  }

  this.nsps[nsp.name] = nsp;
  return this;
};

/*!
 * Module exports.
 */
module.exports = Server;
