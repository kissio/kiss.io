'use strict';

var EE2  = require('eventemitter2').EventEmitter2;
var kiss = require('../../../lib'),
    math = kiss.Namespace('/math');

/*!
 * Init namespace
 */
math.configure(function prepareVars()
{
  this.eventsTriggered = 0;
  this.counter = 0;
});

math.configure(function initRouter()
{
  this.setEmitter(EE2, { wildcard: true });
  this.use(require('../routers/math'));
});

math.on('connection', function(socket)
{
  console.log("hello %s, welcome to '/math'.", socket.id);
});

/*!
 * Exports
 */
module.exports = math;