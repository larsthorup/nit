const assert = require('assert').strict;
const fs = require('fs');
const zlib = require('zlib');

const { Blob } = require('./database/blob');
const { Commit } = require('./database/commit');
const { File } = require('./file');
const { Name } = require('./name');
const { Oid } = require('./oid');
const { Scanner } = require('./scanner');
const { Tree } = require('./database/tree');

const CLASS = {
  blob: Blob,
  commit: Commit,
  tree: Tree,
};

class Database {
  constructor({ path }) {
    this.path = path;
    this.objectById = {};
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

  getPath({ oid }) {
    const dirName = oid.value.substr(0, 2);
    const dirPath = this.path.joinName(new Name(dirName));
    const objectPath = dirPath.joinName(new Name(oid.value.substr(2)));
    return { dirName, dirPath, objectPath };
  }

  async writing({ oid, content }) {
    assert(oid instanceof Oid);
    assert(content instanceof Buffer);
    const { dirPath, objectPath } = this.getPath({ oid });
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
      await File.writingFile({
        path: tempFilePath,
        content: compressedContent,
      });
      fs.renameSync(tempFilePath.value, objectPath.value); // Note: atomicly establish the file in object storer
    } finally {
      if (tempDirPath) {
        fs.rmdirSync(tempDirPath.value);
      }
    }
  }

  async loadingCommit({ oid }) {
    const { object } = await this.loadingObject({ oid, type: Commit });
    return {
      commit: object,
    };
  }

  async loadingTree({ oid }) {
    const { object } = await this.loadingObject({ oid, type: Tree });
    return {
      tree: object,
    };
  }

  async loadingObject({ oid, type }) {
    let object = this.objectById[oid.value];
    if (!object) {
      ({ object } = await this.readingObject({ oid }));
    }
    assert(object instanceof type);
    return { object };
  }

  async readingObject({ oid }) {
    const { objectPath } = this.getPath({ oid });
    const { content: compressedContent } = await File.readingFile({
      path: objectPath,
    });
    const data = zlib.inflateSync(compressedContent);
    const scanner = new Scanner({ data });
    const type = scanner.readString({ beforeString: ' ', encoding: 'ascii' });
    /*const size = */ scanner.readNumber({
      beforeString: '\0',
      encoding: 'ascii',
    });
    const object = CLASS[type].parse({ oid, scanner });
    return { object };
  }
}

module.exports = {
  Database,
};
