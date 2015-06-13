var hpack = require('../hpack');
var utils = hpack.utils;
var assert = utils.assert;

function Table(options) {
  this['static'] = hpack['static-table'],
  this.dynamic = [];
  this.size = 0;
  this.maxSize = 0;
  this.length = this['static'].length;
  this.protocolMaxSize = options.maxSize;
  this.maxSize = this.protocolMaxSize;
}
module.exports = Table;

Table.create = function create(options) {
  return new Table(options);
};

Table.prototype.lookup = function lookup(index) {
  assert(index !== 0, 'Zero indexed field');
  assert(index <= this.length, 'Indexed field OOB')

  if (index <= this['static'].length)
    return this['static'][index - 1];
  else
    return this.dynamic[this.length - index];
};

Table.prototype.add = function add(name, value, nameSize, valueSize) {
  var totalSize = nameSize + valueSize + 32;

  this.dynamic.push({
    name: name,
    value: value,
    nameSize: nameSize,
    totalSize: totalSize
  });
  this.size += totalSize;
  this.length++;

  this.evict();
};

Table.prototype.evict = function evict() {
  while (this.size > this.maxSize) {
    var entry = this.dynamic.shift();
    this.size -= entry.totalSize;
    this.length--;
  }
  assert(this.size >= 0, 'Table size sanity check failed');
};

Table.prototype.updateSize = function updateSize(size) {
  assert(size <= this.protocolMaxSize, 'Table size bigger than maximum');
  this.maxSize = size;
  this.evict();
};
