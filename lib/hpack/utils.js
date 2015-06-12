exports.assert = function assert(cond, text) {
  if (!cond)
    throw new Error(text);
};

exports.stringify = function stringify(arr) {
  var res = '';
  for (var i = 0; i < arr.length; i++)
    res += String.fromCharCode(arr[i]);
  return res;
};
