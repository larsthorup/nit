const assert = require('assert');

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

  encode() {
    const unixTime = Math.trunc(this.time / 1000);
    this.data = `${this.name} <${this.email}> ${unixTime} +0000`;
  }
}

module.exports = {
  Author,
};
