'use strict';

var debug = require('debug')('kiss.io:plugin');


/**
 * Plugin is the base class that each external plug-in
 * ..must inherit and implement to be plugged to the namespace.
 * An external plug-in that doesn't inherit from `Plugin` is ignored.
 *
 * @constructs Plugin
 * @access public
 *
 * @param {Object} [opts]: special options to pass to the plugin.
 * @returns {Plugin} self
 */
function Plugin(opts)
{
  if(!(this instanceof Plugin))
  {
    return new Plugin(opts);
  }

  this.nspExports = {};
  this.socketExports = {};
}

/**
 * Attaches this plugin to a given namespace/socket.
 *
 * @access public
 *
 * @param {Namespace|Socket} item: the item to attach the plugin to
 * @returns {Namespace|Socket} item
 */
Plugin.prototype.attachTo = function(item)
{
  var Namespace = require('./namespace');
  var Socket    = require('./socket');

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

/*!
 * Module exports.
 */
module.exports = Plugin;
