# kiss.io
kiss.io is my side project, dedicated for creating a better interface and functionality for the great socket.io v1.4.5 realtime framework, following and honoring the KISS principle - **Keep it Simple, Stupid!**

---

##### Important Disclaimer
This project is currently on a fast developement track and not for production but only for small projects basis.

Tests might be missing; API documentation might not be full/updated; and backwards compatibility is not promised.

*Use at your own risk.*

---

## why?
The whole reason that a software exists is to make our lives easier, isn't it?

I believe in designing softwares that ease the backend logic when creating new things, so that we - the programmers - could focus on the more important stuff of building a great product, instead of always minding the part (which is supposed to be taken for granted).

Our mission as programmers is not invent the wheel each time we start a new project - but to use good, tested, efficient and well-defined  already-exists packages. It makes programming alone and in teams better, and makes the project far better modulized and scalable.

## so why not socket.io (v1.4.5)?
The reason I created kiss.io, is to provide a better interface or solution (IMO at least) to the existing sloppy, procedural (instead of oop) messy interface.

I don't believe in compromising code readability and functionality for tradeof with performance. Bunch of extra lines won't do much demage, and if so - the problem is with your hardware, not the software. *Want better performance? buy a better computer.* Stop jerking off to less spaces and more compact packages - in most times, it DOES NOT provide a better solution, but making life only more difficult.

For example, look at expressjs who has a very rich interface and provide a blazingly fast utility for http.Server, and also doing very great as a production open-source package.

socket.io delives GREAT permformance and AWESOME results, but it lacks ease and grace of API. For me - this is a big thing which I refuse to compromize over, and it is a big enough deal for me to start re-writing the whole socket.io interface.

*/rant*

## why not primus, sockjs, socketcluster etc?
Simply - socket.io is currently the best choice and my favorite option for a realtime framework. You're free to decide on your favorite solution.

## okay, how?
This is a fork of the socket.io v1.4.5 repository and was not made to replace it or fully rewrite it, but only to extend and enhance it.

Each time I have an encounter with an unpleasing code - I rewrite it, hopefully test it (:wink:) and push it to this repo.

If I desire a new feature, I add it. Simple as that.

---

# want to contribute?
Your'e welcome. I promise to look into each pull request and have open discussion over every aspect of the project.

# LICENSE
MIT
