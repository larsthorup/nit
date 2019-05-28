const assert = require('assert').strict;
const crypto = require('crypto');
const fs = require('fs');

const { ChecksumFile } = require('./index/checksumFile');
const { Entry, ENTRY_BLOCK_SIZE } = require('./index/entry');
const { File } = require('./file');
const { Lockfile } = require('./lockfile');
const { Name } = require('./name');
const { Oid } = require('./oid');
const { Path } = require('./path');

const ENTRY_MIN_SIZE = 64;
const HEADER_SIZE = 12;
const SIGNATURE = 'DIRC';
const VERSION = 2;

function bufferFromInt32(number) {
  assert(typeof number, 'number');
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(number);
  return buffer;
}

function int32FromBuffer(buffer) {
  assert(buffer instanceof Buffer);
  return buffer.readInt32BE();
}

class Index {
  constructor({ path }) {
    assert(path instanceof Path);
    this.path = path;
    this.clear();
  }

  clear() {
    this.entryByName = {};
    this.entryNameSetByParentName = {};
    this.hasChanged = false;
  }

  add({ name, oid, stat }) {
    assert(name instanceof Name);
    assert(oid instanceof Oid);
    assert(stat instanceof fs.Stats);
    const entry = Entry.fromFile({ name, oid, stat });
    this.discardConflicts({ entry });
    this.storeEntry({ entry });
    this.hasChanged = true;
  }

  discardConflicts({ entry }) {
    // Note: none of the parent directories of the entry can be in the index
    for (const name of entry.name.getParentList()) {
      this.removeEntry({ name });
    }
    // Note: none of the child entries of the entry can be in the index
    const parentName = entry.name;
    const entryNameSet = this.entryNameSetByParentName[parentName.value] || [];
    for (const value of entryNameSet) {
      const name = new Name(value);
      this.removeEntry({ name });
    }
  }

  storeEntry({ entry }) {
    assert(entry instanceof Entry);
    // console.log(`"${entry.name.value}"`);
    this.entryByName[entry.name.value] = entry;
    for (const parentName of entry.name.getParentList()) {
      const object = this.entryNameSetByParentName,
        key = parentName.value;
      const entryNameSet = object[key] || (object[key] = new Set());
      entryNameSet.add(entry.name.value);
    }
  }

  removeEntry({ name }) {
    if (this.entryByName[name.value]) {
      delete this.entryByName[name.value];
      for (const parentName of name.getParentList()) {
        const entryNameSet = this.entryNameSetByParentName[parentName.value];
        if (!entryNameSet) {
          throw new Error(
            `Missing entryNameSetByParentName[${parentName.value}]`
          );
        }
        entryNameSet.delete(name.value);
        if (entryNameSet.size === 0) {
          delete this.entryNameSetByParentName[parentName.value];
        }
      }
    }
  }

  async updating(block) {
    await Lockfile.tryHolding({ path: this.path }, async lockfile => {
      await this.loading();
      await block();
      if (this.hasChanged) {
        await this.writing({ lockfile });
        this.hasChanged = false;
      } else {
        lockfile.rollback();
      }
    });
  }

  async loading() {
    this.clear();
    const { file } = await this.opening();
    if (file) {
      const reader = new ChecksumFile({ file });
      const { entryCount } = await this.readingHeader({ reader });
      await this.readingEntryList({ entryCount, reader });
      await reader.verifyingChecksum();
      file.close();
    }
  }

  async readingHeader({ reader }) {
    const { data } = await reader.reading({ size: HEADER_SIZE });
    const signature = data.slice(0, 4).toString('ascii');
    if (signature !== SIGNATURE) {
      throw new Error(
        `Signature: expected "${SIGNATURE}" but found "${signature}"`
      );
    }
    const version = int32FromBuffer(data.slice(4, 8));
    if (version !== VERSION) {
      throw new Error(`Version: expected "${VERSION}" but found "${version}"`);
    }
    const entryCount = int32FromBuffer(data.slice(8, 12));
    return { entryCount };
  }

  async readingEntryList({ entryCount, reader }) {
    for (let i = 0; i < entryCount; ++i) {
      let { data } = await reader.reading({ size: ENTRY_MIN_SIZE });
      while (data[data.length - 1] !== 0) {
        const { data: moreData } = await reader.reading({
          size: ENTRY_BLOCK_SIZE,
        });
        data = Buffer.concat([data, moreData]);
      }
      const entry = Entry.decode({ data });
      this.storeEntry({ entry });
    }
  }

  async opening() {
    try {
      const file = File.open({ path: this.path });
      return { file };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { file: null };
      } else {
        throw error;
      }
    }
  }

  async writing({ lockfile }) {
    const hash = crypto.createHash('sha1');
    const entryList = this.getEntryList();
    const header = Buffer.concat([
      Buffer.from(SIGNATURE, 'ascii'),
      bufferFromInt32(VERSION),
      bufferFromInt32(entryList.length),
    ]);
    await lockfile.writingBuffer(header);
    hash.update(header);
    for (const entry of entryList) {
      await lockfile.writingBuffer(entry.data);
      hash.update(entry.data);
    }
    const calculatedChecksum = hash.digest();
    await lockfile.writingBuffer(calculatedChecksum);
  }

  getEntryList() {
    const nameList = Object.keys(this.entryByName).sort();
    return nameList.map(name => this.entryByName[name]);
  }

  isTracked({ name }) {
    return this.entryByName.hasOwnProperty(name.value);
  }
}

module.exports = {
  Index,
};
