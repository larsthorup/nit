const assert = require('assert').strict;

const { Database } = require('./database');
const { Index } = require('./index');
const { Refs } = require('./refs');
const { Root } = require('./root');
const { Workspace } = require('./workspace');

class Repository {
  constructor({ root }) {
    assert(root instanceof Root);
    this.root = root;
  }
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
