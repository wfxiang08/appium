// Run with mocha by installing dev deps: npm install --dev
// more docs on writing tests with mocha can be found here:
// http://visionmedia.github.com/mocha/
/*global describe:true, it:true */
"use strict";

var should = require('should')
  , appium = require('../../appium')
  , path = require('path')
  , ios = require('../../ios');

describe('IOS', function() {
  // we'd like to test ios.proxy; mock instruments
  var inst = ios({});
      inst.instruments = {};
      inst.instruments.sendCommand = function(cmd, cb) {
        // let's pretend we've got some latency here.
        var to = Math.round(Math.random()*10);
        setTimeout(function() { cb([cmd, to]); }, to);
      };

  describe('#proxy()', function() {
    return it('should execute one command at a time keeping the seq right', function(done) {
      var intercept = []
        , iterations = 100
        , check = function(err, result) {
          intercept.push(result);
          if (intercept.length >= iterations) {
            for (var x=0; x < iterations; x++) {
              intercept[x][0].should.equal(x);
            }
            done();
          }
        };

      for (var i=0; i < iterations; i++) {
        inst.proxy(i, check);
      }
    });
  });
});

describe('Appium', function() {
  var intercept = []
    , logPath = path.resolve(__dirname, "../../../appium.log")
    , inst = appium({log: logPath, noSessionOverride: true });

  inst.registerConfig({ios: true});

  describe('#start', function() {
    return it('should queue up subsequent calls and execute them sequentially', function(done) {
      var doneYet = function(num) {
        intercept.push(num);
        if (intercept.length > 9) {
          for (var i=0; i < intercept.length; i++) {
            intercept[i].should.equal(i);
          }
          done();
        }
      };

      var loop = function(num) {
        if (num > 9)
          return;

        inst.start({app: "/path/to/fake.app", device: "mock_ios"}, function() {
          var n = num;
          setTimeout(function() {
            inst.stop(function() { doneYet(n); });
          }, Math.round(Math.random()*100));
          loop(++num);
        });
      };

      loop(0);
    });
  });
});

describe('Appium with clobber', function() {
  var logPath = path.resolve(__dirname, "../../../appium.log")
    , inst = appium({log: logPath, noSessionOverride: false });

  inst.registerConfig({mock_ios: true});

  describe('#start', function() {
    return it('should clobber existing sessions', function(done) {
      var numSessions = 9
        , dc = {app: "/path/to/fake.app", device: "mock_ios"};
      var loop = function(num) {
        if (num > numSessions) return;
        inst.start(dc, function() {
          var curSessId = inst.sessionId;
          var n = num;
          setTimeout(function() {
            var newSessId = inst.sessionId;
            if (n === numSessions) {
              curSessId.should.equal(newSessId);
              done();
            } else {
              curSessId.should.not.equal(newSessId);
            }
          }, Math.round(Math.random()*100));
          loop(++num);
        });
      };

      loop(0);
    });
  });
});
