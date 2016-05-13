'use strict';

module.exports =
{
  onNewMessage: onNewMessage
, onLogin: onLogin
, onTyping: onTyping
, onStopTyping: onStopTyping
, onDisconnect: onDisconnect
};


function onNewMessage(data)
{
  this.to('room1').broadcast('new message', {
    username: this.username,
    message: data
  });
}

function onLogin(username)
{
  var Chat = this.nsp;

  if (this.addedUser) return;

  // we store the username in the socket session for this client
  this.username = username;

  ++Chat.numUsers;
  this.addedUser = true;

  this.emit('login', {
    numUsers: Chat.numUsers
  });

  // echo globally (all clients) that a person has connected
  this.to('room1').broadcast('user joined', {
    username: this.username,
    numUsers: Chat.numUsers
  });
}

function onTyping()
{
  this.to('room1').broadcast('typing', {
    username: this.username
  });
}

function onStopTyping()
{
  this.to('room1').broadcast('stop typing', {
    username: this.username
  });
}

function onDisconnect()
{
  var Chat = this.nsp;

  if (this.addedUser)
  {
    --Chat.numUsers;

    // echo globally that this client has left
    this.to('room1').broadcast('user left', {
      username: this.username,
      numUsers: Chat.numUsers
    });
  }
}

