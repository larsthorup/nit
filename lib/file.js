// Note: The class File encapsulates a file descriptor and the "fs" Node.js module

const assert = require('assert');
const fs = require('fs');
const util = require('util');

const { Path } = require('./path');

class File {
  constructor(fd) {
    this.fd = fd;
  }

  static open({ flags = 'r', path }) {
    assert.equal(typeof flags, 'string');
    assert(path instanceof Path);
    const fd = fs.openSync(path.value, flags);
    return new File(fd);
  }

  static rename({ fromPath, toPath }) {
    assert(fromPath instanceof Path);
    assert(toPath instanceof Path);
    fs.renameSync(fromPath.value, toPath.value);
  }

  static unlink({ path }) {
    assert(path instanceof Path);
    fs.unlinkSync(path.value);
  }

  close() {
    fs.closeSync(this.fd);
  }

  async readingBuffer({ size }) {
    const data = Buffer.alloc(size);
    const offset = 0; // Note: write to start of buffer
    const position = null; // Note: read from the current file position
    const { bytesRead } = await util.promisify(fs.read)(
      this.fd,
      data,
      offset,
      size,
      position
    );
    return { bytesRead, data };
  }

  async writingBuffer({ buffer }) {
    assert(buffer instanceof Buffer);
    return util.promisify(fs.write)(this.fd, buffer);
  }

  async writingString({ encoding, string }) {
    assert.equal(typeof encoding, 'string');
    assert.equal(typeof string, 'string');
    return util.promisify(fs.write)(this.fd, string, encoding);
  }
}

module.exports = {
  File,
};
