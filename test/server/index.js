#!/usr/bin/env node
'use strict';

var SUCCESS = 0, ERROR = 1;

var kiss = require('../../lib'),
    io   = kiss();

var main = require('./nsps/main');
var math  = require('./nsps/math');

/*!
 * Init server
 */
io
.mount(main)
.mount(math)
.listen(3456, function()
{
  console.log('#test/server loaded. listening on port 3456.');

  setTimeout(function()
  {
    process.exit(SUCCESS);
  }, 5000);
});

/*!
 * Handle exceptions, exit with code 1 (error).
 */
process.on('uncaughtException', function onError(e)
{
  console.error('Caught exception in server: ');
  console.error(e.stack || e.message);

  process.exit(ERROR);
});