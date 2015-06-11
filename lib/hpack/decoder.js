var hpack = require('../hpack');
var utils = hpack.utils;
var assert = utils.assert;

function Decoder() {
}
module.exports = Decoder;

Decoder.create = function create() {
  return new Decoder();
};

Decoder.prototype.decodeInt = function decodeInt(buf, off, prefix) {
  var octet;
  var max;

  // Need at least one octet
  assert(buf.length > off, 'Buffer too small for an int');

  max = (1 << prefix) - 1;
  octet = buf[off] & max;

  // Fast case - int fits into the prefix
  if (octet !== max)
    return octet;

  // TODO(indutny): what about > 32bit numbers?
  var res = 0;
  var isLast = false;
  var len = 0;
  for (var i = off + 1; i < buf.length; i++, len++) {
    octet = buf[i];
    isLast = (octet & 0x80) === 0;

    res <<= 7;
    res |= octet & 0x7f;
  }
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
