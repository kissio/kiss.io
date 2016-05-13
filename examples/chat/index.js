'use strict';

var express = require('express');
var app     = express();
var io      = require('../..');
var router  = require('./router');

var RoomsPlugin = require('./rooms.plugin');
var Chat = io.Namespace('/chat');


/*
 * Setup chat
 */
Chat.configure(function buildInterface()
{
  this.plug(RoomsPlugin);
});

Chat.configure(function setLocals()
{
  this.numUsers = 0;
});

Chat.configure(function registerEvents()
{
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

/*
 * Setup basic express server, serve web chat gui
 */
app.use(express.static(__dirname + '/public'));

/*
 * Start listening
 */
io()
.mount(Chat)
.attach(app)
.listen(3001, function()
{
  console.log('Server listening at port 3001');
});
