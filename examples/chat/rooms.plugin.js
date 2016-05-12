'use strict';

var debug     = require('debug')('kiss.io:room');
var util      = require('util');
var io        = require('../../');

var Namespace = io.Namespace;
var Plugin    = io.Plugin;
var Socket    = io.Socket;


function RoomsPlugin(nsp, opts)
{
  if(typeof opts == 'object')
  {
    this.opts = opts;
  }

  this.nsp = nsp;
  this.rooms = {};

  this.nspExtends =
  {
    remove: nsp.remove
  };

  /**
   * Plugin Exports
   */
  this.nspExports =
  {
    room: this.room,
    remove: this.extendRemove
  };

  this.socketExports =
  {
    roomIds: [],

    join: this.join,
    leave: this.leave,
    to: this.to
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

  if(socket.roomIds.indexOf(roomId) === -1)
  {
    room.add(socket.id);
    socket.roomIds.push(roomId);
  }

  return room;
};

RoomsPlugin.prototype.leave = function(socket, roomId)
{
  var roomIndex = socket.roomIds.indexOf(roomId);
  var room = this.rooms[roomId];

  if(roomIndex !== -1)
  {
    socket.roomIds.splice(roomIndex, 1);
  }

  if(room)
  {
    room.del(socket.id);
  }
};

RoomsPlugin.prototype.room = function(nsp, roomId)
{
  return this.rooms[roomId];
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

  return room.except(socket.id);
};

RoomsPlugin.prototype.extendRemove = function(nsp, socket)
{
  var remove = this.nspExtends.remove;
  var self = this;

  socket.roomIds.forEach(function(roomId)
  {
    self.leave(socket, roomId);
  });

  if(remove) remove.call(nsp, socket);
};

function Room(nsp, roomId, construct)
{
  if (!(this instanceof Room))
  {
    return new Room(nsp, roomId, construct);
  }

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

Room.prototype.except = function(sockets)
{
  this.setFlag('except', sockets);

  return this;
};

Room.prototype.add = function(sid)
{
  var index = this.sids.indexOf(sid);

  if(index === -1)
  {
    this.sids.push(sid);
    this.length++;
  }

  return this;
};

Room.prototype.del = function(sid)
{
  var index = this.sids.indexOf(sid);

  if(index !== -1)
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

Room.prototype.has =
Room.prototype.isInRoom = function(socket)
{
  var sid = socket.id || socket;

  return this.sids.indexOf(sid) !== -1;
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
