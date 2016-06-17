'use strict';

var debug   = require('debug')('kiss.io:router');
var Emitter = require('events').EventEmitter;


/**
 * A router is a class that contains many routes (@see `Route`),
 * ..and provides a readable, express.js-like interface for constructing
 * ..module-specific routes for better scalability and organization.
 *
 * @constructs Router
 * @access public
 *
 * @param {Object} [opts]: special options to pass to the router.
 * @returns {Router} self
 */
function Router(opts)
{
  if(!(this instanceof Router))
  {
    return new Router(opts);
  }

  this.opts = opts || {};
  this.routes = {};
  this.emitter = null;

  this.setEmitter(this.opts.emitter || Emitter);
}

/**
 * `Route` export from `Router`.
 *
 * @access public
 * @type Route
 */
Router.Route = Route;

/**
 * Set a custom EventEmitter for this router.
 *
 * @access public
 *
 * @param {Function} emitter: an EventEmitter constructor function.
 * @param {Object} [opts]: an optional opts object to pass to the
 * ..emitter constructor.
 */
Router.prototype.setEmitter = function(emitter, opts)
{
  if(typeof emitter == 'function')
  {
    // save emitter opts
    if(opts) this.opts = opts;

    // save emitter c'tor function.
    this.opts.emitter = emitter;

    // initiate router emitter
    this.emitter = new emitter(this.opts);
  }
  else
  {
    throw new Error('Router.setEmitter accepts only uninitiated emitters!\n'
    + 'Please pass an emitter constructor function.');
  }
};

/**
 * Set/get a temporary flag.
 *
 * @access public
 *
 * @param {String} key: the name of the flag.
 * @param {*} [value]
 * @returns {*|undefined} value
 */
Router.prototype.flag = function(key, value)
{
  this._flags = this._flags || {};

  if(arguments.length == 2)
  {
    this._flags[key] = value;
  }

  return this._flags[key];
};

/**
 * Reset temporary flags
 *
 * @access public
 */
Router.prototype.reset = function()
{
  delete this._flags;
};

Router.prototype.listensOn = function(event)
{
  return !!this.routes[event];
};

Router.prototype.route = function(event)
{
  var route = this.routes[event];

  if(!route)
  {
    this.routes[event] = route = new Route(event);
  }

  return route;
};

/**
 * Registers a new `Route` to the router.
 *
 * @alias {Router.event}
 * @access public
 *
 * @param {String} event
 * @param {Array<Function>|Function} handlers
 * @returns {Route} the new route for chaining interface.
 */
Router.prototype.on =
Router.prototype.event = function(event, handlers)
{
  this.bind(this.route(event));

  if(handlers)
  {
    this.triggers(handlers);
  }

  return this;
};

Router.prototype.once =
Router.prototype.eventOnce = function(event, handlers)
{
  this.flag('once', true);
  return this.event(event, handlers);
};

Router.prototype.bind = function(route)
{
  this.flag('boundedRoute', route);
  return this;
};

Router.prototype.triggers = function(handlers)
{
  var route = this.flag('boundedRoute');
  var isOnce = this.flag('once') || route.isOnce;
  var addListener = function noop() {};

  route.isOnce = isOnce;
  handlers = route.use(handlers);

  if(isOnce)
    addListener = this.addOnceListener.bind(this, route.event);
  else
    addListener = this.addListener.bind(this, route.event);

  handlers.forEach(function regToEmitter(handler)
  {
    addListener(handler);
  });

  return this;
};

/**
 * Trigger an event in the router.
 *
 * @access public
 *
 * @param {String} event
 */
Router.prototype.emit = function(event)
{
  this.emitter.emit.apply(this.emitter, arguments);
};

/**
 * @see EventEmitter.addListener
 *
 * @access protected
 *
 * @param {String} event
 * @param {Function} listener
 */
Router.prototype.addListener = function(event, listener)
{
  this.emitter.on(event, listener);
};

Router.prototype.addOnceListener = function(event, listener)
{
  this.emitter.once(event, listener);
};

/**
 * Merge another router to this instance.
 *
 * @access public
 *
 * @param {Router} router
 * @returns {Router} self
 */
Router.prototype.merge = function(router)
{
  if(!(router instanceof Router))
  {
    throw new Error('`Router.merge` accepts only `Router` instances.');
  }

  for(var ev of Object.keys(router.routes))
  {
    var route = router.routes[ev];

    if(route.isOnce)
      this.once(route.event, route.handlers);
    else
      this.on(route.event, route.handlers);
  }

  return this;
};

/**
 * Mounts another `Router` or `Route` or event+handler on this `Router`.
 * If route is a `Router` -- assigns all its routes to this `Router`;
 * If route is a `Route` -- registers the route to this `Router`;
 * If route is a `string` -- treats it as an event name, and registers it together
 * ..with fns as the handlers set the corresponds with the event.
 *
 * @access public
 *
 * @param {Router|Route|String} route: the route to mount on the router.
 * @param {Array<Function>|Function} [fns]: if `route` is an event {string} --
 * ..fns is the handlers set that corresponds with it.
 * @returns {Router} self
 */
Router.prototype.use = function(route, fns)
{
  if(typeof route == 'string')
  {
    this.event(route, fns);
  }
  else if(route instanceof Router)
  {
    this.merge(route);
  }

  this.reset();
  return this;
};

/**
 * A route is an object that represents a singular pair-of-event+handler(s).
 * It provides a nice chainable interface for easy, intuitive router management.
 *
 * @constructs Route
 * @access public
 *
 * @param {String} event
 * @param {Array<Function>|Function} [handlers]
 * @returns {Route} self
 */
function Route(event, handlers)
{
  if(!(this instanceof Route))
  {
    return new Route(event, handlers);
  }

  this.event = event;
  this.params = [];
  this.emits = [];
  this.handlers = [];
  this.isOnce = false;

  if(handlers)
  {
    this.triggers(handlers);
  }
}

/**
 * Registers one or a set of handlers for this route `event`.
 * (this is a chainable interface for Router.on aka Router.event).
 *
 * @alias {Route.triggers}
 * @access public
 *
 * @param {Array<Function>|Function} handlers
 * @returns {Route} self
 */
Route.prototype.use =
Route.prototype.triggers = function(handlers)
{
  if(!Array.isArray(handlers))
  {
    handlers = Array.from(arguments);
  }

  this.handlers = this.handlers.concat(handlers);
  return handlers;
};

/**
 * Used to clarify what are the expected parameters that the route handlers
 * ..expect to get.
 * For now, just an helper function that doesn't add a thing
 * ..to the current logic of the route.
 *
 * @access public
 *
 * @param {Array<String>} params
 * @returns {Route} self
 */
Route.prototype.expects = function(params)
{
  this.params = this.params.concat(params);
  return this;
};

Route.prototype.emits = function(events)
{
  this.emits = this.emits.concat(events);
  return this;
};

/*!
 * Module exports.
 */
module.exports = Router;