// chan.js

(function() {
  'use strict';

  var slice = Array.prototype.slice;

  function makeChan(empty) {
    if (arguments.length > 1)
      throw new Error('makeChan: too many arguments');

    function fn(a, b) {
      // yield callback
      if (typeof a === 'function') {
        return fn.recv(a);
      }

      if (a instanceof Error) {
        // error
        return fn.send(a);
      }

      if (arguments.length <= 1) {
        // value or undefined
        return fn.send(a);
      }

      var args = slice.call(arguments);

      if (a === null || a === undefined) {
        if (arguments.length === 2) {
          return fn.send(b);
        }
        else {
          args.shift();
        }
      }

      // (null, value,...) -> [value, ...]
      return fn.send(args);
    }

    return new Channel(fn, empty), fn;
  }

  // recv: chan(cb)
  // send: chan(err, data)
  // send: chan() or chan(undefined)
  // send: chan(data)
  // chan.end()
  // chan.readable()
  // chan.size
  // chan.empty
  // chan.done()
  // chan.send(val or err)
  // chan.recv(cb)

  function Channel(fn, empty) {
    var isClosed = false;    // send stream is closed
    var isDone = false;      // receive stream is done
    var recvCallbacks = [];  // receive pending callbacks queue
    var values        = [];  // send pending values

    if (typeof empty === 'undefined') {
      empty = new Object();
    } else if (typeof empty === 'function') {
      empty = new empty();
    }

    var send = function send(val) {
      if (isClosed) {
        throw new Error('Cannot send to closed channel');
      } else if (recvCallbacks.length > 0) {
        call(recvCallbacks.shift(), val);
      } else {
        values.push(val);
      }
    }; // send

    var recv = function recv(cb) {
      if (done()) {
        call(cb, empty);
      } else if (values.length > 0) {
        call(cb, values.shift());
      } else {
        recvCallbacks.push(cb);
      }
      return;
    }; // recv

    var done = function done() {
      if (!isDone && isClosed && values.length === 0) {
        isDone = true;
        // call each pending callback with the empty value
        recvCallbacks.forEach(function(cb) { call(cb, empty); });
      }

      return isDone;
    }; // done

    var close = function close() {
      isClosed = true;
      return done();
    }; // close

    var readable = function readable() {
      var buf = this.read();
      if (!buf) return;
      send(buf);
    }; // readable

    fn.empty = empty;
    fn.close = close;
    fn.done  = done;
    fn.send  = send;
    fn.recv  = recv;

    // for stream
    fn.end      = close;
    fn.readable = readable;

  } // Channel

  function call(cb, val) {
    if (val instanceof Error) {
      cb(val);
    } else {
      cb(null, val);
    }
  } // call

  exports = module.exports = makeChan;

})();
