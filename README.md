Imperfect REST Versus Socket.IO Speed Comparison
================================================

This package contains a small server and Angular application to non-rigorously
measure speed differences between REST-like calls to a server made over (a)
plain old AJAX HTTP requests versus (b) a WebSocket connection.

To fire up the server.

    npm install imperfect-rest-comparison
    node imperfect-rest-comparison

Then launch a browser and open up:

    http://localhost:10080

You'll find a page with options to run various tests against the server.

Unscientific Conclusions
------------------------

If you've managed to tweak your browser to turn off the Connection: Keep-Alive
header in AJAX requests, then HTTP is going to be very slow in comparison to
Socket.IO. This is pretty easy to do in Firefox if you are set up to use it as a
developer, less easy in Chrome.

The unscientific results for browsers with Keep-Alive on, using non-cached AJAX
requests and non-cached equivalent WebSocket exchanges:

  * When running requests in series WebSockets are 5-10% faster than HTTP.
  * When running requests in parallel WebSockets are ~40% faster than HTTP.

The story no doubt becomes different if you're making heavy use of client-side
caching. Good caches for AJAX HTTP come built in to frameworks like AngularJS
and are essentially free in terms of development time. You'd have to implement
something similar from scratch for your potential WebSocket transport layer. Not
that this would be an enormous task. Still, something to think about.
