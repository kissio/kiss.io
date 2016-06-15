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
 * @param {Emitter|Function} emitter
 * @param {Object} [opts]: an optional opts object to pass to the
 * ..emitter constructor.
 * @returns {Router}
 */
Router.prototype.setEmitter = function(emitter, opts)
{
  if(typeof emitter == 'function')
  {
    emitter = new emitter(opts);
  }

  this.emitter = emitter;
  return this;
};

Router.prototype.listensOn = function(event)
{
  return !!this.routes[event];
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
  var route = this.routes[event];

  if(!route)
  {
    route = new Route(event);
    route = route.of(this);

    this.routes[event] = route;
  }

  route.triggers(handlers);
  return route;
};

Router.prototype.once =
Router.prototype.eventOnce = function(event, handlers)
{
  return this.event(event).once().triggers(handlers);
};

/**
 * Trigger an event in the router.
 *
 * @access public
 *
 * @param {String} event
 */
Router.prototype.trigger = function(event)
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
  this.emitter.addListener(event, listener);
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
    throw new Error('`Router.extend` accepts only `Router` instances.');
  }

  for(let ev of Object.keys(router.routes))
  {
    this.routes[ev] = router.routes[ev].of(this);
  }

  return this;
};

/**
 * Run function `fn` for each route in the router.
 * Chainable.
 *
 * @access public
 *
 * @param {Function} fn: bounded to this router.
 * @returns {Router} self
 */
Router.prototype.forRoute = function(fn)
{
  /**
   * Return values of a given object.
   *
   * @param {Object} obj
   * @returns {Array}
   */
  function values(obj)
  {
    return Object.keys(obj).map(function(key)
    {
      return obj[key];
    });
  }

  values(this.routes).forEach(fn, this);
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
    this.event.apply(this, arguments);
  }
  else if(route instanceof Route)
  {
    this.routes[route.event] = route.of(this);
  }
  else if(route instanceof Router)
  {
    this.merge(route);
  }

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

  this.triggers(handlers);
}

/**
 * Set/get a temporary flag.
 *
 * @access public
 *
 * @param {String} key: the name of the flag.
 * @param {*} [value]
 * @returns {*|undefined} value
 */
Route.prototype.flag = function(key, value)
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
Route.prototype.reset = function()
{
  delete this._flags;
};

/**
 * Set the `context` flag so that every handler will be bound to it.
 *
 * @access public
 *
 * @param {Object|*} context
 * @returns {Route} self
 */
Route.prototype.bindContext = function(context)
{
  this.flag('context', context);
  return this;
};

Route.prototype.once = function()
{
  this.flag('once', true);
  return this;
};

/**
 * Attach an owner `Router` to the route.
 * This will cause every handler on the route to be bound to
 * ..the owner router's emitter.
 *
 * @access public
 *
 * @param {Router} router: owner router
 * @returns {Route} self
 */
Route.prototype.of = function(router)
{
  var context = this.flag('context');

  for(let handler of this.handlers)
  {
    if(context)
    {
      handler = handler.bind(context);
    }

    router.addListener(this.event, handler);
  }

  this.flag('router', router);
  return this;
};

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

Route.prototype.do =
Route.prototype.triggers = function(handlers)
{
  if(!handlers || handlers === [])
  {
    return this;
  }

  var router = this.flag('router');
  var context = this.flag('context');
  var isOnce = this.flag('once');
  var addListener = function noop() {};

  if(router)
  {
    addListener = isOnce ? router.addOnceListener : router.addListener;
    addListener = addListener.bind(this.event);
  }

  if(!Array.isArray(handlers))
  {
    handlers = [handlers];
  }

  for(let handler of handlers)
  {
    if(typeof handler != 'function')
      continue;

    if(router)
      addListener(context ? handler.bind(context) : handler);

    this.handlers.push(handler);
  }

  this.reset();
  return this;
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