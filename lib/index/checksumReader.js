const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const util = require('util');

const CHECKSUM_SIZE = 20;

class ChecksumReader {
  constructor({ fileDescriptor }) {
    assert.equal(typeof fileDescriptor, 'number');
    this.fileDescriptor = fileDescriptor;
    this.hash = crypto.createHash('sha1');
  }

  async reading({ size }) {
    assert.equal(typeof size, 'number');
    assert(size > 0);
    const data = Buffer.alloc(size);
    const fd = this.fileDescriptor;
    const offset = 0;
    const length = size;
    const position = null; // Note: read from the current file position
    const { bytesRead } = await util.promisify(fs.read)(
      fd,
      data,
      offset,
      length,
      position
    );
    if (bytesRead !== size) {
      throw new EndOfFile('Unexpected end-of-file while reading index');
    }
    assert.equal(data.length, size);
    this.hash.update(data);
    return { data };
  }

  async verifyingChecksum() {
    const checksum = Buffer.alloc(CHECKSUM_SIZE);
    const fd = this.fileDescriptor;
    const offset = 0;
    const length = CHECKSUM_SIZE;
    const position = null; // Note: read from the current file position
    await util.promisify(fs.read)(fd, checksum, offset, length, position);
    const calculatedChecksum = this.hash.digest();
    if (!checksum.equals(calculatedChecksum)) {
      throw Error('Checksum does not match value stored on disk');
    }
  }
}

class EndOfFile extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, EndOfFile);
  }
}

module.exports = {
  ChecksumReader,
  EndOfFile,
};
