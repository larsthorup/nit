const assert = require('assert');

function isSorted(array, compare) {
  assert(Array.isArray(array));
  assert.equal(typeof compare, 'function');
  const isLargerThanPrevious = (e, i) => {
    if (i === 0) {
      return true;
    } else {
      if (compare(array[i - 1], e) === -1) {
        return true;
      } else {
        return false;
      }
    }
  };
  return array.every(isLargerThanPrevious);
}

module.exports = {
  isSorted,
};
