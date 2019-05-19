// Note extends class File with writing and verifying a checksum at the end of the file

const assert = require('assert');
const crypto = require('crypto');

const { File } = require('../file');

const CHECKSUM_SIZE = 20;

class ChecksumFile {
  constructor({ file }) {
    assert(file instanceof File);
    this.file = file;
    this.hash = crypto.createHash('sha1');
  }

  async reading({ size }) {
    assert.equal(typeof size, 'number');
    assert(size > 0);
    const { bytesRead, data } = await this.file.readingBuffer({ size });
    if (bytesRead !== size) {
      throw new EndOfFile('Unexpected end-of-file while reading index');
    }
    assert.equal(data.length, size);
    this.hash.update(data);
    return { data };
  }

  async verifyingChecksum() {
    const { data: checksum } = await this.file.readingBuffer({
      size: CHECKSUM_SIZE,
    });
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
  ChecksumFile,
  EndOfFile,
};
