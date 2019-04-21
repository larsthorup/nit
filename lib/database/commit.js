const assert = require('assert');

const { Author } = require('./author');

class Commit {
  constructor({ author, message, parent, treeId }) {
    assert(author instanceof Author);
    assert.equal(typeof message, 'string');
    if (parent !== null) {
      assert.equal(typeof parent, 'string');
      assert.equal(parent.length, 40);
    }
    assert.equal(typeof treeId, 'string');
    assert.equal(treeId.length, 40);
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
    lines.push(`tree ${this.treeId}`);
    if (this.parent) {
      lines.push(`parent ${this.parent}`);
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
