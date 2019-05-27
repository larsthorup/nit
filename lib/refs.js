const assert = require('assert').strict;
const fs = require('fs');
const util = require('util');

const { Lockfile } = require('./lockfile');
const { Name } = require('./name');
const { Oid } = require('./oid');
const { Path } = require('./path');

const readingFile = util.promisify(fs.readFile);

class Refs {
  constructor({ gitPath }) {
    assert(gitPath instanceof Path);
    this.headPath = gitPath.joinName(new Name('HEAD'));
  }

  async readingHead() {
    const exists = fs.existsSync(this.headPath.value);
    const oid = exists
      ? new Oid(await readingFile(this.headPath.value, 'utf8'))
      : null;
    return { oid };
  }

  async updatingHead({ oid }) {
    assert(oid instanceof Oid);
    await Lockfile.tryHolding({ path: this.headPath }, async lockfile => {
      await lockfile.writing(`${oid.value}\n`);
    });
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
