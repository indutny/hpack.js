var assert = require('assert');
var hpack = require('../');

describe('hpack/decoder', function() {
  var decoder;

  beforeEach(function() {
    decoder = hpack.decoder.create();
  });

  describe('bit', function() {
    it('should decode number bit-by-bit', function() {
      decoder.push([ 0b11101010, 0b10101111 ]);
      var out = '';
      for (var i = 0; i < 16; i++)
        out += decoder.decodeBit();
      assert.equal(out, '11101010' + '10101111');
    });
  });

  describe('integer', function() {
    it('should decode 10 in prefix-5 (C.1.1)', function() {
      decoder.push([ 0b11101010 ]);
      decoder.skipBits(3);
      assert.equal(decoder.decodeInt(), 10);
    });

    it('should decode 1337 in prefix-5 (C.1.2)', function() {
      decoder.push([ 0b11111111, 0b10011010, 0b00001010 ]);
      decoder.skipBits(3);
      assert.equal(decoder.decodeInt(), 1337);
    });

    it('should decode 42 at octect boundary (C.1.3)', function() {
      decoder.push([ 0b00101010 ]);
      assert.equal(decoder.decodeInt(8), 42);
    });

    it('should throw on empty input', function() {
      assert.throws(function() {
        decoder.decodeInt();
      });
    });

    it('should throw on incomplete int', function() {
      decoder.push([ 0b11111111, 0b10011010 ]);
      decoder.skipBits(3);
      assert.throws(function() {
        decoder.decodeInt();
      });
    });

    it('should throw on overflowing int', function() {
      decoder.push([
        0b11111111,
        0b10011010,
        0b10011010,
        0b10011010,
        0b10011010,
        0b10011010
      ]);
      decoder.skipBits(3);
      assert.throws(function() {
        decoder.decodeInt();
      });
    });
  });

  describe('string', function() {
    it('should decode literal from (C.2.1)', function() {
      decoder.push([ 0x0a ]);
      decoder.push(new Buffer('custom-key'));

      assert.equal(decoder.decodeStr().toString(), 'custom-key');
    });
  });
});
