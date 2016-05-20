'use strict';

var io = require('../..');
var router = io.Router();

var handlers = require('./handlers');


// when the client emits 'add user', this listens and executes
router
  .on('add user')
  .expect(['username'])
  .do(handlers.onLogin);

// when the client emits 'new message', this listens and executes
router
  .on('new message', handlers.onNewMessage);

// when the client emits 'typing', we broadcast it to others
router
  .on('typing', handlers.onTyping);

// when the client emits 'stop typing', we broadcast it to others
router
  .event('stop typing', handlers.onStopTyping);

// when the user disconnects.. perform this
router
  .event('disconnect')
  .do(handlers.onDisconnect);


module.exports = router;