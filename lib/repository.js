const assert = require('assert').strict;

const { Database } = require('./database');
const { Index } = require('./index');
const { Path } = require('./path');
const { Refs } = require('./refs');
const { Root } = require('./root');
const { Workspace } = require('./workspace');

class Repository {
  constructor({ root }) {
    assert(root instanceof Root);
    this.root = root;
  }

  /**
   * @returns {Repository}
   */
  static at(path) {
    assert.equal(typeof path, 'string');
    const root = new Root(new Path(path));
    return new Repository({ root });
  }

  /**
   * @returns {Database}
   */
  get database() {
    return (
      this._database ||
      (this._database = new Database({ path: this.root.databasePath() }))
    );
  }

  get index() {
    return (
      this._index || (this._index = new Index({ path: this.root.indexPath() }))
    );
  }

  /**
   * @returns {Refs}
   */
  get refs() {
    return (
      this._refs || (this._refs = new Refs({ gitPath: this.root.gitPath() }))
    );
  }

  get workspace() {
    return (
      this._workspace ||
      (this._workspace = new Workspace({ path: this.root.path }))
    );
  }
}

module.exports = {
  Repository,
};
