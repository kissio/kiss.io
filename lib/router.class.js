'use strict';

var debug = require('debug')('kiss.io:router');


function Router(opts)
{
  if(!(this instanceof Router))
  {
    return new Router();
  }

  this.opts = opts || {};
  this.routes = {};
}

Router.Route = Route;

/**
 * @param event
 * @param {Function} handler
 * @ret Route
 */
Router.prototype.on =
Router.prototype.event = function(event, handler)
{
  var route = this.routes[event];

  if(!route)
  {
    route = new Route(event);
    this.routes[event] = route;
  }

  route.use(handler);

  return route;
};

/**
 * @param {Router|string} item - an event+handler or Router to use with this router.
 */
Router.prototype.use = function(item)
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
 *
 * @param event
 * @param handler
 * @returns {Route}
 * @constructor
 */
function Route(event, handler)
{
  if(!(this instanceof Route))
  {
    return new Route(event);
  }

  this.event = event;
  this.args = [];
  this.handler = function noop() {};

  this.use(handler);
}

/**
 * Interface for Router.event
 *
 * @param {Function} handler
 */
Route.prototype.do =
Route.prototype.use = function(handler)
{
  if(typeof handler == 'function')
  {
    this.handler = handler;
  }

  return this;
};

/**
 * For now, just an helper function
 * @param args
 * @returns {Route}
 */
Route.prototype.expect = function(args)
{
  if(Array.isArray(args))
  {
    this.args = args;
  }

  return this;
};

module.exports = Router;