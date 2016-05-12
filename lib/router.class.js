'use strict';



function Router()
{
  if(!(this instanceof Router))
  {
    return new Router();
  }

  this.routes = {};
}


/**
 * @param event
 * @param {Function|Array<Function>} handler
 */
Router.prototype.on = function(event, handler)
{
  if(!handler)
  {
    return this.event(event);
  }
};

/**
 * @param {Router|string} item - an event+handler or Router to use with this router.
 */
Router.prototype.use = function(item)
{

};

/**
 *
 * @param {String} event - express.js like routing for kiss.io.
 */
Router.prototype.event = function(event)
{

};

/**
 * Interface for Router.event
 *
 * @param {Function} handler
 */
Router.prototype.do = function(handler)
{

};


module.exports = Router;