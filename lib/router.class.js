'use strict';

var debug = require('debug')('kiss.io:router');


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
    return new Router();
  }

  this.opts = opts || {};
  this.routes = {};
}

/**
 * `Route` export from `Router`.
 *
 * @access public
 * @type Route
 */
Router.Route = Route;

/**
 * Registers a new `Route` to the router.
 *
 * @access public
 * @alias {Router.event}
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
    this.routes[event] = route;
  }

  route.use(handlers);

  return route;
};

/**
 * Mounts another `Router` or `Route` or event+handler on this `Router`.
 * If item is a `Router` -- assigns all its routes to this `Router`;
 * If item is a `Route` -- registers the route to this `Router`;
 * If item is a `string` -- treats it as an event name, and registers it together
 * ..with fns as the handlers set the corresponds with the event.
 *
 * @access public
 *
 * @param {Router|Route|String} item: the item to mount on the router.
 * @param {Array<Function>|Function} [fns]: if `item` is an event {string} --
 * ..fns is the handlers set that corresponds with it.
 * @returns {Router} self
 */
Router.prototype.use = function(item, fns)
{
  if(typeof item == 'string')
  {
    this.on.apply(this, arguments);
  }
  else if(item instanceof Route)
  {
    this.routes[item.event] = item;
  }
  else if(item instanceof Router)
  {
    Object.assign(this.routes, item.routes);
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
 * @param {Array<Function>|Function} handlers
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
  this.handlers = [];

  this.use(handlers);
}

/**
 * Registers one or a set of handlers for this route `event`.
 * (this is a chainable interface for Router.on aka Router.event).
 *
 * @alias {Route.use}
 * @access public
 *
 * @param {Array<Function>|Function} handlers
 * @returns {Route} self
 */
Route.prototype.do =
Route.prototype.use = function(handlers)
{
  if(!Array.isArray(handlers))
  {
    handlers = [handlers];
  }

  for(let handler of handlers)
  {
    if(typeof handler == 'function')
    {
      this.handlers.push(handler);
    }
  }

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
Route.prototype.expect = function(params)
{
  if(Array.isArray(params))
  {
    this.params = params;
  }

  return this;
};

/*!
 * Module exports.
 */
module.exports = Router;