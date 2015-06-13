var hpack = require('../hpack');
var utils = hpack.utils;
var encoder = hpack.encoder;
var table = hpack.table;
var assert = utils.assert;

var inherits = require('inherits');
var Duplex = require('readable-stream').Duplex;

function Compressor(options) {
  Duplex.call(this, {
    writableObjectMode: true
  });

  this._encoder = null;
  this._table = table.create(options.table);
}
inherits(Compressor, Duplex);
module.exports = Compressor;

Compressor.create = function create(options) {
  return new Compressor(options);
};

Compressor.prototype._read = function _read() {
  // We only push!
};

Compressor.prototype._write = function _write(data, enc, cb) {
  assert(Array.isArray(data), 'Compressor.write() expects list of headers');

  this._encoder = encoder.create();
  for (var i = 0; i < data.length; i++)
    this._encodeHeader(data[i]);

  var data = this._encoder.render();
  this._encoder = null;

  cb(null);
  this.push(data);
};

Compressor.prototype._encode = function _encode(header) {
  if (header.neverIndex) {
    var index = 0;
    var neverIndex = 1;
    var isIndexed = 0;
    var isIncremental = 0;
  } else {
    var index = this._table.reverseLookup(header.name, header.value);
    var isIndexed = index > 0;
    var isIncremental = 1;
    var neverIndex = 0;
  }

  this._encoder.encodeBit(isIndexed);
  if (isIndexed) {
    this._encoder.encodeInt(index);
    return;
  }

  this._encoder.encodeBit(isIncremental);
  if (isIncremental) {
    this._table.add(header.name, header.value);
  } else {
    // Update = false
    this._encoder.encodeBit(0);
    this._encoder.encodeBit(neverIndex);
  }

  // index is negative for `name`-only headers
  this._encoder.encodeInt(-index);
  if (index === 0)
    this._encoder.encodeStr(utils.toArray(header.name), true);
  this._encoder.encodeStr(utils.toArray(header.value), true);
};
