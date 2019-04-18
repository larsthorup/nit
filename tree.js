const assert = require('assert');

const FILE_MODE = '100644';

function encodeEntry(entry) {
  assert.equal(FILE_MODE.length, 6);
  assert.equal(typeof entry.name, 'string');
  assert.equal(typeof entry.oid, 'string');
  assert.equal(entry.oid.length, 40);
  return Buffer.concat([
    Buffer.from(FILE_MODE),
    Buffer.from(' '),
    Buffer.from(entry.name), // Note: is it okay with the default of utf8?
    Buffer.from([0]),
    Buffer.from(entry.oid, 'hex'),
  ]);
}

class Tree {
  constructor({ entryList }) {
    assert(Array.isArray(entryList));
    this.entryList = entryList;
    this.encode();
  }

  get type() {
    return 'tree';
  }

  encode() {
    const byName = (a, b) => (a.name < b.name ? -1 : 1);
    this.data = Buffer.concat(this.entryList.sort(byName).map(encodeEntry));
  }
}

module.exports = {
  Tree,
};
