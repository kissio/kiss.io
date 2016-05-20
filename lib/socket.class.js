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
 * Interface to a `Client` for a given `Namespace`.
 *
 * @param {Namespace} nsp
 * @param {Client} client
 * @api public
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
 * Blacklisted events.
 *
 * @api public
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
 * Flags.
 *
 * @api private
 */

Socket.flags = [];

/**
 * Apply flags from `Socket`.
 */

Socket.flags.forEach(function(flag)
{
  Socket.prototype.__defineGetter__(flag, function()
  {
    this.flags = this.flags || {};
    this.flags[flag] = true;

    return this;
  });
});

/**
 * `request` engine.io shortcut.
 *
 * @api public
 */

Socket.prototype.__defineGetter__('request', function()
{
  return this.conn.request;
});

/**
 * Builds the `handshake` BC object
 *
 * @api private
 */

Socket.prototype.buildHandshake = function(query)
{
  var self = this;
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
 * Emits to this client.
 *
 * @return {Socket} self
 * @api public
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
    var flags = this.flags || {};
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
      volatile: flags.volatile,
      compress: flags.compress
    });

    // reset flags
    delete this.flags;
  }

  return this;
};

Socket.prototype.broadcast = function(ev)
{
  for(var sid of Object.keys(this.nsp.sockets))
  {
    if(sid == this.id) continue;

    let socket = this.nsp.sockets[sid];

    socket.emit.apply(socket, arguments);
  }

  return this;
};

/**
 * Sends a `message` event.
 *
 * @return {Socket} self
 * @api public
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
 * Writes a packet.
 *
 * @param {Object} packet object
 * @param {Object} opts options
 * @api private
 */

Socket.prototype.packet = function(packet, opts)
{
  packet.nsp = this.nsp.name;

  opts = opts || {};
  opts.compress = false !== opts.compress;

  this.client.packet(packet, opts);
};

/**
 * Called by `Namespace` upon success.
 * middleware execution (ie: authorization).
 *
 * @api private
 */

Socket.prototype.onConnect = function()
{
  debug('socket connected - writing packet');

  this.packet({ type: parser.CONNECT });
};

/**
 * Called with each packet. Called by `Client`.
 *
 * @param {Object} packet
 * @api private
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
 * Called upon event packet.
 *
 * @param {Object} packet object
 * @api private
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
 * @param {Number} id packet id
 * @api private
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
 * @api private
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
 * Called upon client disconnect packet.
 *
 * @api private
 */

Socket.prototype.onDisconnect = function()
{
  debug('got disconnect packet');

  this.onClose('client namespace disconnect');
};

/**
 * Handles a client error.
 *
 * @api private
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
 * @param {String} reason
 * @throw {Error} optional error object
 * @api private
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
 * Produces an `error` packet.
 *
 * @param {Object} err error object
 * @api private
 */

Socket.prototype.error = function(err)
{
  this.packet({ type: parser.ERROR, data: err });
};

/**
 * Disconnects this client.
 *
 * @param {Boolean} close if `true`, closes the underlying connection
 * @return {Socket} self
 * @api public
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
 * @param {Boolean} compress if `true`, compresses the sending data
 * @return {Socket} self
 * @api public
 */

Socket.prototype.compress = function(compress)
{
  this.flags = this.flags || {};
  this.flags.compress = compress;

  return this;
};


/**
 * Module exports.
 */

module.exports = exports = Socket;
