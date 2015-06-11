var hpack = require('../hpack');
var utils = hpack.utils;
var assert = utils.assert;

var OffsetBuffer = require('obuf');

function Decoder() {
  this.buffer = new OffsetBuffer();
}
module.exports = Decoder;

Decoder.create = function create() {
  return new Decoder();
};

Decoder.prototype.push = function push(chunk) {
  this.buffer.push(chunk);
};


Decoder.prototype.decodeInt = function decodeInt(prefix) {
  // Need at least one octet
  assert(this.buffer.has(1), 'Buffer too small for an int');

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
