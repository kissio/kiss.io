"use strict";function Router(t){return this instanceof Router?(this.opts=t||{},void(this.routes={})):new Router(t)}function Route(t,e){return this instanceof Route?(this.event=t,this.params=[],this.emits=[],this.handlers=[],void(e&&this.triggers(e))):new Route(t,e)}var debug=require("debug")("kiss.io:router");Router.Route=Route,Router.prototype.listensOn=function(t){return!!this.routes[t]},Router.prototype.route=function(t){var e=this.routes[t];return e||(this.routes[t]=e=new Route(t)),e},Router.prototype.on=Router.prototype.event=function(t,e){var r=this.route(t);return e&&r.use(e),r},Router.prototype.emit=function(t,e){var r=arguments,o=this.route(t);switch(r.length){case 0:case 1:return o;case 2:return o.trigger(e);case 3:return o.trigger(e,r[2]);case 4:return o.trigger(e,r[2],r[3]);case 5:return o.trigger(e,r[2],r[3],r[4]);default:return r=[].slice.call(arguments,1),o.trigger.apply(o,r)}},Router.prototype.merge=function(t){if(!(t instanceof Router))throw new Error("`Router.merge` accepts only `Router` instances.");return Object.keys(t.routes).forEach(function(e){this.routes[e]=t.routes[e]},this),this},Router.prototype.use=function(t,e){return"string"==typeof t?this.event(t,e):t instanceof Router&&this.merge(t),this},Route.prototype.use=Route.prototype.triggers=function(t){return Array.isArray(t)||(t=[].slice.call(arguments)),this.handlers=this.handlers.concat(t),this},Route.prototype.trigger=function(t){function e(){function e(o){function u(r){return r?t.onError(r):s[o+1]?void e(o+1):n()}var i={nsp:t.nsp,socket:t,next:u};s[o].apply(i,r)}var s=o.handlers;s.length&&e(0)}var r=[].slice.call(arguments,1),o=this,n=function(){};e.apply(null,r)},Route.prototype.expects=function(t){return this.params=this.params.concat(t),this},Route.prototype.emits=function(t){return this.emits=this.emits.concat(t),this},module.exports=Router;