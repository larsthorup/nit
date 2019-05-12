// Note: path to file system entity, wrapper around native path module

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { Name } = require('./name');

class Path {
  static fromName(name) {
    assert(name instanceof Name);
    return new Path(name.value);
  }

  constructor(value) {
    assert.equal(typeof value, 'string');
    this.value = value;
  }

  exists() {
    return fs.existsSync(this.value);
  }

  join(otherPath) {
    assert(otherPath instanceof Path);
    return new Path(path.join(this.value, otherPath.value));
  }
}

module.exports = {
  Path,
};
