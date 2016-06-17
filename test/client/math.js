#!/usr/bin/env node
'use strict';

var SUCCESS = 0, ERROR = 1;

var io = require('kiss.io-client'),
    math = io.connect('http://localhost:3456/math');

console.log("#test/client/math loaded. " +
  "connecting to '/math' on port 3456.");


math.on('connect', function()
{
  console.log('Connected successfully to MATH as %s', math.id);

  math.emit('math.inc');
  math.emit('math.inc');
  math.emit('math.dec');
  math.emit('math.dec');
  math.emit('math.inc');
  math.emit('math.print');
  math.emit('math.calc');

  setTimeout(function()
  {
    process.exit(SUCCESS);
  }, 4000);
});

math.on('error', function(error)
{
  console.error("Got error from server on '/math': %s", error);
  process.exit(ERROR);
});

math.on('math.results', function(counter)
{
  if(counter != 2)
  {
    console.log('math.results: got wrong results! expecting 2, got %d', counter);
    process.exit(ERROR);
  }
  else
  {
    console.log('math.results: success');
    process.exit(SUCCESS);
  }
});

process.on('uncaughtException', function onError(e)
{
  console.error('Caught exception in client/MATH: %s', e.message);
  process.exit(ERROR);
});

process.on('exit', function onExit(code)
{
  math.disconnect();
});