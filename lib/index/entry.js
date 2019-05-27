const assert = require('assert').strict;
const fs = require('fs');

const { Name } = require('../name');
const { Oid } = require('../oid');

const ENTRY_BLOCK_SIZE = 8;
const EXECUTABLE_MODE = 0o100755;
const MAX_PATH_SIZE = 0xfff;
const REGULAR_MODE = 0o100644;

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

class Entry {
  static fromFile({ name, oid, stat }) {
    assert(name instanceof Name);
    assert(oid instanceof Oid);
    assert(stat instanceof fs.Stats);
    const isExecutable = false; // Note: eventually deduce this from this.stat
    const entry = new Entry();
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
    const entry = new Entry();
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

module.exports = {
  Entry,
  ENTRY_BLOCK_SIZE,
};
