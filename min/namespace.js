"use strict";function Namespace(e,t){return this instanceof Namespace?(this.name=Namespace.slugify(e),this.opts=t||{},this.router=new Router(this.opts.router),this.sockets={},this.middlewares=[],this.plugins=[],void(this.locals={})):new Namespace(e,t)}var debug=require("debug")("kiss.io:namespace"),util=require("util"),parser=require("socket.io-parser"),Socket=require("./socket"),Plugin=require("./plugin"),Router=require("./router");Namespace.slugify=function(e){return"/"!==String(e)[0]&&(e="/"+e),e},Namespace.prototype.plug=Namespace.prototype.plugin=function(e,t){if("function"==typeof e&&(e=new e(this,t)),e instanceof Plugin){var s=e.exports.nsp||{};Object.keys(s).forEach(function(t){var i=s[t];"function"==typeof i?i=i.bind(e,this):"object"==typeof i&&(i=Object.create(i)),this[t]=i},this),this.use(e.exports.router),this.plugins.push(e)}else debug("Namespace.plug: You can only plug `Plugin` instances.");return this},Namespace.prototype.configure=function(e){return"function"==typeof e?e.apply(this):debug("Ignored: Namespace.configure accepts only functions!"),this},Namespace.prototype.set=function(e,t){return this.opts[e]=t,this},Namespace.prototype.flag=function(e,t){return this._flags=this._flags||{},2==arguments.length&&(this._flags[e]=t),this._flags[e]},Namespace.prototype.reset=function(){delete this._flags},Namespace.prototype.local=function(e,t){return 2==arguments.length&&(this.locals[e]=t),this.locals[e]},Namespace.prototype.use=function(e){return"function"==typeof e?this.middlewares.push(e):e instanceof Plugin?this.plug(e):"string"==typeof e?this.event.apply(this,arguments):e instanceof Router&&this.router.use(e),this},Namespace.prototype.on=Namespace.prototype.event=function(e,t){return this.router.on(e,t)},Namespace.prototype.run=function(e,t){function s(o){var n=i[o],r=function(e){return e?t(e):i[o+1]?void s(o+1):t(null)};switch(n.length){case 3:n(e,e.request.headers,r);break;default:n(e,r)}}var i=this.middlewares.slice(0);return i.length?void s(0):t(null)},Namespace.prototype.add=function(e,t){try{if(t=t||function(){},"open"!==e.conn.readyState)return void t("next called after client was closed - ignoring socket");e.trigger("pre-setup",e),this.plugins.forEach(function(t){e.plug(t)}),this.run(e,function(s){s?t(s):(t(null),this.sockets[e.id]=e,e.onConnect(),e.trigger("connect",e),e.trigger("connection",e))}.bind(this))}catch(s){t(s)}},Namespace.prototype.remove=function(e){delete this.sockets[e.id]},Namespace.prototype.except=function(e){return Array.isArray(e)||(e=[e]),this.flag("except",e),this},Namespace.prototype.broadcast=function(e){var t=this.flag("except")||[];Object.keys(this.sockets).forEach(function(e){if(-1===t.indexOf(e)){var s=this.socket(e);s instanceof Socket&&s.emit.apply(s,arguments)}},this),this.reset()},Namespace.prototype.send=Namespace.prototype.write=function(){var e=Array.prototype.slice.call(arguments);return e.unshift("message"),this.broadcast.apply(this,e),this},Namespace.prototype.socket=function(e){return this.sockets[e]},Namespace.prototype.compress=function(e){return this.flag("compress",e),this},module.exports=Namespace;