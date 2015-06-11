var hpack = require('../hpack');
var utils = hpack.utils;
var huffman = hpack.huffman;
var assert = utils.assert;

var OffsetBuffer = require('obuf');

function Decoder() {
  this.buffer = new OffsetBuffer();
  this.bitOffset = 0;
}
module.exports = Decoder;

Decoder.create = function create() {
  return new Decoder();
};

Decoder.prototype.push = function push(chunk) {
  this.buffer.push(chunk);
};

Decoder.prototype.decodeBit = function decodeBit() {
  // Need at least one octet
  assert(this.buffer.has(1), 'Buffer too small for an int');

  var octet;
  var offset = this.bitOffset;

  if (++this.bitOffset === 8) {
    octet = this.buffer.readUInt8();
    this.bitOffset = 0;
  } else {
    octet = this.buffer.peekUInt8();
  }
  return (octet >>> (7 - offset)) & 1;
};

Decoder.prototype.skipBits = function skipBits(n) {
  this.bitOffset += n;
  this.buffer.skip(this.bitOffset >> 3);
  this.bitOffset &= 0x7;
};

Decoder.prototype.decodeInt = function decodeInt() {
  // Need at least one octet
  assert(this.buffer.has(1), 'Buffer too small for an int');

  var prefix = 8 - this.bitOffset;

  // We are going to end up octet-aligned
  this.bitOffset = 0;

  var max = (1 << prefix) - 1;
  var octet = this.buffer.readUInt8() & max;

  // Fast case - int fits into the prefix
  if (octet !== max)
    return octet;

  // TODO(indutny): what about > 32bit numbers?
  var res = 0;
  var isLast = false;
  var len = 0;
  do {
    octet = this.buffer.readUInt8();
    isLast = (octet & 0x80) === 0;

    res <<= 7;
    res |= octet & 0x7f;
    len++;
  } while (!isLast);
  assert(isLast, 'Incomplete data for multi-octet integer');
  assert(len <= 4, 'Integer does not fit into 32 bits');

  // Reverse bits
  res = (res >>> 21) |
        (((res >> 14) & 0x7f) << 7) |
        (((res >> 7) & 0x7f) << 14) |
        ((res & 0x7f) << 21);
  res >>= (4 - len) * 7;

  // Append prefix max
  res += max;

  return res;
};

Decoder.prototype.decodeStr = function decodeStr() {
  var isHuffman = this.decodeBit();
  var len = this.decodeInt();
  assert(this.buffer.has(len), 'Not enough octets for huffman encoding');

  if (!isHuffman)
    return this.buffer.take(len);

  var out = [];
  var root = huffman;
  var node = root;
  var off = 0;
  var leftover = 0;
  var bits = 8;
  for (var i = 0; i < len || leftover !== 0; i++) {
    assert(off < 16, 'Offset overflow');

    // Read the full octet at start, will reduce it later
    var octet;
    if (off >= 8) {
      octet = leftover;
      off &= 7;
      i--;
    } else if (i === len) {
      // Align most significant bit
      bits = off;
      octet = leftover;
      off = 0;
      i--;
    } else {
      octet = this.buffer.readUInt8();
      octet |= leftover << 8;
    }

    // There are at most two bytes in `octet` at this point
    leftover = octet & ((1 << off) - 1);
    octet >>= off;

    // EOS
    if (i === (len - 1) && (octet & (octet + 1)) === 0) {
      assert(bits < 8, '8 bits of EOS');
      break;
    }

    var huff;
    for (var nudge = 0; nudge < bits; nudge++) {
      // Note, this high bit is added to match the encoding length
      huff = node[(1 << (bits - nudge)) | (octet >> nudge)];
      if (huff !== -1)
        break;
    }
    assert(huff !== -1, 'Unknown key in a huffman encoding table');

    if (typeof huff === 'number') {
      out.push(huff);
      node = root;
    } else {
      node = huff;
    }

    leftover |= (octet & ((1 << nudge) - 1)) << off;

    off += nudge;
  }

  return out;
};
