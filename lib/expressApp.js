/**
 * @fileOverview
 * The Express application.
 */

var http = require('http');
var path = require('path');
var express = require('express');
var io = require('socket.io');

/*---------------------------------------------------------------------------
Functionality shared between Express and Socket.IO.
---------------------------------------------------------------------------*/

/**
 * Get a dummy response to a REST/Socket.IO query, with a small uniform pause.
 *
 * @param {Function} callback
 *     Of the form function (data);
 */
function getResponseData(callback) {
  setTimeout(function () {
    var response = {};
    response[Math.random()] = Math.random();
    callback(response);
  }, 50);
}

/*---------------------------------------------------------------------------
Set up Express
---------------------------------------------------------------------------*/

var app = express();
// Serve the client code from a single static directory.
app.use(express.static(path.join(__dirname, '../client')));
// Launch the server.
var server = http.createServer(app).listen(10080);

// A path for fake REST requests.
app.all('/rest', function (request, response, next) {
  getResponseData(function (data) {
    response.json(data);
  });
});

/*---------------------------------------------------------------------------
Set up Socket.IO
---------------------------------------------------------------------------*/

// Attach Socket.IO.
var socketFactory = io.listen(server);
socketFactory.configure(function () {
  socketFactory.set('browser client minification', true);
  socketFactory.set('browser client etag', true);
  socketFactory.set('log level', 1);
  // This MUST match the value of the socketClientConfig.resource value,
  // but with the addition of a leading /.
  socketFactory.set('resource', '/socket.io');
  // The transports to use: force websockets only.
  socketFactory.set('transports', ['websocket']);
});

// Set up a listener for the fake responses.
socketFactory.on('connection', function (socket) {
  // Set up the fake response to data requests.
  socket.on('request', function (index) {
    getResponseData(function (data) {
      socket.emit('response', index, data);
    });
  });
});

