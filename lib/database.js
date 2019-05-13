const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const util = require('util');
const zlib = require('zlib');

const { Blob } = require('./database/blob');
const { Commit } = require('./database/commit');
const { Name } = require('./name');
const { Path } = require('./path');
const { Tree } = require('./database/tree');

const writingFile = util.promisify(fs.writeFile);

class Database {
  constructor({ path }) {
    this.path = path;
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
    const dirPath = this.path.joinName(new Name(dirName));
    const objectPath = dirPath.joinName(new Name(oid.substr(2)));
    if (objectPath.exists()) {
      return; // Note: object already exists, no need to write it
    }
    fs.mkdirSync(dirPath.value, { recursive: true });
    let tempDirPath;
    try {
      const tempDirPath = Path.mkTempDir();
      // console.log(tempDirPath);
      const tempFilePath = tempDirPath.joinName(new Name('object.nit'));
      // console.log(objectPath);
      const compressedContent = zlib.deflateSync(content);
      await writingFile(tempFilePath.value, compressedContent);
      fs.renameSync(tempFilePath.value, objectPath.value); // Note: atomicly establish the file in object storer
    } finally {
      if (tempDirPath) {
        fs.rmdirSync(tempDirPath.value);
      }
    }
  }
}

module.exports = {
  Database,
};
