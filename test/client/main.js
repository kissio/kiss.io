#!/usr/bin/env node
'use strict';

var SUCCESS = 0, ERROR = 1;

var io = require('kiss.io-client'),
    main = io.connect('http://localhost:3456');

console.log("#test/client/main loaded. " +
  "connecting to '/main' on port 3456.");


main.on('connect', function()
{
  console.log('Connected successfully to main as %s', main.id);

  setTimeout(function()
  {
    process.exit(SUCCESS);
  }, 4000);
});

// Should get error thrown automatically from main middleware.
// This is supposed to happen.
main.on('error', function(error)
{
  console.error("Got error from server on '/main': %s", error);
  process.exit(SUCCESS);
});

process.on('uncaughtException', function onError(e)
{
  console.error('Caught exception in client/main: %s', e.message);
  process.exit(ERROR);
});

process.on('exit', function onExit(code)
{
  main.disconnect();
});
