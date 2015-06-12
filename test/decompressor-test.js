var assert = require('assert');
var hpack = require('../');

describe('hpack/decompressor', function() {
  var decomp;

  beforeEach(function() {
    decomp = hpack.decompressor.create({
      maxTableSize: 1024
    });
  });

  describe('indexed field', function() {
    it('should fail on 0-index', function(cb) {
      decomp.on('error', function(err) {
        assert(/zero index/i.test(err.message), err.message);
        cb();
      });
      decomp.write(new Buffer([ 0b10000000 ]));
    });

    it('should fetch entry from static table', function() {
      decomp.write(new Buffer([ 0b10000000 | 2 ]));
      var field = decomp.read();
      assert.equal(field[0], ':method');
      assert.equal(field[1], 'GET');
    });

    it('should fetch entry from the end of the static table', function() {
      decomp.write(new Buffer([ 0b10000000 | 61 ]));
      var field = decomp.read();
      assert.equal(field[0], 'www-authenticate');
      assert.equal(field[1], '');
    });

    it('should fail on OOB-index', function(cb) {
      decomp.on('error', function(err) {
        assert(/field oob/i.test(err.message), err.message);
        cb();
      });
      decomp.write(new Buffer([ 0b11000000 ]));
    });
  });

  describe('indexed field', function() {
    it('should fail on 0-index', function(cb) {
      decomp.on('error', function(err) {
        assert(/zero index/i.test(err.message), err.message);
        cb();
      });
      decomp.write(new Buffer([ 0b10000000 ]));
    });

    it('should fetch entry from static table', function() {
      decomp.write(new Buffer([ 0b10000000 | 2 ]));
      var field = decomp.read();
      assert.equal(field[0], ':method');
      assert.equal(field[1], 'GET');
    });

    it('should fetch entry from the end of the static table', function() {
      decomp.write(new Buffer([ 0b10000000 | 61 ]));
      var field = decomp.read();
      assert.equal(field[0], 'www-authenticate');
      assert.equal(field[1], '');
    });

    it('should fail on OOB-index', function(cb) {
      decomp.on('error', function(err) {
        assert(/field oob/i.test(err.message), err.message);
        cb();
      });
      decomp.write(new Buffer([ 0b11000000 ]));
    });
  });

  describe('literal field', function() {
    it('should lookup name in the table (incremental)', function() {
      var value = new Buffer('localhost');
      var header = new Buffer([
        0b01000000 | 38,  // 38th element from static table
        value.length
      ]);
      decomp.write(Buffer.concat([ header, value ]));

      var field = decomp.read();
      assert.equal(field[0], 'host');
      assert.equal(field[1], 'localhost');

      decomp.write(new Buffer([ 0b10000000 | 62 ]));
      var field = decomp.read();
      assert.equal(field[0], 'host');
      assert.equal(field[1], 'localhost');
    });

    it('should lookup name in the table (not-incremental)', function(cb) {
      var value = new Buffer('localhost');
      var header = new Buffer([
        0b00001111,
        0b00000000 | 23,
        value.length
      ]);
      decomp.write(Buffer.concat([ header, value ]));

      var field = decomp.read();
      assert.equal(field[0], 'host');
      assert.equal(field[1], 'localhost');

      decomp.on('error', function(err) {
        assert(/field oob/i.test(err.message), err.message);
        cb();
      });
      decomp.write(new Buffer([ 0b10000000 | 62 ]));
    });
  });
});
