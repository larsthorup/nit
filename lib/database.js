const assert = require('assert').strict;
const fs = require('fs');
const util = require('util');
const zlib = require('zlib');

const { Blob } = require('./database/blob');
const { Commit } = require('./database/commit');
const { File } = require('./file');
const { Name } = require('./name');
const { Oid } = require('./oid');
const { Tree } = require('./database/tree');

const writingFile = util.promisify(fs.writeFile);

class Database {
  constructor({ path }) {
    this.path = path;
  }

  static hash({ object }) {
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
    const oid = Oid.hash(content);
    return { content, oid };
  }

  async storing({ object }) {
    const { content, oid } = Database.hash({ object });
    object.oid = oid;
    return this.writing({ oid, content });
  }

  async writing({ oid, content }) {
    assert(oid instanceof Oid);
    assert(content instanceof Buffer);
    const dirName = oid.value.substr(0, 2);
    const dirPath = this.path.joinName(new Name(dirName));
    const objectPath = dirPath.joinName(new Name(oid.value.substr(2)));
    if (objectPath.exists()) {
      return; // Note: object already exists, no need to write it
    }
    fs.mkdirSync(dirPath.value, { recursive: true });
    let tempDirPath;
    try {
      const { path: tempDirPath } = File.createTempDir();
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
