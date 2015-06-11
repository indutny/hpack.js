exports.assert = function assert(cond, text) {
  if (!cond)
    throw new Error(text);
};
