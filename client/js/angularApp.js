/*global
  angular: false,
  async: false,
  io: false
*/
/**
 * @fileOverview
 * A simple Angular application setup.
 */

(function () {
  'use strict';

  /*---------------------------------------------------------------------------
  Set up the Socket.IO connection.
  ---------------------------------------------------------------------------*/

  var socket = io.connect();

  /*---------------------------------------------------------------------------
  Set up the AngularJS application.
  ---------------------------------------------------------------------------*/

  // Create the example application AngularJS module.
  var comparison = angular.module('comparison', []);

  // Use the config function to set up routes, or route singular in this case.
  comparison.config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        controller: 'comparisonController',
        templateUrl: '/partial/comparison.html'
      })
      .otherwise({
        redirectTo: '/'
      });
  });


  /*---------------------------------------------------------------------------
  Set up the Controllers.
  ---------------------------------------------------------------------------*/

  /**
   * The application controller.
   */
  function comparisonController ($scope, $http) {

    /*----------------------------------------------------------------------
    Utility functions.
    ----------------------------------------------------------------------*/

    /**
     * If there is any chance of $scope.$apply() calls overlapping, as a result
     * of close-running inputs from outside AngularJS then use this instead.
     *
     * @param {Function} fn
     *   A function to call, and which will most likely alter $scope values.
     */
    $scope.$applySafely = function (fn) {
      var phase = this.$root.$$phase;
      if (phase === '$apply' || phase === '$digest') {
        if(typeof(fn) === 'function') {
          fn();
        }
      } else {
        this.$apply(fn);
      }
    };

    /**
     * Note that a request is started.
     *
     * @return {number}
     *     Index of the new request.
     */
    function requestStarted () {
      var newIndex = $scope.results.length;
      $scope.results[newIndex] = {
        index: newIndex + 1,
        startTime: Date.now(),
        completed: false
      };
      return newIndex;
    }

    /**
     * Deal with the response from the server.
     */
    function processResponse(index, success) {
      var result = $scope.results[index];
      result.endTime = Date.now();
      result.completed = true;
      result.success = success;
      result.elapsed = result.endTime - result.startTime;
    }

    /**
     * Send an HTTP request to the server.
     *
     * @param  {Function} [callback]
     *   Optional callback.
     */
    function sendHttpRequest(callback) {
      var index = requestStarted();
      $http({
        method: 'GET',
        url: $scope.url + '?t=' + Date.now()
      }).then(function (response) {
        processResponse(index, true);
        if (callback) {
          callback();
        }
      }, function () {
        processResponse(index, false);
        if (callback) {
          callback();
        }
      });
    }

    /**
     * Send an HTTP request to the server.
     *
     * @param  {Function} [callback]
     *   Optional callback.
     */
    function sendSocketMessage(callback) {
      var index = requestStarted();
      $scope.socketCallbacks[index] = callback;
      socket.emit('request', index);
    }

    /**
     * Return a status for the given result suitable for display.
     *
     * @param {number} index
     *   Index of the result in the results array.
     * @return {string}
     *   Display string for the status.
     */
    $scope.resultStatus = function (index) {
      var result = this.results[index];
      if (!result) {
        return '';
      }
      if (!result.completed) {
        return 'Running...';
      } else {
        if (result.success) {
          return 'Completed';
        } else {
          return 'Failed.';
        }
      }
    };

    /**
     * Is a test current running?
     */
    $scope.isRunning = function () {
      return (this.time.started && !this.time.ended);
    };

    /**
     * Note that a run started.
     */
    $scope.runStarted = function () {
      this.clear();
      this.time.started = Date.now();
    };

    /**
     * Note that a run ended.
     */
    $scope.runEnded = function () {
      this.time.ended = Date.now();
      this.time.elapsed = this.time.ended - this.time.started;
    };

    /**
     * Clear the current test results.
     */
    $scope.clear = function () {
      this.time = {
        started: undefined,
        ended: undefined,
        elapsed: undefined,
        averagePerRequest: undefined
      };
      this.results = [];
      this.socketCallbacks = [];
    };

    /*----------------------------------------------------------------------
    Test running functions.
    ----------------------------------------------------------------------*/

    /**
     * Run a test against the server over HTTP in series.
     */
    $scope.httpSeries = function () {
      if (this.isRunning()) {
        return;
      }

      var self = this;
      this.runStarted();
      async.timesSeries(this.count, function (index, asyncCallback) {
        sendHttpRequest(asyncCallback);
      }, function () {
        self.runEnded();
      });
    };

    /**
     * Run a test against the server over HTTP in parallel.
     */
    $scope.httpParallel = function () {
      if (this.isRunning()) {
        return;
      }

      var self = this;
      this.runStarted();
      async.times(this.count, function (index, asyncCallback) {
        sendHttpRequest(asyncCallback);
      }, function () {
        self.runEnded();
      });
    };

    /**
     * Run a test against the server over Socket.IO in series.
     */
    $scope.socketSeries = function () {
      if (this.isRunning()) {
        return;
      }

      var self = this;
      this.runStarted();
      async.timesSeries(this.count, function (index, asyncCallback) {
        sendSocketMessage(asyncCallback);
      }, function () {
        self.runEnded();
      });
    };

    /**
     * Run a test against the server over Socket.IO in parallel.
     */
    $scope.socketParallel = function () {
      if (this.isRunning()) {
        return;
      }

      var self = this;
      this.runStarted();
      async.times(this.count, function (index, asyncCallback) {
        sendSocketMessage(asyncCallback);
      }, function () {
        self.runEnded();
      });
    };

    /*----------------------------------------------------------------------
    Initialization.
    ----------------------------------------------------------------------*/

    $scope.clear();
    // The normal limit on concurrent HTTP requests in Firefox.
    $scope.count = 6;
    $scope.countOptions = [1, 6, 10, 20];
    $scope.url = '/rest';
    $scope.title = 'Comparing HTTP and Socket.IO for Data Transfer';

    // Set up a listener on the socket to deal with returning items.
    socket.on('response', function (index, data) {
      $scope.$applySafely(function (scope) {
        if (scope.socketCallbacks[index]) {
          scope.socketCallbacks[index]();
        }
        processResponse(index, true);
      });
    });
  }

  // Create the application controller. Only a single controller here to go
  // with the single route.
  comparison.controller('comparisonController', [
    '$scope',
    '$http',
    comparisonController
  ]);

})();
