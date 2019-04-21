const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('util');

const { Lockfile } = require('./lockfile');

const readingFile = util.promisify(fs.readFile);
const writingFile = util.promisify(fs.writeFile);

class Refs {
  constructor({ gitPath }) {
    assert.equal(typeof gitPath, 'string'); // ToDo: type Path
    this.gitPath = gitPath;
    this.headPath = path.join(gitPath, 'HEAD');
  }

  async readingHead() {
    const exists = fs.existsSync(this.headPath);
    const oid = exists ? await readingFile(this.headPath, 'utf8') : null;
    return { oid };
  }

  async updatingHead({ oid }) {
    assert.equal(typeof oid, 'string'); // ToDo: type Oid
    assert.equal(oid.length, 40);
    const { wasLocked } = await Lockfile.tryHolding(
      { filePath: this.headPath },
      async lockfile => {
        await lockfile.writing(`${oid}\n`);
      }
    );
    if (!wasLocked) {
      throw new LockDenied(`Could not acquire lock on file: ${this.headPath}`);
    }
  }
}

class LockDenied extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, LockDenied);
  }
}

module.exports = {
  LockDenied,
  Refs,
};
