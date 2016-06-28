'use strict';

var debug = require('debug')('kiss.io:plugin');
var util  = require('util');

var Router = require('./router');

/**
 * Plugin is the base class that each external plug-in
 * ..must inherit and implement to be plugged to the namespace.
 * An external plug-in that doesn't inherit from `Plugin` is ignored.
 *
 * @constructs Plugin
 * @access public
 *
 * @param {Namespace} nsp
 * @param {Object} [opts]: special options to pass to the plugin.
 * @returns {Plugin} self
 */
function Plugin(nsp, opts)
{
  if(!(this instanceof Plugin))
  {
    return new Plugin(nsp, opts);
  }

  this.opts = opts || {};
  this.nsp = nsp;
  this.router = new Router(this.opts.router);

  this.exports =
  {
    nsp: {},
    socket: {},
    router: this.router
  };
}

/**
 * Wrap `Plugin` skeleton on a given plugin, essentially
 * ..extending its prototype.
 * TL;DR plugin inherits from `Plugin` class.
 *
 * @access public
 *
 * @param {Function} plugin: the plugin function (before initiated).
 */
Plugin.wrap = function(plugin)
{
  util.inherits(plugin, Plugin);
};


/*!
 * Module exports.
 */
module.exports = Plugin;
