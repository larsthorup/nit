const assert = require('assert');

const { Author } = require('./author');

class Commit {
  constructor({ author, message, treeId }) {
    assert(author instanceof Author);
    assert.equal(typeof message, 'string');
    assert.equal(typeof treeId, 'string');
    assert.equal(treeId.length, 40);
    this.author = author;
    this.message = message;
    this.treeId = treeId;
    this.encode();
  }

  get type() {
    return 'commit';
  }

  encode() {
    const lines = [
      `tree ${this.treeId}`,
      `author ${this.author.data}`,
      `committer ${this.author.data}`,
      ``,
      this.message,
    ];
    this.data = Buffer.from(lines.join('\n'));
  }
}

module.exports = {
  Commit,
};
