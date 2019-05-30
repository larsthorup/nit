const assert = require('assert').strict;

class Author {
  constructor({ email, name, time }) {
    assert.equal(typeof email, 'string');
    assert.equal(typeof name, 'string');
    assert.equal(typeof time, 'number');
    this.email = email;
    this.name = name;
    this.time = time;
    this.encode();
  }

  static parse({ string }) {
    const ltIndex = string.indexOf('<');
    assert(ltIndex >= 0);
    const gtIndex = string.indexOf('>', ltIndex);
    assert(gtIndex > ltIndex);
    const plusIndex = string.indexOf('+', gtIndex);
    assert(plusIndex > gtIndex);
    const name = string.substring(0, ltIndex - 1);
    const email = string.substring(ltIndex + 1, gtIndex);
    const timeString = string.substring(gtIndex + 2, plusIndex - 1);
    const time = Number(timeString) * 1000;
    return new Author({ email, name, time });
  }

  encode() {
    const unixTime = Math.trunc(this.time / 1000);
    this.data = `${this.name} <${this.email}> ${unixTime} +0000`;
  }
}

module.exports = {
  Author,
};
