'use strict';

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