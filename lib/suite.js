
var EventEmitter = require('events').EventEmitter
  , util = require('util');

var Test = require('./test');

function defaults (a, b) {
  if (a && b) {
    for (var key in b) {
      if ('undefined' == typeof a[key])
        a[key] = b[key];
    }
  }
  return a;
}

module.exports = Suite;

function Suite (options) {
  this.tests = {};
  this.options = defaults(options || {}, {
    type: 'adaptive',
    iterations: 100,
    delay: 1000,
    min: 100,
    reporter: true
  });
  
  if (this.options.reporter) {
    var reporter = require('./reporter');
    this.reporter = new reporter(this);
  }
}

util.inherits(Suite, EventEmitter);

Suite.prototype.bench = function (name, fn) {
  this.tests[name] = new Test(this, name, fn, this.options);
};


Suite.prototype.doSeries = function (obj, iterator, callback) {
  var keys = Object.keys(obj)
    , done = callback || function () {}
    , count = 0;
  
  if (!keys.length)
    return done();
  
  var iterate = function () {
    var key = keys[count];
    
    var cb = function () {
      if (++count === keys.length) {
        done();
      } else {
        if (obj[key].options.delay > 0) {
          setTimeout(function () {
            iterate();
          }, obj[key].options.delay);
        } else {
          iterate();
        }
      }
    };
    
    iterator.call(this, obj[key], key, obj, cb);
  };
  
  iterate();
};

Suite.prototype.run = function () {
  var self = this
    , results = {}
    , start = new Date()
    , heapStart = process.memoryUsage()
  
  this.emit('start');
  
  this.doSeries(this.tests, function (test, index, list, cb) {
    self.emit('benchStart', index, test.options);
    
    test.run(self.options.iterations, function (stats) {
      self.emit('benchEnd', index, stats);
      results[index] = stats
      cb();
    })
  }, function (err) {
    var elapsed = new Date() - start
      , heapEnd = process.memoryUsage();
    
    var statistics = {
      tests: Object.keys(self.tests).length,
      elapsed: elapsed,
      memory: {
        start: heapStart,
        end: heapEnd
      },
      results: results
    };
    
    self.emit('end', statistics);
  });
};