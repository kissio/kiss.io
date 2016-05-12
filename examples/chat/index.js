'use strict';

// Setup basic express server
var express = require('express');
var app     = express();
var io      = require('../..');

var RoomsPlugin = require('./rooms.plugin');


var Chat = io.Namespace('/chat');

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
  this.reg('new message', function(data)
  {
    this.to('room1').broadcast('new message', {
      username: this.username,
      message: data
    });
  });
});

Chat.on('connection', function (socket)
{
  var addedUser = false;

  socket.join('room1');

  // when the client emits 'new message', this listens and executes
  //socket.on('new message', function (data)
  //{
  //  // we tell the client to execute 'new message'
  //  socket.to('room1').broadcast('new message', {
  //    username: socket.username,
  //    message: data
  //  });
  //});

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++Chat.numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: Chat.numUsers
    });

    // echo globally (all clients) that a person has connected
    socket.to('room1').broadcast('user joined', {
      username: socket.username,
      numUsers: Chat.numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.to('room1').broadcast('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.to('room1').broadcast('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --Chat.numUsers;

      // echo globally that this client has left
      socket.to('room1').broadcast('user left', {
        username: socket.username,
        numUsers: Chat.numUsers
      });
    }
  });
});

// Routing
app.use(express.static(__dirname + '/public'));

io()
.mount(Chat)
.attach(app)
.listen(3001, function()
{
  console.log('Server listening at port 3001');
});
