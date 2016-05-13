`13/05/16 by Amit Evron`

# kiss.io
kiss.io is my side project, dedicated for creating a better interface and functionality for the great ole' socket.io v1.4.6 realtime framework, following and honoring the KISS principle - **Keep it Simple, Stupid!**

---

## why?
The whole reason that a software exists is to make our lives easier, isn't it?

I believe in designing tools that ease the backend logic when creating new things, so that we - the programmers - could focus on the more important stuff of building a great product.

Our mission as programmers is not invent the wheel each time we start a new project - but to use good, tested, efficient and well-defined  already-exists packages. It makes programming better and faster, helps us to co-operate with other developers, and makes the project far better modulized and scalable.

## so why not socket.io?
The reason I started kiss.io, is to provide a better interface or solution (IMO at least) to the existing sloppy, procedural (instead of oop) messy interface of socket.io.

I don't believe in compromising code readability and functionality for tradeof with performance. Bunch of extra lines won't harm anything, but if you're still dread for that millisecond timing - than this framework is not for you. 

*Want better performance? buy a better computer.* Stop jerking off to less spaces and more compact packages - in most times, it DOES NOT provide a better solution, but making life for developers only more difficult, thus cost more money, headaches and time.

My favorite example for this notion is **express.js**, which provides a blazingly fast utility for http servers, and also doing very great as a production open-source package, without compromising code readability, interface richness, scalability, and comfort.

socket.io delivers GREAT performance and AWESOME results, but it lacks ease and grace with its API. For me - this is a huge turn-off which I refuse to compromize for, and it is a big enough deal for me to start re-writing the whole socket.io interface.

*/rant*

## why not primus, sockjs, socketcluster, etc?
Simply - socket.io is currently the best choice and my favorite option for a realtime framework. You're free to use what suits you best.

## okay, how?
This is a fork of the socket.io v1.4.6 repository and was not made to replace it or fully rewrite it, but only to extend and enhance it.

Each time I have an encounter with an unpleasing code - I rewrite it, hopefully test it (:wink:) and push it to this repo.

If I desire a new feature, I add it. Simple as that.
