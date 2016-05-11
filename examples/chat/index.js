'use strict';

// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('../..');
var port = process.env.PORT || 3001;

var RoomsPlugin = require('./room.plugin');


var Chat = io.Namespace('/chat');

Chat.configure(function()
{
  this.plug(RoomsPlugin);
});


// Chatroom
var numUsers = 0;

Chat.on('connection', function (socket)
{
  var addedUser = false;

  socket.join('room1');

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data)
  {
    // we tell the client to execute 'new message'
    socket.to('room1').broadcast('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });

    // echo globally (all clients) that a person has connected
    socket.to('room1').broadcast('user joined', {
      username: socket.username,
      numUsers: numUsers
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
      --numUsers;

      // echo globally that this client has left
      socket.to('room1').broadcast('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});

/* DOES'NT WORK */
//Chat.registerEvent('new message', function (data)
//{
//  // we tell the client to execute 'new message'
//  this.broadcast.emit('new message', {
//    username: socket.username,
//    message: data
//  });
//});

// Routing
app.use(express.static(__dirname + '/public'));

io()
.mount(Chat)
.attach(server)
.listen(port, function()
{
  console.log('Server listening at port %d', port);
});
