'use strict';

var debug   = require('debug')('kiss.io:socket');
var parser  = require('socket.io-parser');
var url     = require('url');
var hasBin  = require('has-binary');

var Emitter = require('events').EventEmitter;


/**
 * `EventEmitter#emit` reference.
 */
var emit   = Emitter.prototype.emit;

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
 * @returns {Socket}
 */
function Socket(nsp, client, query)
{
  this.nsp = nsp;
  this.id = nsp.name !== '/' ? nsp.name + '#' + client.id : client.id;
  this.clientId = client.id;
  this.client = client;
  this.conn = client.conn;
  this.acks = {};
  this.connected = true;
  this.handshake = this.buildHandshake(query);
}

/**
 * Inherits from `EventEmitter`.
 */
Socket.prototype.__proto__ = Emitter.prototype;

/**
 * Reserved events.
 */
Socket.events =
[
  'error',
  'connect',
  'disconnect',
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
 * `request` engine.io shortcut.
 * Reset temporary flags
 *
 * @access public
 *
 * @returns {Socket} self
 */
Socket.prototype.__defineGetter__('request', function()
Socket.prototype.reset = function()
{
  return this.conn.request;
});
  delete this._flags;
  return this;
};

/**
 * Builds the `handshake` BC object
 *
 * @access private
 */
Socket.prototype.buildHandshake = function(query)
{
  var self = this;

  /**
   * @returns {Object} query
   */
  function buildQuery()
  {
    var requestQuery = url.parse(self.request.url, true).query;

    //if socket-specific query exist, replace query strings in requestQuery
    if(query)
    {
      query.t = requestQuery.t;
      query.EIO = requestQuery.EIO;
      query.transport = requestQuery.transport;
      return query;
    }

    return requestQuery || {};
  }

  return {
    headers: this.request.headers,
    time: (new Date) + '',
    address: this.conn.remoteAddress,
    xdomain: !!this.request.headers.origin,
    secure: !!this.request.connection.encrypted,
    issued: +(new Date),
    url: this.request.url,
    query: buildQuery()
  };
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
    emit.apply(this, arguments);
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
    delete this.reset();
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
 * @returns {Socket} self
 */
Socket.prototype.broadcast = function(ev)
{
  var bc; // broadcast reference

  bc = this.nsp
        .except(this.id)
        .broadcast;

  bc.apply(this.nsp, arguments);

  return this;
};

/**
 * Sends a `message` event to the socket.
 * (fits the engine.io api).
 *
 * @access public
 *
 * @params {*} params to emit with the message event.
 * @return {Socket} self
 */
Socket.prototype.send =
Socket.prototype.write = function()
{
  var args = Array.prototype.slice.call(arguments);
  args.unshift('message');

  this.emit.apply(this, args);

  return this;
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
      this.emit('error', packet.data);
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

  emit.apply(this, args);
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

  this.onClose('client namespace disconnect');
};

/**
 * Handles a client error.
 *
 * @access private
 */
Socket.prototype.onError = function(err)
{
  if (this.listeners('error').length)
  {
    this.emit('error', err);
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
  if (!this.connected) return this;

  debug('closing socket - reason %s', reason);

  this.nsp.remove(this);
  this.client.remove(this);
  this.connected = false;

  this.emit('disconnect', reason);
};

/**
 * Produces and sends an `error` packet to the socket.
 *
 * @access private
 *
 * @param {Object} err: error object
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
 * @param {Boolean} close: if `true`, closes the underlying connection.
 * @return {Socket} self
 */
Socket.prototype.disconnect = function(close)
{
  if (!this.connected) return this;

  if (close)
  {
    this.client.disconnect();
  }
  else
  {
    this.packet({ type: parser.DISCONNECT });
    this.onClose('server namespace disconnect');
  }

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
