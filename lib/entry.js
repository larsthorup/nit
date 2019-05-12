const assert = require('assert');
const fs = require('fs');

const DIRECTORY_MODE = '40000';
const EXECUTABLE_MODE = '100755';
const REGULAR_MODE = '100644';

class Entry {
  constructor({ name, oid, stat }) {
    assert.equal(typeof name, 'string'); // ToDo: Name
    assert.equal(typeof oid, 'string');
    assert.equal(oid.length, 40);
    assert(stat instanceof fs.Stats);
    this.name = name;
    this.oid = oid;
    this.stat = stat;
  }

  get mode() {
    const isExecutable = false; // Note: eventually deduce this from this.stat
    return isExecutable ? EXECUTABLE_MODE : REGULAR_MODE;
  }
}

module.exports = {
  DIRECTORY_MODE,
  Entry,
};
