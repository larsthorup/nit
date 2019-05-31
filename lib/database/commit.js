const assert = require('assert').strict;

const { Author } = require('./author');
const { Oid } = require('../oid');

class Commit {
  constructor({ author, message, parent, treeId }) {
    assert(author instanceof Author);
    assert.equal(typeof message, 'string');
    if (parent !== null) {
      assert(parent instanceof Oid);
    }
    assert(treeId instanceof Oid);
    this.author = author;
    this.message = message;
    this.parent = parent;
    this.treeId = treeId;
    this.encode();
  }

  static parse({ scanner }) {
    const headers = {};
    while (true) {
      const line = scanner.readString({ beforeString: '\n', encoding: 'utf8' });
      if (line === '') break;
      const spaceIndex = line.indexOf(' ');
      assert(spaceIndex > 0);
      const key = line.substr(0, spaceIndex);
      const value = line.substr(spaceIndex + 1);
      headers[key] = value;
    }
    const author = Author.parse({ string: headers['author'] });
    const message = scanner.readString({ beforeIndex: -1, encoding: 'utf8' });
    const parent = headers['parent'] ? new Oid(headers['parent']) : null; // Note: root commit lacks a parent
    const treeId = new Oid(headers['tree']);
    return new Commit({ author, message, parent, treeId });
  }

  get type() {
    return 'commit';
  }

  encode() {
    const lines = [];
    lines.push(`tree ${this.treeId.value}`);
    if (this.parent) {
      lines.push(`parent ${this.parent.value}`);
    }
    lines.push(`author ${this.author.data}`);
    lines.push(`committer ${this.author.data}`);
    lines.push('');
    lines.push(this.message);
    this.data = Buffer.from(lines.join('\n'));
  }
}

module.exports = {
  Commit,
};
