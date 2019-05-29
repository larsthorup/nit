const assert = require('assert').strict;
const crypto = require('crypto');

class Oid {
  constructor(value) {
    assert.equal(typeof value, 'string');
    assert.equal(value.length, 40);
    this.value = value;
  }

  static hash(content) {
    const hash = crypto.createHash('sha1');
    hash.update(content);
    return new Oid(hash.digest('hex'));
  }

  equals(otherOid) {
    return this.value === otherOid.value;
  }
}

module.exports = {
  Oid,
};
