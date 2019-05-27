const assert = require('assert').strict;

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
          throw new NoPermissionError(error.message);
        case 'EEXIST':
          throw new LockDeniedError(
            `Unable to create "${this.lockPath.value}": File exists.`
          );
        case 'ENOENT':
          throw new MissingParentError(error.message);
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
      throw new StaleLockError(
        `Not holding lock on file: ${this.lockPath.value}`
      );
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

class LockDeniedError extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, LockDeniedError);
  }
}

class MissingParentError extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, MissingParentError);
  }
}

class NoPermissionError extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, NoPermissionError);
  }
}

class StaleLockError extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, StaleLockError);
  }
}

module.exports = {
  Lockfile,
  LockDenied: LockDeniedError,
  MissingParent: MissingParentError,
  NoPermission: NoPermissionError,
  StaleLock: StaleLockError,
};
