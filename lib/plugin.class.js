'use strict';

var debug     = require('debug')('kiss.io:plugin');
var parser    = require('socket.io-parser');

var Emitter   = require('events').EventEmitter;


function Plugin(opts)
{
  if(!(this instanceof Plugin)) return new Plugin();

  this.encoder = new parser.Encoder();

  this.nspExports = {};
  this.socketExports = {};
}


module.exports = Plugin;
