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
