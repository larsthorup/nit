const crypto = require('crypto');

const { Oid } = require('./oid');

class FakeOid {
  static create() {
    const buffer = Buffer.alloc(20);
    crypto.randomFillSync(buffer);
    return new Oid(buffer.toString('hex'));
  }
}

module.exports = {
  FakeOid,
};
