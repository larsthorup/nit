const assert = require('assert');

const { File } = require('./file');
const { Path } = require('./path');

class Lockfile {
  constructor({ path }) {
    assert(path instanceof Path);
    this.path = path;
    this.lockPath = new Path(`${path.value}.lock`);
  }

  lock() {
    try {
      if (!this.file) {
        const flags = 'wx+'; // Create file for reading and writing; fails if the path exists
        this.file = File.open({ flags, path: this.lockPath });
      }
      return true;
    } catch (error) {
      switch (error.code) {
        case 'EACCES':
          throw new NoPermission(error.message);
        case 'EEXIST':
          throw new LockDenied(
            `Unable to create "${this.lockPath.value}": File exists.`
          );
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
    await this.file.writingString({ encoding: 'utf8', string });
  }

  async writingBuffer(buffer) {
    assert(buffer instanceof Buffer);
    this.ensureLocked();
    await this.file.writingBuffer({ buffer });
  }

  commit() {
    this.ensureLocked();
    this.file.close();
    delete this.file;
    File.rename({ fromPath: this.lockPath, toPath: this.path }); // Note: atomicly replace the file
  }

  rollback() {
    this.ensureLocked();
    this.file.close();
    delete this.file;
    File.unlink({ path: this.lockPath });
  }

  ensureLocked() {
    if (!this.file) {
      throw new StaleLock(`Not holding lock on file: ${this.lockPath.value}`);
    }
  }

  static async tryHolding(options, block) {
    assert.equal(typeof options, 'object');
    assert.equal(typeof block, 'function');
    const lockfile = new Lockfile(options);
    lockfile.lock();
    await block(lockfile);
    lockfile.commit();
  }
}

class LockDenied extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, LockDenied);
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
  LockDenied,
  MissingParent,
  NoPermission,
  StaleLock,
};
