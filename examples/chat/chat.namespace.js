'use strict';

var io   = require('../..');

var Chat = new io.Namespace('/chat');


/*!
 * Setup chat
 */
Chat.configure(function buildInterface()
{
  var RoomsPlugin = require('./rooms.plugin');

  this.plug(RoomsPlugin);
});

Chat.configure(function setLocals()
{
  this.numUsers = 0;
});

Chat.configure(function registerEvents()
{
  var router  = require('./router');

  // init routers with Router
  this.use(router);

  // or alternatively, setup route individually
  this.reg('ping', function()
  {
    this.emit('pong');
  });
});

Chat.on('connection', function (socket)
{
  socket.join('room1');
});


/*!
 * Export Chat
 */
module.exports = Chat;
