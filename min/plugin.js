"use strict";function Plugin(i,t){return this instanceof Plugin?(this.opts=t||{},this.nsp=i,this.router=new Router(this.opts.router),void(this.exports={nsp:{},socket:{},router:this.router})):new Plugin(i,t)}var debug=require("debug")("kiss.io:plugin"),util=require("util"),Router=require("./router");Plugin.wrap=function(i){util.inherits(i,Plugin)},module.exports=Plugin;