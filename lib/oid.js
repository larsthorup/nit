const assert = require('assert');

class Oid {
  constructor(value) {
    assert.equal(typeof value, 'string');
    assert.equal(value.length, 40);
    this.value = value;
  }
}

module.exports = {
  Oid,
};
