var hpack = require('../hpack');
var utils = hpack.utils;
var decoder = hpack.decoder;
var assert = utils.assert;

var inherits = require('inherits');
var Duplex = require('readable-stream').Duplex;

function Decompressor(options) {
  Duplex.call(this, {
    readableObjectMode: true
  });

  this._decoder = decoder.create();
  this._table = {
    'static': hpack['static-table'],
    dynamic: [],
    length: 0,
    size: 0,
    maxSize: 0,
    protocolMaxSize: options.maxTableSize
  };
  this._table.length += this._table['static'].length;
  this._table.maxSize = this._table.protocolMaxSize;
}
inherits(Decompressor, Duplex);
module.exports = Decompressor;

Decompressor.create = function create(options) {
  return new Decompressor(options);
};

Decompressor.prototype._read = function _read() {
  // We only push!
};

Decompressor.prototype._write = function _write(data, enc, cb) {
  this._decoder.push(data);

  while (!this._decoder.isEmpty()) {
    try {
      this._execute();
    } catch (err) {
      return cb(err);
    }
  }
  cb(null);
};

Decompressor.prototype._execute = function() {
  var isIndexed = this._decoder.decodeBit();
  if (isIndexed)
    return this._processIndexed();

  var isIncremental = this._decoder.decodeBit();
  var neverIndex = 0;
  if (!isIncremental) {
    var isUpdate = this._decoder.decodeBit();
    if (isUpdate)
      return this._processUpdate();

    neverIndex = this._decoder.decodeBit();
  }

  this._processLiteral(isIncremental, neverIndex);
};

Decompressor.prototype._tableLookup = function _tableLookup(index) {
  var table = this._table;
  assert(index !== 0, 'Zero indexed field');
  assert(index <= table.length, 'Indexed field OOB')

  if (index <= table['static'].length)
    return table['static'][index - 1];
  else
    return table.dynamic[table.length - index];
};

Decompressor.prototype._processIndexed = function _processIndexed() {
  var index = this._decoder.decodeInt();

  this.push(this._tableLookup(index));
};

Decompressor.prototype._addToTable = function _addToTable(name,
                                                          value,
                                                          nameSize,
                                                          valueSize) {
  var totalSize = nameSize + valueSize + 32;
  var table = this._table;

  table.dynamic.push([ name, value, nameSize, totalSize ]);
  table.size += totalSize;
  table.length++;

  this._evict();
};

Decompressor.prototype._evict = function _evict() {
  var table = this._table;
  while (table.size > table.maxSize) {
    var entry = table.dynamic.shift();
    table.size -= entry[3];
    table.length--;
  }
  assert(table.size >= 0, 'Table size sanity check failed');
};

Decompressor.prototype._processLiteral = function _processLiteral(inc, never) {
  var index = this._decoder.decodeInt();

  var name;
  var nameSize;

  // Literal header-name too
  if (index === 0) {
    name = this._decoder.decodeStr();
    nameSize = name.length;
    name = utils.stringify(name);
  } else {
    var lookup = this._tableLookup(index);
    nameSize = lookup[2];
    name = lookup[0];
  }

  var value = this._decoder.decodeStr();
  var valueSize = value.length;
  value = utils.stringify(value);

  if (inc)
    this._addToTable(name, value, nameSize, valueSize);

  this.push([ name, value ]);
};

Decompressor.prototype._processUpdate = function _processUpdate() {
  var size = this._decoder.decodeInt();
  assert(size <= this._table.protocolMaxSize, 'Table size bigger than maximum');
  this._table.maxSize = size;
  this._evict();
};
