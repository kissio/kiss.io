'use strict';

var debug   = require('debug')('kiss.io:client');
var parser  = require('socket.io-parser');
var url     = require('url');

var Socket  = require('./socket');


/**
 * A client is a class that contain multiple sockets,
 * ..all related to one user/device.
 *
 * @constructs Client
 * @access public
 *
 * @param {Server} server
 * @param {Object} conn: connection query provided by engine.io
 * @returns {Client} self
 */
function Client(server, conn)
{
  if(!(this instanceof Client))
  {
    return new Client(server, conn);
  }

  this.server = server;
  this.conn = conn;
  this.encoder = new parser.Encoder();
  this.decoder = new parser.Decoder();
  this.id = conn.id;
  this.request = conn.request;
  this.sockets = {};
  this.nsps = {};

  this.decoder.on('decoded', this.onDecoded.bind(this));
  this.conn.on('data', this.onData.bind(this));
  this.conn.on('error', this.onError.bind(this));
  this.conn.on('close', this.onClose.bind(this));
}

/**
 * Connects a client to a namespace.
 *
 * @access public
 *
 * @param {String} name: name of the namespace
 * @param {Object} [query]: query to pass to the socket constructor.
 */
Client.prototype.connect = function(name, query)
{
  var nsp = this.server.nsps[name];

  debug('connecting to namespace %s', name);

  if (!nsp)
  {
    this.packet({ type: parser.ERROR, nsp: name, data: 'Invalid namespace' });
    return;
  }

  var socket = new Socket(nsp, this, query);
  var self = this;

  process.nextTick(function()
  {
    nsp.add(socket, function(err)
    {
      if(err)
      {
        socket.error(err.message || err.data || err);
        self.remove(socket);
      }
      else
      {
        self.sockets[socket.id] = socket;
        self.nsps[nsp.name] = socket;
      }
    });
  })
};

/**
 * Disconnects from all namespaces and closes transport.
 *
 * @access private
 */
Client.prototype.disconnect = function()
{
  Object.keys(this.sockets).forEach(function(sid)
  {
    this.sockets[sid].disconnect();
    delete this.sockets[sid];
  }, this);

  this.sockets = {};
  this.close();
};

/**
 * Removes a socket. Called by each `Socket`.
 *
 * @access private
 *
 * @param {Socket} socket
 */
Client.prototype.remove = function(socket)
{
  var sid = socket.id || socket;

  if (!this.sockets.hasOwnProperty(sid))
  {
    debug('ignoring remove for %s', sid);
    return;
  }

  var nsp = this.sockets[sid].nsp;

  delete this.sockets[sid];
  delete this.nsps[nsp.name];
};

/**
 * Closes the underlying connection.
 *
 * @access private
 */
Client.prototype.close = function()
{
  if ('open' == this.conn.readyState)
  {
    debug('forcing transport close');

    this.conn.close();
    this.onClose('forced server close');
  }
};

/**
 * Writes a packet to the transport.
 *
 * @access private
 *
 * @param {Object} packet object
 * @param {Object} [opts]: special packet options
 */
Client.prototype.packet = function(packet, opts)
{
  opts = opts || {};
  var self = this;

  // this writes to the actual connection
  function writeToEngine(encodedPackets)
  {
    if (opts.volatile && !self.conn.transport.writable) return;

    for (var i = 0; i < encodedPackets.length; i++)
    {
      self.conn.write(encodedPackets[i], { compress: opts.compress });
    }
  }

  if ('open' == this.conn.readyState)
  {
    debug('writing packet %j', packet);

    if (!opts.preEncoded) // not broadcasting, need to encode
    {
      // encode, then write results to engine
      this.encoder.encode(packet, function(encodedPackets)
      {
        writeToEngine(encodedPackets);
      });
    }
    else // a broadcast pre-encodes a packet
    {
      writeToEngine(packet);
    }
  }
  else
  {
    debug('ignoring packet write %j', packet);
  }
};

/**
 * Called with incoming transport data.
 *
 * @access private
 *
 * @param {Object} data
 */
Client.prototype.onData = function(data)
{
  try
  {
    this.decoder.add(data);
  }
  catch(e)
  {
    this.onError(e);
  }
};

/**
 * Called when parser fully decodes a packet.
 *
 * @access private
 *
 * @param {Object} packet
 */
Client.prototype.onDecoded = function(packet)
{
  if (parser.CONNECT == packet.type)
  {
    // connect to namespace
    this.connect(url.parse(packet.nsp).pathname, url.parse(packet.nsp, true).query);
  }
  else
  {
    var socket = this.nsps[packet.nsp];

    if (socket)
    {
      socket.onPacket(packet);
    }
    else
    {
      debug('no socket for namespace %s', packet.nsp);
    }
  }
};

/**
 * Signals an error and closes transport.
 *
 * @access private
 *
 * @param {Error|String} err
 */
Client.prototype.onError = function(err)
{
  Object.keys(this.sockets).forEach(function(sid)
  {
    this.sockets[sid].onError(err);
  }, this);

  this.onClose('client error');
};

/**
 * Called upon transport close.
 *
 * @access private
 *
 * @param {String} reason
 */
Client.prototype.onClose = function(reason)
{
  debug('client close with reason %s', reason);

  // ignore a potential subsequent `close` event
  this.destroy();

  // `nsps` and `sockets` are cleaned up seamlessly
  Object.keys(this.sockets).forEach(function(sid)
  {
    this.sockets[sid].onClose(reason);
    delete this.sockets[sid];
  }, this);

  this.sockets = {};
  this.decoder.destroy(); // clean up decoder
};

/**
 * Cleans up event listeners.
 *
 * @access private
 */
Client.prototype.destroy = function()
{
  this.decoder.removeAllListeners('decoded');
  this.conn.removeAllListeners('data');
  this.conn.removeAllListeners('error');
  this.conn.removeAllListeners('close');
};

/*!
 * Module exports.
 */
module.exports = Client;
