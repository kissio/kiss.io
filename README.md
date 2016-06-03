# kiss.io `0.4.0-alpha.1`

[![Travis](https://img.shields.io/travis/kissio/kiss.io.svg)](https://travis-ci.org/kissio/kiss.io) [![license](https://img.shields.io/github/license/kissio/kiss.io.svg)](https://github.com/kissio/kiss.io/blob/master/LICENSE) 

<a href="#"><img src="https://avatars1.githubusercontent.com/u/19560359?v=3&s=50" align="left"></a>

**kiss.io** is dedicated for creating a better interface and functionality for the great ole' [socket.io](http://github.com/socketio/socket.io), following and honoring the K.I.S.S. principle - **Keep it Simple, Stupid!**


## Why kiss.io?
* **Sexy API** – elegant, simple, sleek, modern, objected-oriented and chainable interface, which makes scalability much much easier.
* **Self-contained namespaces** – in kiss.io namespaces are stand-alone modules. This approach allows for better scalability and code cleanness.
* **No code clutter** – Lots of old methods and unnecessary logic were removed/rewritten to match the spirit of kiss.io. We want you to just focus on the important stuff.
* **Built-in Router** – Because an external plugin for a basic feature is absurd.
* **Plugins** – Namespaces and sockets are extendable via plugins, which not only offer more modulization, but also extra flexibility!

*check out [WHY.md](https://github.com/kissio/kiss.io/blob/master/WHY.md) for further ranting.*

---

##### Important Disclaimer
This project is currently on **alpha** stages and is **not meant for production**!

Tests might be missing; API documentation might be lacking; and backwards compatibility is not promised. *Use at your own risk.*

----
## Install
`$ npm install kiss.io`

## Getting Started
#### Server Side
**socket.io style**  
creates a new kiss.io server (`var io`), prints a message when a socket is connected, and listens on port `3000`.
```javascript
var kiss = require('kiss.io');
var io   = new kiss();
var main = io.of('/');

// socket.io style
main.on('connection', function(socket)
{
    console.log('Welcome %s', socket.id);
    
    socket.once('disconnect', function()
    {
        console.log('Bye bye %s', socket.id);
    });
});

io.listen(3000);
```

**kiss.io style**  
a bit more 'modern' style of writing. registers events for sockets using the `reg` (aka `registerEvent`) method. mount the main namespace on the server, and start listening on port `3000`.
```javascript
var kiss = require('kiss.io');
var io   = new kiss();
var main = kiss.Namespace('/');

main.on('connection', function(socket)
{
    console.log('Welcome %s', socket.id);
});

// register an event for socket
main.reg('disconnect', function()
{
    // this is bounded to an object that contains `socket`, `nsp` and `next`, only when using reg.
    console.log('Bye Bye %s', this.socket.id);
});

io
.mount(main)
.listen(3000);
```

**kiss.io + Express.js**   
this shows the possibility to attach an Express.js instance as the front-end for the kiss.io server, and using multiple routes for manipulating data on the server (sending and recieving messages). also note that in this example we used a singleton instance of server instead of creating a new independent one.
```javascript
var express = require('express');
var kiss = require('kiss.io');
// if not initiated with the `new` keyword, uses a singleton server instance
// ..which is accessible from anywhere by including 'kiss.io'.
var io = kiss();

var app = express();
var chat = kiss.Namespace('/chat');

app.get('/', function (req, res)
{
    res.status(200).send('Welcome to kiss.io chat!');
});

chat.on('connection', function(socket)
{
    console.log('a guest has joined the chat');
});

chat.reg('send-msg', function(msg)
{
    // kiss.io was commanded to broadcast a message to everyone in the chat
    this
    .socket
    .broadcast('new-msg', msg, this.socket.id);
});

chat.reg('new-msg', function(msg, author)
{
    // print recieved message
    console.log('%s says: %s', author, msg);
});

io
.mount(chat)
.attach(app)
.listen(3000);
```

#### Client Side
Client side for **kiss.io** is powered via [socket.io-client](https://github.com/socketio/socket.io-client) which you can find via [cdnjs.com](https://cdnjs.com/libraries/socket.io) or the [socket.io website](http://socket.io/download).

Use just as you used to. **kiss.io** uses the same transport mechanism as socket.io (both powered by [engine.io](https://github.com/socketio/engine.io)) so the logic for client is the same for both **kiss.io** and socket.io. This is also holds true for [socket.io-java-client](https://github.com/Gottox/socket.io-java-client), [socket.io-client-swift](https://github.com/socketio/socket.io-client-swift) and [socket.io-client-cpp](https://github.com/socketio/socket.io-client-cpp).

## Further Documentation
Visit the [kiss.io wiki](https://github.com/kissio/kiss.io/wiki).

## Plugins Spotlight
* **[kiss.io-rooms](http://github.com/kissio/kiss.io-rooms)** – adds rooms functionality to your namespaces.

#### Also check out
* **[kiss.io-example-chat](http://github.com/kissio/kiss.io-example-chat)** – simple chat example that demonstrates namespace mounting.
* **[kiss.io-example-latency](http://github.com/kissio/kiss.io-example-latency)** – a simple utility for monitoring latency.

---

# LICENSE
MIT