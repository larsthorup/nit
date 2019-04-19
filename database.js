const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const zlib = require('zlib');

const { Blob } = require('./blob');
const { Commit } = require('./commit');
const { Tree } = require('./tree');

const writingFile = util.promisify(fs.writeFile);

class Database {
  constructor({ dbPath }) {
    this.dbPath = dbPath;
  }

  async storing({ object }) {
    assert(
      object instanceof Blob ||
        object instanceof Tree ||
        object instanceof Commit
    );
    assert(object.data instanceof Buffer);
    const content = Buffer.concat([
      Buffer.from(`${object.type} ${object.data.length}`, 'ascii'),
      Buffer.from([0]),
      object.data,
    ]);
    // console.log(content);
    const hash = crypto.createHash('sha1');
    hash.update(content);
    object.oid = hash.digest('hex'); // ToDo: move to Object constructors?
    // console.log(object.oid);
    return this.writing({ oid: object.oid, content });
  }

  async writing({ oid, content }) {
    assert.equal(typeof oid, 'string');
    assert.equal(oid.length, 40);
    assert(content instanceof Buffer);
    const dirName = oid.substr(0, 2);
    const dirPath = path.join(this.dbPath, dirName);
    const objectPath = path.join(dirPath, oid.substr(2));
    if (fs.existsSync(objectPath)) {
      return; // Note: object already exists, no need to write it
    }
    fs.mkdirSync(dirPath, { recursive: true });
    let tempDirPath;
    try {
      const tempDirPath = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
      // console.log(tempDirPath);
      const tempFilePath = path.join(tempDirPath, 'object.nit');
      // console.log(objectPath);
      const compressedContent = zlib.deflateSync(content);
      await writingFile(tempFilePath, compressedContent);
      fs.renameSync(tempFilePath, objectPath); // Note: atomicly establish the file in object storer
    } finally {
      if (tempDirPath) {
        fs.rmdirSync(tempDirPath);
      }
    }
  }
}

module.exports = {
  Database,
};
