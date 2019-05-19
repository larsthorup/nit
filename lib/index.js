const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const { ChecksumFile } = require('./index/checksumFile');
const { File } = require('./file');
const { Lockfile } = require('./lockfile');
const { Name } = require('./name');
const { Oid } = require('./oid');
const { Path } = require('./path');

const ENTRY_BLOCK_SIZE = 8;
const ENTRY_MIN_SIZE = 64;
const EXECUTABLE_MODE = 0o100755;
const HEADER_SIZE = 12;
const MAX_PATH_SIZE = 0xfff;
const REGULAR_MODE = 0o100644;
const SIGNATURE = 'DIRC';
const VERSION = 2;

function bufferFromInt32(number) {
  assert(typeof number, 'number');
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(number);
  return buffer;
}

function bufferFromUInt16(number) {
  assert(typeof number, 'number');
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(number);
  return buffer;
}

function bufferFromUInt32(number) {
  assert(typeof number, 'number');
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(number);
  return buffer;
}

function int32FromBuffer(buffer) {
  assert(buffer instanceof Buffer);
  return buffer.readInt32BE();
}

function uint32FromBuffer(buffer) {
  assert(buffer instanceof Buffer);
  return buffer.readUInt32BE();
}

function uint16FromBuffer(buffer) {
  assert(buffer instanceof Buffer);
  return buffer.readUInt16BE();
}

function unixSecondsFromDate(date) {
  assert(date instanceof Date);
  return date.getTime() / 1000;
}

class IndexEntry {
  static fromFile({ name, oid, stat }) {
    assert(name instanceof Name);
    assert(oid instanceof Oid);
    assert(stat instanceof fs.Stats);
    const isExecutable = false; // Note: eventually deduce this from this.stat
    const entry = new IndexEntry();
    Object.assign(entry, {
      ctime: unixSecondsFromDate(stat.ctime),
      ctime_nsec: 0, // Note: currently not supporting nanoseconds
      mtime: unixSecondsFromDate(stat.mtime),
      mtime_nsec: 0, // Note: currently not supporting nanoseconds
      dev: stat.dev,
      ino: stat.ino,
      mode: isExecutable ? EXECUTABLE_MODE : REGULAR_MODE,
      uid: stat.uid,
      gid: stat.gid,
      size: stat.size,
      oid: oid,
      flags: Math.min(Buffer.from(name.value, 'utf8').length, MAX_PATH_SIZE),
      name,
    });
    entry.encode();
    return entry;
  }

  static decode({ data }) {
    const entry = new IndexEntry();
    entry.data = data;
    entry.ctime = uint32FromBuffer(data.slice(0, 4));
    entry.ctime_nsec = uint32FromBuffer(data.slice(4, 8));
    entry.mtime = uint32FromBuffer(data.slice(8, 12));
    entry.mtime_nsec = uint32FromBuffer(data.slice(12, 16));
    entry.dev = uint32FromBuffer(data.slice(16, 20));
    entry.ino = uint32FromBuffer(data.slice(20, 24));
    entry.mode = uint32FromBuffer(data.slice(24, 28));
    entry.uid = uint32FromBuffer(data.slice(28, 32));
    entry.gid = uint32FromBuffer(data.slice(32, 36));
    entry.size = uint32FromBuffer(data.slice(36, 40));
    entry.oid = new Oid(data.slice(40, 60).toString('hex'));
    entry.flags = uint16FromBuffer(data.slice(60, 62));
    entry.name = new Name(data.slice(62, data.indexOf(0, 62)).toString('utf8'));
    return entry;
  }

  encode() {
    const bufferList = [
      bufferFromUInt32(this.ctime),
      bufferFromUInt32(this.ctime_nsec),
      bufferFromUInt32(this.mtime),
      bufferFromUInt32(this.mtime_nsec),
      bufferFromUInt32(this.dev),
      bufferFromUInt32(0), // ToDO: this.ino is 31525197391820170 which is out of range
      bufferFromUInt32(this.mode),
      bufferFromUInt32(this.uid),
      bufferFromUInt32(this.gid),
      bufferFromUInt32(this.size),
      Buffer.from(this.oid.value, 'hex'),
      bufferFromUInt16(this.flags),
      Buffer.from(this.name.value, 'utf8'), // Note: is UTF8 okay?
      Buffer.from([0]), // Note: nul-termination
    ];
    const buffer = Buffer.concat(bufferList);
    let zeroCount = 0;
    while ((buffer.length + zeroCount) % ENTRY_BLOCK_SIZE !== 0) ++zeroCount;
    this.data = Buffer.concat([buffer, Buffer.alloc(zeroCount, 0)]);
  }
}

class Index {
  constructor({ path }) {
    assert(path instanceof Path);
    this.path = path;
  }

  add({ name, oid, stat }) {
    assert(name instanceof Name);
    assert(oid instanceof Oid);
    assert(stat instanceof fs.Stats);
    const entry = IndexEntry.fromFile({ name, oid, stat });
    this.storeEntry({ entry });
    this.hasChanged = true;
  }

  async updating(block) {
    await Lockfile.tryHolding({ path: this.path }, async lockfile => {
      await this.loading({ lockfile });
      await block();
      if (this.hasChanged) {
        await this.writing({ lockfile });
        this.hasChanged = false;
      } else {
        lockfile.rollback();
      }
    });
  }

  clear() {
    this.entryByName = {};
    this.hasChanged = false;
  }

  async loading({ lockfile }) {
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
      const entry = IndexEntry.decode({ data });
      this.storeEntry({ entry });
    }
  }

  storeEntry({ entry }) {
    assert(entry instanceof IndexEntry);
    // console.log(`"${entry.name.value}"`);
    this.entryByName[entry.name.value] = entry;
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
    const nameList = Object.keys(this.entryByName).sort();
    const header = Buffer.concat([
      Buffer.from(SIGNATURE, 'ascii'),
      bufferFromInt32(VERSION),
      bufferFromInt32(nameList.length),
    ]);
    await lockfile.writingBuffer(header);
    hash.update(header);
    for (const name of nameList) {
      const entry = this.entryByName[name];
      await lockfile.writingBuffer(entry.data);
      hash.update(entry.data);
    }
    const calculatedChecksum = hash.digest();
    await lockfile.writingBuffer(calculatedChecksum);
  }
}

module.exports = {
  Index,
};
