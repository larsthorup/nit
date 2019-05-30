const assert = require('assert');

class Scanner {
  constructor({ data }) {
    this.data = data;
    this.offset = 0;
  }

  hasMore() {
    return this.offset < this.data.length;
  }

  readBuffer({ beforeIndex, count }) {
    assert((beforeIndex && !count) || (!beforeIndex && count));
    const end = (() => {
      if (count) {
        return this.offset + count;
      } else if (beforeIndex === -1) {
        return this.data.length;
      } else {
        return beforeIndex;
      }
    })();
    const buffer = this.data.slice(this.offset, end);
    this.offset = end;
    return buffer;
  }

  readNumber(criteria) {
    return Number(this.readString(criteria));
  }

  readString({ beforeIndex, beforeString, encoding }) {
    assert((beforeIndex && !beforeString) || (!beforeIndex && beforeString));
    const end = (() => {
      if (beforeIndex === -1) {
        return this.data.length;
      } else if (beforeIndex > 0) {
        return beforeIndex;
      } else {
        return this.data.indexOf(beforeString, this.offset, encoding);
      }
    })();
    assert(end >= this.offset);
    const string = this.data.toString(encoding, this.offset, end);
    this.offset = end + 1;
    return string;
  }
}

module.exports = {
  Scanner,
};
