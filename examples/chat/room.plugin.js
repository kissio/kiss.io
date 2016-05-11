'use strict';

var debug   = require('debug')('kiss.io:room');
var util    = require('util');
var io      = require('../../');

var Plugin  = io.Plugin;
var Socket  = io.Socket;

function RoomsPlugin(nsp, opts)
{
  if(typeof opts == 'object')
  {
    this.opts = opts;
  }

  this.nsp = nsp;

  this.rooms = {};

  /**
   * Plugin Exports
   */
  this.nspExports =
  {
  };

  this.socketExports =
  {
    join: this.join,
    to: this.to,
    rooms: {}
  };
}

util.inherits(RoomsPlugin, Plugin);

RoomsPlugin.prototype.createRoom = function(roomId)
{
  var room = this.rooms[roomId];

  if(!room)
  {
    room = new Room(this.nsp, roomId);
    this.rooms[roomId] = room;
  }

  return room;
};

RoomsPlugin.prototype.join = function(socket, roomId)
{
  var room = this.createRoom(roomId);

  room.add(socket.id);
  socket.rooms[roomId] = room;

  return room;
};

/**
 * Broadcasts a packet.
 *
 * Options:
 *  - `flags` {Object} flags for this packet
 *  - `except` {Array} sids that should be excluded
 *  - `rooms` {Array} list of rooms to broadcast to
 *
 * @param {Object} packet object
 * @api public
 */

RoomsPlugin.prototype.broadcast = function(s, packet, opts)
{
  var rooms = opts.rooms || [];
  var except = opts.except || [];
  var flags = opts.flags || {};
  var ids = {};
  var self = this;
  var socket;

  var packetOpts = {
    preEncoded: true,
    volatile: flags.volatile,
    compress: flags.compress
  };

  packet.nsp = s.nsp.name;

  this.encoder.encode(packet, function(encodedPackets)
  {
    if (rooms.length)
    {
      for (var i = 0; i < rooms.length; i++)
      {
        var room = self.rooms[rooms[i]];

        if (!room) continue;

        for (let id in Object.keys(room.sockets))
        {
          if (ids[id] || ~except.indexOf(id)) continue;

          if (socket)
          {
            socket.packet(encodedPackets, packetOpts);
            ids[id] = true;
          }
        }
      }
    }
    else
    {
      for (let id in Object.keys(socket.nsp.connected))
      {
        if (~except.indexOf(id)) continue;

        let s = socket.nsp.connected[id];

        if (s)
        {
          s.packet(encodedPackets, packetOpts);
        }
      }
    }
  });
};

/**
 * Targets a room when emitting.
 *
 * @param {String} name
 * @return {Namespace} self
 * @api public
 */

RoomsPlugin.prototype.to =
RoomsPlugin.prototype.in = function(socket, roomId)
{
  var room = this.createRoom(roomId);

  // TODO: improve interface like the in following:
  //return {
  //  broadcast: room.broadcast.bind(socket)
  //};

  return room
        .setFlag('except', socket.id);
};

function Room(nsp, roomId, construct)
{
  if (!(this instanceof Room)) return new Room();

  this.id = roomId;
  this.nsp = nsp;
  this.sids = [];
  this.length = 0;

  if(typeof construct === 'function')
  {
      construct.apply(this);
  }
}

Room.prototype.setFlag = function(key, value)
{
  this._flags = this._flags || {};

  this._flags[key] = value;

  return this;
};

Room.prototype.add = function(sid)
{
  if(this.sids.indexOf(sid) == -1)
  {
    this.sids.push(sid);
    this.length++;
  }

  return this;
};

Room.prototype.del = function(sid)
{
  var index = this.sids.indexOf(sid);

  if(index > -1)
  {
    this.sids.splice(index, 1);
    this.length--;
  }

  return this;
};

Room.prototype.broadcast = function()
{
  var except  = this._flags['except'];

  if(!Array.isArray(except))
  {
    except = [except];
  }

  for(var sid of this.sids)
  {
    if(except.indexOf(sid) !== -1) continue;

    let s = this.nsp.sockets[sid];

    if(s instanceof Socket)
    {
      s.emit.apply(s, arguments);
    }
  }

  delete this._flags;

  return this;
};

Room.prototype.has = function(socket)
{
  var id = socket.id || socket;

  return this.sids.hasOwnProperty(id);
};

Room.prototype.getSockets = function()
{
  return this.sids.map(sid =>
  {
      return this.nsp.sockets[sid];
  });
};


/**
 * Module Exports
 */
module.exports = RoomsPlugin;
