'use strict';

var debug   = require('debug')('kiss.io:namespace');
var util    = require('util');
var parser  = require('socket.io-parser');

var Emitter = require('events').EventEmitter;
var Socket  = require('./socket.class');
var Plugin  = require('./plugin.class');


/**
 * `EventEmitter#emit` reference.
 */

var emit    = Emitter.prototype.emit;

function Namespace(name, opts)
{
  if(!(this instanceof Namespace))
  {
    // TODO: replace somehow with .apply().
    // `...` operation isn't supported by older node.js versions
    return new Namespace(...arguments);
  }

  opts = opts || {};

  this.name = name;
  this.id = Namespace.genId(name);

  this.sockets = {};
  this.connected = {};

  this.fns = [];
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

Namespace.events = [
  'connect',    // for symmetry with client
  'connection',
  'newListener'
];

/**
 * Flags.
 */

Namespace.flags = [
  'json',
  'volatile'
];

Namespace.genId = function(name)
{
  if(String(name)[0] !== '/')
  {
    name = '/' + name;
  }

  return name;
};

/**
 * Apply flags from `Socket`.
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

Namespace.prototype.plug = function(plugin, opts)
{
  if(typeof plugin == 'function')
  {
    plugin = new plugin(this, opts);
  }

  if(plugin instanceof Plugin)
  {
    this.plugins.push(plugin);
  }

  let nspExports = plugin.nspExports;

  for (let fn of Object.keys(nspExports))
  {
    if(typeof fn !== 'function') continue;

    nspExports[fn] = nspExports[fn].bind(plugin, this);
  }

  Object.assign(this, nspExports);

  return this;
};

Namespace.prototype.configure = function(fn)
{
  if(typeof fn == 'function')
  {
    fn.apply(this);
  }
};

Namespace.prototype.set = function(key, value)
{
  if(typeof key == 'string')
  {
    this.locals[key] = value;
  }

  return this;
};

Namespace.prototype.get = function(key)
{
  if(typeof key == 'string')
  {
    return this.locals[key];
  }
  else
  {
    return undefined;
  }
};

/**
 * Sets up namespace middleware.
 *
 * @return {Namespace} self
 * @api public
 */

Namespace.prototype.use = function(fn)
{
  this.fns.push(fn);

  return this;
};

/**
 * Executes the middleware for an incoming client.
 *
 * @param {Socket} socket that will get added
 * @param {Function} fn last fn call in the middleware
 * @api private
 */

Namespace.prototype.run = function(socket, fn)
{
  var fns = this.fns.slice(0);

  if (!fns.length || !Object.keys(this.routes).length)
  {
    return fn(null);
  }

  function run(i)
  {
    fns[i](socket, function(err)
    {
      // upon error, short-circuit
      if (err) return fn(err);

      // if no middleware left, summon callback
      if (!fns[i + 1]) return fn(null);

      // go on to next
      run(i + 1);
    });
  }

  run(0);

  for(var route in this.routes)
  {
    if(this.routes.hasOwnProperty(route))
    {
      socket.on(route, this.routes[route].bind(socket));
    }
  }
};

/**
 * Adds a new client.
 *
 * @return {Socket}
 * @api private
 */

Namespace.prototype.add = function(client, query, fn)
{
  debug('adding socket to nsp %s', this.name);

  var socket = new Socket(this, client, query);
  var self = this;

  this.run(socket, function(err)
  {
    process.nextTick(function()
    {
      if ('open' == client.conn.readyState)
      {
        if (err) return socket.error(err.data || err.message);

        self.plugins.forEach(function(plugin)
        {
          let socketExports = {};

          Object.assign(socketExports, plugin.socketExports);

          for(let fn of Object.keys(socketExports))
          {
            if(typeof socketExports[fn] !== 'function') continue;

            socketExports[fn] = socketExports[fn].bind(plugin, socket);
          }

          Object.assign(socket, socketExports);
        });

        // track socket
        self.sockets[socket.id] = socket;

        // it's paramount that the internal `onconnect` logic
        // fires before user-set events to prevent state order
        // violations (such as a disconnection before the connection
        // logic is complete)
        socket.onconnect();
        if (fn) fn();

        // fire user-set events
        self.emit('connect', socket);
        self.emit('connection', socket);
      } else {
        debug('next called after client was closed - ignoring socket');
      }
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
  if (this.sockets.hasOwnProperty(socket.id))
  {
    delete this.sockets[socket.id];
  }
  else
  {
    debug('ignoring remove for %s', socket.id);
  }
};


//Namespace.prototype.on =
Namespace.prototype.registerEvent = function(route, fn)
{
  var routes = {};

  if(typeof route !== 'object')
    routes[route] = fn;
  else
    routes = route;

  for(var r in routes)
  {
    if(routes.hasOwnProperty(r))
    {
      if(typeof route != 'string') continue;
      else if(typeof fn != 'function') continue;

      this.routes[r] = routes[r];
    }
  }

  return this;
};

/**
 * Emits to all clients.
 *
 * @return {Namespace} self
 * @api public
 */

/*Namespace.prototype.emit = function(ev){
  if (~Namespace.events.indexOf(ev)) {
    emit.apply(this, arguments);
  } else {
    // set up packet object
    var args = Array.prototype.slice.call(arguments);
    var parserType = parser.EVENT; // default
    if (hasBin(args)) { parserType = parser.BINARY_EVENT; } // binary

    var packet = { type: parserType, data: args };

    if ('function' == typeof args[args.length - 1]) {
      throw new Error('Callbacks are not supported when broadcasting');
    }

    this.adapter.broadcast(packet, {
      rooms: this.rooms,
      flags: this.flags
    });

    delete this.rooms;
    delete this.flags;
  }
  return this;
};*/

/**
 * Sends a `message` event to all clients.
 *
 * @return {Namespace} self
 * @api public
 */

Namespace.prototype.send =
Namespace.prototype.write = function(){
  var args = Array.prototype.slice.call(arguments);
  args.unshift('message');
  this.emit.apply(this, args);
  return this;
};

Namespace.prototype.getSocketById = function(id)
{
  return this.sockets[id] || null;
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
