const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('util');

const writing = util.promisify(fs.write);

class Lockfile {
  constructor({ filePath }) {
    assert.equal(typeof filePath, 'string'); // ToDo: type Path
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
  }

  lock() {
    try {
      if (!this.lockfileDescriptor) {
        const flags = 'wx+'; // Create file for reading and writing; fails if the path exists
        this.lockfileDescriptor = fs.openSync(this.lockPath, flags);
      }
      return true;
    } catch (error) {
      switch (error.code) {
        case 'EACCES':
          throw new NoPermission(error.message);
        case 'EEXIST':
          return false;
        case 'ENOENT':
          throw new MissingParent(error.message);
        default:
          throw error;
      }
    }
  }

  async writing(string) {
    assert.equal(typeof string, 'string');
    this.ensureLocked();
    await writing(this.lockfileDescriptor, string, 'utf8');
  }

  async writingBinary(buffer) {
    assert(buffer instanceof Buffer);
    this.ensureLocked();
    await writing(this.lockfileDescriptor, buffer);
  }

  commit() {
    this.ensureLocked();
    fs.closeSync(this.lockfileDescriptor);
    fs.renameSync(this.lockPath, this.filePath); // Note: atomicly replace the file
    delete this.lockfileDescriptor;
  }

  ensureLocked() {
    if (!this.lockfileDescriptor) {
      throw new StaleLock(`Not holding lock on file: ${this.lockPath}`);
    }
  }

  static async tryHolding(options, block) {
    assert.equal(typeof options, 'object');
    assert.equal(typeof block, 'function');
    const lockfile = new Lockfile(options);
    const wasLocked = lockfile.lock();
    await block(lockfile);
    lockfile.commit();
    return { wasLocked };
  }
}

class MissingParent extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, MissingParent);
  }
}

class NoPermission extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, NoPermission);
  }
}

class StaleLock extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, StaleLock);
  }
}

module.exports = {
  Lockfile,
  MissingParent,
  NoPermission,
  StaleLock,
};
