'use strict';

var io = require('../..');
var router = io.Router();

var handlers = require('./handlers');


// when the client emits 'add user', this listens and executes
router
  .on('add user')
  .do(handlers.onLogin);

// when the client emits 'new message', this listens and executes
router
  .on('new message')
  .use(handlers.onNewMessage);

// when the client emits 'typing', we broadcast it to others
router
  .on('typing', handlers.onTyping);

// when the client emits 'stop typing', we broadcast it to others
router
  .on('stop typing', handlers.onStopTyping);

// when the user disconnects.. perform this
router
  .event('disconnect')
  .do(handlers.onDisconnect);


module.exports = router;