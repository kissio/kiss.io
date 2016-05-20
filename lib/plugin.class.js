'use strict';

var debug = require('debug')('kiss.io:plugin');


function Plugin(opts)
{
  if(!(this instanceof Plugin))
  {
    return new Plugin(opts);
  }

  this.nspExports = {};
  this.socketExports = {};
}

Plugin.prototype.attachTo = function(item)
{
  var Namespace = require('./namespace.class');
  var Socket    = require('./socket.class');

  var exports = {};

  if(item instanceof Namespace)
  {
    exports = this.nspExports;
  }
  else if(item instanceof Socket)
  {
    exports = this.socketExports;
  }

  for(let key of Object.keys(exports))
  {
    let value = exports[key];

    if(typeof value == 'function')
    {
      value = value.bind(this, item);
    }
    else if(typeof value == 'object')
    {
      value = Object.create(value);
    }

    item[key] = value;
  }

  return item;
};

module.exports = Plugin;
