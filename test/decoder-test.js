var assert = require('assert');
var hpack = require('../');

describe('hpack/decoder', function() {
  var decoder;

  beforeEach(function() {
    decoder = hpack.decoder.create();
  });

  describe('integer', function() {
    it('should decode 10 in prefix-5 (C1.1)', function() {
      assert.equal(decoder.decodeInt([ 0b11101010 ], 0, 5), 10);
    });

    it('should decode 1337 in prefix-5 (C1.2)', function() {
      assert.equal(decoder.decodeInt([
        0b11111111, 0b10011010, 0b00001010
      ], 0, 5), 1337);
    });

    it('should decode 42 at octect boundary (C1.3)', function() {
      assert.equal(decoder.decodeInt([ 0b00101010 ], 0, 8), 42);
    });

    it('should throw on empty input', function() {
      assert.throws(function() {
        decoder.decodeInt([ ], 0, 5);
      });
    });

    it('should throw on incomplete int', function() {
      assert.throws(function() {
        decoder.decodeInt([ 0b11111111, 0b10011010 ], 0, 5);
      });
    });

    it('should throw on overflowing int', function() {
      assert.throws(function() {
        decoder.decodeInt([
          0b11111111,
          0b10011010,
          0b10011010,
          0b10011010,
          0b10011010,
          0b10011010
        ], 0, 5);
      });
    });
  });
});
