'use strict';

var debug   = require('debug')('kiss.io:namespace');
var util    = require('util');
var parser  = require('socket.io-parser');

var Emitter = require('events').EventEmitter;
var Socket  = require('./socket.class');
var Plugin  = require('./plugin.class');
var Router  = require('./router.class');


/**
 * `EventEmitter#emit` reference.
 */

var emit    = Emitter.prototype.emit;

function Namespace(name, opts)
{
  if(!(this instanceof Namespace))
  {
    return new Namespace(name, opts);
  }

  this.name = name;
  this.id = Namespace.genId(name);

  this.opts = opts || {};

  this.sockets = {};

  this.middlewares = [];
  this.plugins = [];
  this.routes = {};

  this.locals = {};
}

/**
 * Inherits from `EventEmitter`.
 */

Namespace.prototype.__proto__ = Emitter.prototype;

/**
 * Blacklisted events.
 */

Namespace.events =
[
  'connect',    // for symmetry with client
  'connection',
  'newListener'
];

/**
 * Flags.
 */

Namespace.flags = [];

/**
 * Apply flags from `Namespace`.
 */

Namespace.flags.forEach(function(flag)
{
  Namespace.prototype.__defineGetter__(flag, function()
  {
    this.flags = this.flags || {};
    this.flags[flag] = true;

    return this;
  });
});

Namespace.genId = function(name)
{
  if(String(name)[0] !== '/')
  {
    name = '/' + name;
  }

  return name;
};

Namespace.prototype.plug = function(plugin, opts)
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

Namespace.prototype.configure = function(fn)
{
  if(typeof fn == 'function')
  {
    fn.apply(this);
  }

  return this;
};

Namespace.prototype.set = function(key, value)
{
  this.locals[key] = value;

  return value;
};

Namespace.prototype.get = function(key)
{
  return this.locals[key];
};

/**
 * Sets up namespace middleware.
 *
 * @return {Namespace} self
 * @api public
 */

Namespace.prototype.use = function(item)
{
  if(typeof item == 'function')
  {
    this.middlewares.push(item);
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

Namespace.prototype.reg =
Namespace.prototype.registerEvent = function(event, handler)
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
 * @param {Socket} socket that will get added
 * @param {Function} fn last fn call in the middleware
 * @api private
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
 * Adds a new client.
 *
 * @return {Socket}
 * @api private
 */

Namespace.prototype.add = function(client, query, fn)
{
  var socket = new Socket(this, client, query);
  var self = this;

  this.execMiddleware(socket, function(err)
  {
    process.nextTick(function()
    {
      if ('open' !== client.conn.readyState)
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

      /*
       * attach routers to socket
       */
      Object.keys(self.routes).forEach(function(event)
      {
        let route = self.routes[event];
        let handler = route.handler;

        handler = handler.bind({
          nsp: self,
          socket: socket
        });

        socket.on(event, handler);
      });

      self.sockets[socket.id] = socket;

      // it's paramount that the internal `onconnect` logic
      // fires before user-set events to prevent state order
      // violations (such as a disconnection before the connection
      // logic is complete)
      socket.onConnect();

      if (fn)
      {
        fn(socket);
      }

      // fire user-set events
      self.emit('connect', socket);
      self.emit('connection', socket);
    });
  });

  return socket;
};

/**
 * Removes a client. Called by each `Socket`.
 *
 * @api private
 */

Namespace.prototype.remove = function(socket)
{
  delete this.sockets[socket.id];
};

/**
 * Sends a `message` event to all clients.
 *
 * @return {Namespace} self
 * @api public
 */

Namespace.prototype.send =
Namespace.prototype.write = function()
{
  var args = Array.prototype.slice.call(arguments);

  args.unshift('message');
  this.emit.apply(this, args);

  return this;
};

Namespace.prototype.getSocketById = function(id)
{
  return this.sockets[id];
};

/**
 * Sets the compress flag.
 *
 * @param {Boolean} compress if `true`, compresses the sending data
 * @return {Namespace} self
 * @api public
 */
Namespace.prototype.compress = function(compress)
{
  this.flags = this.flags || {};
  this.flags.compress = compress;

  return this;
};


/**
 * Module exports.
 */

module.exports = exports = Namespace;
