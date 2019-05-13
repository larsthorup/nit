const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const { Lockfile } = require('./lockfile');
const { Name } = require('./name');
const { Oid } = require('./oid');
const { Path } = require('./path');

const ENTRY_BLOCK_SIZE = 8;
const EXECUTABLE_MODE = 0o100755;
const MAX_PATH_SIZE = 0xfff;
const REGULAR_MODE = 0o100644;

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

function unixSecondsFromDate(date) {
  assert(date instanceof Date);
  return date.getTime() / 1000;
}

class IndexEntry {
  constructor({ name, oid, stat }) {
    assert(name instanceof Name);
    assert(oid instanceof Oid);
    assert(stat instanceof fs.Stats);
    const isExecutable = false; // Note: eventually deduce this from this.stat
    const nameBuffer = Buffer.from(name.value, 'utf8');
    Object.assign(this, {
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
      flags: Math.min(nameBuffer.length, MAX_PATH_SIZE),
      nameBuffer,
    });
    this.encode();
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
      this.nameBuffer, // Note: is UTF8 okay?
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
    this.entryByName = {};
  }

  add({ name, oid, stat }) {
    assert(name instanceof Name);
    assert(oid instanceof Oid);
    assert(stat instanceof fs.Stats);
    const entry = new IndexEntry({ name, oid, stat });
    this.entryByName[name.value] = entry;
  }

  async writingUpdates() {
    const version = 2;
    const nameList = Object.keys(this.entryByName).sort();
    await Lockfile.tryHolding({ path: this.path }, async lockfile => {
      const hash = crypto.createHash('sha1');
      const header = Buffer.concat([
        Buffer.from('DIRC', 'ascii'),
        bufferFromInt32(version),
        bufferFromInt32(nameList.length),
      ]);
      await lockfile.writingBinary(header);
      hash.update(header);
      for (const name of nameList) {
        const entry = this.entryByName[name];
        await lockfile.writingBinary(entry.data);
        hash.update(entry.data);
      }
      await lockfile.writingBinary(hash.digest());
    });
  }
}

module.exports = {
  Index,
};
