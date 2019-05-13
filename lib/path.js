// Note: path to file system entity, wrapper around native path module

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { Name } = require('./name');

class Path {
  static fromName(name) {
    assert(name instanceof Name);
    return new Path(name.value);
  }

  static mkTempDir() {
    return new Path(fs.mkdtempSync(`${os.tmpdir()}${path.sep}`));
  }

  static resolve(relativePath) {
    assert.equal(typeof relativePath, 'string');
    return new Path(path.resolve(relativePath));
  }

  constructor(value) {
    assert.equal(typeof value, 'string');
    this.value = value;
  }

  exists() {
    return fs.existsSync(this.value);
  }

  isAbsolute() {
    return path.isAbsolute(this.value);
  }

  join(otherPath) {
    assert(otherPath instanceof Path);
    return new Path(path.join(this.value, otherPath.value));
  }

  joinName(name) {
    assert(name instanceof Name);
    return this.join(Path.fromName(name));
  }

  nameRelativeTo(otherPath) {
    const nativePath = path.relative(otherPath.value, this.value);
    const isWindows = process.platform === 'win32';
    const unixPath = isWindows ? nativePath.replace(/\\/g, '/') : nativePath;
    return new Name(unixPath);
  }
}

module.exports = {
  Path,
};
