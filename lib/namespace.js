'use strict';

var debug   = require('debug')('kiss.io:namespace');
var util    = require('util');
var parser  = require('socket.io-parser');

var Socket  = require('./socket');
var Plugin  = require('./plugin');
var Router  = require('./router');


/**
 * A namespace is an individual, independent, autonomous arena
 * ..for real-time data transfer.
 *
 * It can be initialized in its own self-contained module,
 * ..and later be mounted into a kiss.io server, OR be initialized
 * ..within the server itself.
 *
 * @constructs Namespace
 * @access public
 *
 * @param {String} name (must start with '/')
 * @param {Object} [opts]
 * @returns {Namespace} self
 */
function Namespace(name, opts)
{
  if(!(this instanceof Namespace))
  {
    return new Namespace(name, opts);
  }

  this.name = Namespace.slugify(name);
  this.opts = opts || {};
  this.sockets = {};
  this.middlewares = [];
  this.plugins = [];
  this.routes = {};
  this.locals = {};
}

/**
 * Static function that used as helper to generate a slug for the nsp.
 * Currently just appends '/' to the beginning of the name.
 *
 * @access public
 *
 * @param name
 * @returns {String} id
 */
Namespace.slugify = function(name)
{
  if(String(name)[0] !== '/')
  {
    name = '/' + name;
  }

  return name;
};

/***
 * Plugs a plug-in to the namespace.
 *
 * @alias {Namespace.plugin}
 * @access public
 *
 * @param {Function|Plugin} plugin
 * @param {Object} [opts]: special options for the plugin
 * @returns {Namespace} self
 */
Namespace.prototype.plug =
Namespace.prototype.plugin = function(plugin, opts)
{
  if(typeof plugin == 'function')
  {
    plugin = new plugin(this, opts);
  }

  if(plugin instanceof Plugin)
  {
    this.plugins.push(plugin);

    plugin.attachTo(this);
  }

  return this;
};

/**
 * A helper method used to configure the namespace before
 * ..mounting it on the server.
 *
 * Works synchronously, and bind the namespace to the function.
 *
 * @access public
 *
 * @param {Function} fn
 * @returns {Namespace} self
 */
Namespace.prototype.configure = function(fn)
{
  if(typeof fn == 'function')
  {
    fn.apply(this);
  }

  return this;
};

/**
 * Set/get a temporary flag.
 *
 * @access public
 *
 * @param {String} key: the name of the flag.
 * @param {*} [value]
 * @returns {*|undefined} value
 */
Namespace.prototype.flag = function(key, value)
{
  this._flags = this._flags || {};

  if(arguments.length == 2)
  {
    this._flags[key] = value;
  }

  return this._flags;
};

/**
 * Reset temporary flags
 *
 * @access public
 *
 * @returns {Namespace} self
 */
Namespace.prototype.reset = function()
{
  delete this._flags;
  return this;
};

/**
 * Set/get a local parameter for the namespace.
 *
 * @access public
 *
 * @param {String} key
 * @param {*} value
 * @returns {*} value
 */
Namespace.prototype.local = function(key, value)
{
  if(arguments.length == 2)
  {
    this.locals[key] = value;
  }

  return this.locals[key];
};

/**
 * Mounts a middleware/plugin/route/router on the namespace.
 *
 * @access public
 *
 * @param {Function|String|Router|Route} item
 * @return {Namespace} self
 */
Namespace.prototype.use = function(item)
{
  if(typeof item == 'function')
  {
    this.middlewares.push(item);
  }
  else if(item instanceof Plugin)
  {
    this.plug(item);
  }
  else if(typeof item == 'string')
  {
    this.reg.apply(this, arguments);
  }
  else if(item instanceof Router)
  {
    this.reg(item);
  }
  else if(item instanceof Router.Route)
  {
    this.reg(item);
  }

  return this;
};

/**
 * Registers a route for the the namespace.
 * OR
 * Mounts a Router/Route instance onto the namespace.
 *
 * @alias {Namespace.register|Namespace.event}
 * @access public
 *
 * @param {String|Router|Route} event: the name of the event to register
 * @param {Function} [handler]: (if string event provided) the handler for the event
 * @returns {Namespace} self
 */
Namespace.prototype.reg =
Namespace.prototype.register =
Namespace.prototype.event = function(event, handler)
{
  if(typeof event == 'string')
  {
    let route = new Router.Route(event, handler);
    this.routes[route.event] = route;
  }
  else if(event instanceof Router)
  {
    let router = event;
    Object.assign(this.routes, router.routes);
  }
  else if(event instanceof Router.Route)
  {
    let route = event;
    this.routes[route.event] = route;
  }

  return this;
};

/**
 * Executes the middleware for an incoming client.
 *
 * @access private
 *
 * @param {Socket} socket to execute the middleware on
 * @param {Function} fn: last fn call in the middleware
 */
Namespace.prototype.execMiddleware = function(socket, fn)
{
  var fns = this.middlewares.slice(0);

  if (!fns.length)
  {
    return fn(null);
  }

  function exec(i)
  {
    fns[i](socket, function(err)
    {
      // upon error, short-circuit
      if (err) return fn(err);

      // if no middleware left, summon callback
      if (!fns[i + 1]) return fn(null);

      // go on to next
      exec(i + 1);
    });
  }

  exec(0);
};

/**
 * Adds a new client to the namespace.
 *
 * @access public
 *
 * @param {Socket} socket
 * @param {Function} [fn]: an optional fn to execute before
 * ..connecting the socket to the namespace.
 * @return {Socket} the socket that was added to the namespace.
 */
Namespace.prototype.add = function(socket, fn)
{
  var self = this;

  socket.use(this.router);

  this.plugins.forEach(function(plugin)
  {
    plugin.attachTo(socket);
  });

  this.execMiddleware(socket, function(err)
  {
    process.nextTick(function()
    {
      if ('open' !== socket.conn.readyState)
      {
        debug('next called after client was closed - ignoring socket');
        return;
      }
      else if (err)
      {
        return socket.error(err.data || err.message);
      }

      /*
       * attach plugins to socket
       */
      self.plugins.forEach(function(plugin)
      {
        plugin.attachTo(socket);
      });

      self.sockets[socket.id] = socket;

      if(typeof fn == 'function')
      {
        fn(err);
      }

      // fire user-set events
      socket.trigger('connect', socket);
      socket.trigger('connection', socket);
    });
  });

  return socket;
};

/**
 * Removes a socket from the namespace.
 * Called by each `Socket`.
 *
 * @access private
 */
Namespace.prototype.remove = function(socket)
{
  delete this.sockets[socket.id];
};

/**
 * Sets the `except` flag to ignore sockets when broadcasting.
 *
 * @access public
 *
 * @param {Array<String>} sids: the ids of the of sockets to ignore.
 * @returns {Namespace} self
 */
Namespace.prototype.except = function(sids)
{
  this.flag('except', sids);
  return this;
};

/**
 * Broadcasts an event to every socket connected to the namespace,
 * ..and ignores those who are specified in the `except` flag.
 *
 * @access public
 *
 * @param {String} ev: the event to broadcast.
 * @params {...} the params to emit together with the event.
 * @returns {Namespace} self
 */
Namespace.prototype.broadcast = function(ev)
{
  var except = this.flag('except');

  if(!Array.isArray(except))
  {
    except = [except];
  }

  for(var sid of Object.keys(this.sockets))
  {
    var s = this.sockets[sid];

    if(except.indexOf(sid) !== -1)
    {
      continue;
    }

    if(s instanceof Socket)
    {
      s.emit.apply(s, arguments);
    }
  }

  this.reset();
  return this;
};

/**
 * Sends a `message` event to all clients.
 *
 * @access private
 *
 * @return {Namespace} self
 */
Namespace.prototype.send =
Namespace.prototype.write = function()
{
  this.broadcast('message', ...args);
  return this;
};

/**
 * Returns a socket that's connected to the namespace,
 * ..correspondent a given id.
 *
 * @access public
 *
 * @param {String} id
 * @returns {Socket}
 */
Namespace.prototype.getSocketById = function(id)
{
  return this.sockets[id];
};

/**
 * Sets the compress flag.
 *
 * @access public
 *
 * @param {Boolean} compress: if `true`, compresses the sending data
 * @return {Namespace} self
 */
Namespace.prototype.compress = function(compress)
{
  this.flag('compress', compress);
  return this;
};

/*!
 * Module exports.
 */
module.exports = Namespace;
