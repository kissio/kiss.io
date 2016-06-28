'use strict';

var debug   = require('debug')('kiss.io:router');


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
}

/**
 * `Route` export from `Router`.
 *
 * @access public
 * @type Route
 */
Router.Route = Route;

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
  var route = this.route(event);

  if(handlers)
  {
    route.use(handlers);
  }

  return route;
};

/**
 * Trigger an event in the router.
 *
 * @access public
 *
 * @param {String} event
 * @param {Socket} socket
 */
Router.prototype.emit = function(event, socket)
{
  var args = arguments;
  var route = this.route(event);

  switch(args.length)
  {
    case 0:
    case 1:
      return route;
    case 2:
      return route.trigger(socket);
    case 3:
      return route.trigger(socket, args[2]);
    case 4:
      return route.trigger(socket, args[2], args[3]);
    case 5:
      return route.trigger(socket, args[2], args[3], args[4]);
    default:
      args = [].slice.call(arguments, 1);
      return route.trigger.apply(route, args);
  }
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

  Object.keys(router.routes).forEach(function(event)
  {
    this.routes[event] = router.routes[event];
  }, this);

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
    handlers = [].slice.call(arguments);
  }

  this.handlers = this.handlers.concat(handlers);
  return this;
};

Route.prototype.trigger = function(socket)
{
  var args = [].slice.call(arguments, 1);
  var self = this;
  var noop = function() {};

  function exec()
  {
    var fns = self.handlers;
    if (!fns.length) return;

    function run(i)
    {
      function next(err)
      {
        // upon error, short-circuit
        if(err) return socket.onError(err);

        // if no middleware left, do nothing
        if(!fns[i + 1]) return noop();

        // go on to next
        run(i + 1);
      }

      var context =
      {
        nsp: socket.nsp,
        socket: socket,
        next: next
      };

      fns[i].apply(context, args);
    }

    run(0);
  }

  exec.apply(null, args);
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