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
 * @param {Router|string} item - an event+handler or Router to use with this router.
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
 *
 * @param event
 * @param handler
 * @returns {Route}
 * @constructor
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
 * Interface for Router.event
 *
 * @param {Function} handler
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