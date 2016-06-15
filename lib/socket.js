'use strict';

var debug   = require('debug')('kiss.io:socket');
var parser  = require('socket.io-parser');
var url     = require('url');
var hasBin  = require('has-binary');

var Router  = require('./router');
var Plugin  = require('./plugin');


/**
 * A socket is a representation of a singular socket connection that
 * ..might be part of a larger connection pool, represented by `Client`.
 * Socket is specific to one namespace of one server.
 *
 * @constructs Socket
 * @access public
 *
 * @param {Namespace} nsp: the namespace that the socket is connected to.
 * @param {Client} client: the client instance that owns the socket.
 * @param {Object} query: the query params of the request.
 * @returns {Socket}
 */
function Socket(nsp, client, query)
{
  if(!(this instanceof Socket))
  {
    return new Socket(nsp, client, query);
  }

  this.nsp = nsp;
  this.id = nsp.name !== '/' ? nsp.name + '#' + client.id : client.id;
  this.opts = this.nsp.opts || {};
  this.client = client;
  this.conn = client.conn;
  this.request = this.conn.request;
  this.acks = {};
  this.connected = true;
  this.handshake = this.buildHandshake(query);
  this.router = new Router(this.nsp.opts);
}

/**
 * Built-in, emitted by default events.
 */
Socket.events =
[
  'error',
  'pre-setup',
  'connect',
  'connection',
  'pre-disconnect',
  'pre-disconnection',
  'disconnect',
  'disconnection',
  'newListener',
  'removeListener'
];

/**
 * Set/get a temporary flag.
 *
 * @access public
 *
 * @param {String} key: the name of the flag.
 * @param {*} [value]
 * @returns {*|undefined} value
 */
Socket.prototype.flag = function(key, value)
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
 */
Socket.prototype.reset = function()
{
  delete this._flags;
};

/**
 * Builds the `handshake` BC object
 *
 * @access private
 *
 * @param {Object} [query]: if not provided, uses Socket.request query.
 * @returns {Object} handshake
 */
Socket.prototype.buildHandshake = function(query)
{
  var requestQuery = url.parse(this.request.url, true).query || {};

  query = query || requestQuery;
  query.t = requestQuery.t;
  query.EIO = requestQuery.EIO;
  query.transport = requestQuery.transport;

  return {
    headers: this.request.headers,
    time: (new Date) + '',
    address: this.conn.remoteAddress,
    xdomain: !!this.request.headers.origin,
    secure: !!this.request.connection.encrypted,
    issued: +(new Date),
    url: this.request.url,
    query: query
  };
};

/**
 * Bind a router to this socket and merege it into the main
 * ..socket router.
 *
 * @access public
 *
 * @param {Router} router
 * @returns {Socket} self
 */
Socket.prototype.merge = function(router)
{
  var context =
  {
    nsp: this.nsp,
    socket: this
  };

  router.forRoute(function bind(route)
  {
    route.bindContext(context);
  });

  this.router.merge(router);
  return this;
};

Socket.prototype.plug =
Socket.prototype.plugin = function(plugin)
{
  var exports = plugin.exports.socket || {};

  for(let key of Object.keys(exports))
  {
    let value = exports[key];

    if(typeof value == 'function')
    {
      value = value.bind(plugin, this);
    }
    else if(typeof value == 'object')
    {
      value = Object.create(value);
    }

    this[key] = value;
  }

  this.merge(plugin.exports.router);
  return this;
};

/**
 * Shortcut for `Socket.router.on`.
 * @see Router.on
 *
 * @access public
 *
 * @param {String} event
 * @param {Array<Function>} [handlers]
 * @returns {Route}
 */
Socket.prototype.on =
Socket.prototype.event = function(event, handler)
{
  return this.router.on.apply(this.router, arguments);
};

Socket.prototype.once =
Socket.prototype.eventOnce = function(event, handler)
{
  return this.router.once.apply(this.router, arguments);
};

/**
 * Trigger an inside event for Socket.
 *
 * @access private
 *
 * @param {String} ev
 */
Socket.prototype.trigger = function(ev)
{
  this.router.trigger.apply(this.router, arguments);
};

/**
 * Emits an event to the owning `Client`.
 * If event not in the reserved event list (Socket.events),
 * ..then send a packet to the socket with the given arguments.
 *
 * @access public
 *
 * @param {String} ev: event
 * @return {Socket} self
 */
Socket.prototype.emit = function(ev)
{
  if (Socket.events.indexOf(ev) !== -1)
  {
    this.trigger.apply(this, arguments);
  }
  else
  {
    var args = Array.prototype.slice.call(arguments);
    var packet = {};

    packet.type = hasBin(args) ? parser.BINARY_EVENT : parser.EVENT;
    packet.data = args;

    // access last argument to see if it's an ACK callback
    if ('function' == typeof args[args.length - 1])
    {
      debug('emitting packet with ack id %d', this.nsp.ids);

      this.acks[this.nsp.ids] = args.pop();
      packet.id = this.nsp.ids++;
    }

    // dispatch packet
    this.packet(packet, {
      volatile: this.flag('volatile'),
      compress: this.flag('compress')
    });

    // reset flags
    this.reset();
  }

  return this;
};

/**
 * Broadcasts a packet to every socket on the same namespace of this socket,
 * ..except this socket.
 *
 * @access public
 *
 * @param {String} ev: event
 */
Socket.prototype.broadcast = function(ev)
{
  this.nsp.broadcast.apply(this.nsp.except(this.id), arguments);
};

/**
 * Sends a `message` event to the socket.
 * (fits the engine.io api).
 *
 * @alias {Socket.write}
 * @access public
 *
 * @params {*} params to emit with the message event.
 */
Socket.prototype.send =
Socket.prototype.write = function()
{
  var args = Array.prototype.slice.call(arguments);
  args.unshift('message');
  this.emit.apply(this, args);
};

/**
 * Writes a packet to the socket.
 *
 * @see Client.packet
 *
 * @access private
 *
 * @param {Object} packet
 * @param {Object} [opts]
 */
Socket.prototype.packet = function(packet, opts)
{
  packet.nsp = this.nsp.name;

  opts = opts || {};
  opts.compress = false !== opts.compress;

  this.client.packet(packet, opts);
};

/**
 * Send a CONNECT packet to the socket. Called by `Namespace` upon success.
 *
 * @access private (used publicly only by `Namespace`)
 */
Socket.prototype.onConnect = function()
{
  debug('socket connected - writing packet');

  this.packet({ type: parser.CONNECT });
};

/**
 * Called with each packet. Called by `Client`.
 *
 * @access private (used publicly only by `Client`)
 *
 * @param {Object} packet
 */
Socket.prototype.onPacket = function(packet)
{
  debug('got packet %j', packet);

  switch (packet.type)
  {
    case parser.EVENT:
      this.onEvent(packet);
      break;

    case parser.BINARY_EVENT:
      this.onEvent(packet);
      break;

    case parser.ACK:
      this.onAck(packet);
      break;

    case parser.BINARY_ACK:
      this.onAck(packet);
      break;

    case parser.DISCONNECT:
      this.onDisconnect();
      break;

    case parser.ERROR:
      this.onError(packet.data);
      break;
  }
};

/**
 * Parses packet and emits to this socket. Called upon event packet.
 *
 * @access private
 *
 * @param {Object} packet
 */
Socket.prototype.onEvent = function(packet)
{
  var args = packet.data || [];

  debug('emitting event %j', args);

  if (null != packet.id)
  {
    debug('attaching ack callback to event');
    args.push(this.ack(packet.id));
  }

  this.trigger.apply(this, args);
};

/**
 * Produces an ack callback to emit with an event.
 *
 * @access private
 *
 * @param {Number} id: packet id
 */
Socket.prototype.ack = function(id)
{
  var self = this;
  var sent = false;

  return function()
  {
    // prevent double callbacks
    if (sent) return;

    var args = Array.prototype.slice.call(arguments);
    var type = hasBin(args) ? parser.BINARY_ACK : parser.ACK;

    debug('sending ack %j', args);

    self.packet({
      id: id,
      type: type,
      data: args
    });

    sent = true;
  };
};

/**
 * Called upon ack packet.
 *
 * @access private
 */
Socket.prototype.onAck = function(packet)
{
  var ack = this.acks[packet.id];

  if ('function' == typeof ack)
  {
    debug('calling ack %s with %j', packet.id, packet.data);

    ack.apply(this, packet.data);
    delete this.acks[packet.id];
  }
  else
  {
    debug('bad ack %s', packet.id);
  }
};

/**
 * Closes connection. Called upon client disconnect packet.
 *
 * @access private
 */
Socket.prototype.onDisconnect = function()
{
  debug('got disconnect packet');
  this.disconnect('client namespace disconnect');
};

/**
 * Handles a client error.
 *
 * @access private
 */
Socket.prototype.onError = function(err)
{
  if (this.router.listensOn('error'))
  {
    this.trigger('error', err);
  }
  else
  {
    console.error('Missing error handler on `socket`.');
    console.error(err.stack);
  }
};

/**
 * Called upon closing. Called by `Client`.
 *
 * @access private (used publicly only by `Client`)
 *
 * @param {String} [reason]
 */
Socket.prototype.onClose = function(reason)
{
  debug('closing socket - reason %s', reason);
  this.disconnect(reason);
};

/**
 * Produces and sends an `error` packet to the socket.
 *
 * @access public
 *
 * @param {Error} err: error object
 */
Socket.prototype.error = function(err)
{
  this.packet({ type: parser.ERROR, data: err });
};

/**
 * Disconnects this client.
 *
 * @access public
 *
 * @param {String} [reason]
 * @return {Socket} self
 */
Socket.prototype.disconnect = function(reason)
{
  if (!this.connected) return this;

  debug('closing socket - reason %s', reason);

  this.trigger('pre-disconnect', this, reason);
  this.trigger('pre-disconnection', this, reason);

  this.packet({ type: parser.DISCONNECT });

  this.nsp.remove(this);
  this.client.remove(this);
  this.connected = false;

  setImmediate(function()
  {
    this.trigger('disconnect', this, reason);
    this.trigger('disconnection', this, reason);
  }.bind(this));

  return this;
};

/**
 * Sets the compress flag.
 *
 * @access public
 *
 * @param {Boolean} [compress=true]: If `true`, compresses the sending data.
 * @return {Socket} self
 */
Socket.prototype.compress = function(compress)
{
  this.flag('compress', compress);
  return this;
};

/*!
 * Module exports.
 */
module.exports = Socket;
