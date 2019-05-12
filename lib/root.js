// Note: represent a git root defined by the Path to the directory containing .git

const assert = require('assert');

const { Path } = require('./path');

class Root {
  constructor(path) {
    assert(path instanceof Path);
    this.path = path;
  }

  databasePath() {
    return this.gitPath().join(new Path('objects'));
  }

  gitPath() {
    return this.path.join(new Path('.git'));
  }

  headPath() {
    return this.gitPath().join(new Path('HEAD'));
  }

  indexPath() {
    return this.gitPath().join(new Path('index'));
  }
}

module.exports = {
  Root,
};
