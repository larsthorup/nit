const assert = require('assert');

class Entry {
  constructor({ name, oid }) {
    assert.equal(typeof name, 'string');
    assert.equal(typeof oid, 'string');
    assert.equal(oid.length, 40);
    this.name = name;
    this.oid = oid;
  }
}

module.exports = {
  Entry,
};
