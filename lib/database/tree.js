const assert = require('assert');

const { DIRECTORY_MODE, Entry } = require('../entry');

function encodeNode({ nodeName, node }) {
  assert.equal(typeof node.mode, 'string');
  assert.equal(typeof nodeName, 'string');
  assert.equal(typeof node.oid, 'string');
  assert.equal(node.oid.length, 40);
  return Buffer.concat([
    Buffer.from(node.mode),
    Buffer.from(' '),
    Buffer.from(nodeName, 'utf8'), // Note: is utf8 okay?
    Buffer.from([0]),
    Buffer.from(node.oid, 'hex'),
  ]);
}

class Tree {
  static build({ entryList }) {
    assert(Array.isArray(entryList));
    const root = new Tree();
    const byName = (a, b) => (a.name < b.name ? -1 : 1);
    entryList.sort(byName).forEach(entry => {
      assert(entry instanceof Entry);
      const parentDirectoryList = entry.name.split('/');
      const fileName = parentDirectoryList.pop(); // Note: pops last element
      root.addEntry({ entry, fileName, parentDirectoryList });
    });
    return root;
  }

  constructor() {
    this.nodeByName = {};
  }

  addEntry({ entry, fileName, parentDirectoryList }) {
    assert(entry instanceof Entry);
    assert.equal(typeof fileName, 'string');
    assert(Array.isArray(parentDirectoryList));
    if (parentDirectoryList.length === 0) {
      this.nodeByName[fileName] = entry;
    } else {
      const directoryName = parentDirectoryList.shift(); // Note: pops first element
      assert.equal(typeof directoryName, 'string');
      if (!this.nodeByName[directoryName]) {
        this.nodeByName[directoryName] = new Tree();
      }
      const tree = this.nodeByName[directoryName];
      tree.addEntry({ entry, fileName, parentDirectoryList });
    }
  }

  get type() {
    return 'tree';
  }

  get mode() {
    return DIRECTORY_MODE;
  }

  async visiting(visitingNode) {
    assert.equal(typeof visitingNode, 'function');
    for (const node of Object.values(this.nodeByName)) {
      if (node instanceof Tree) {
        await node.visiting(visitingNode);
      }
    }
    this.encode();
    await visitingNode(this);
  }

  encode() {
    this.data = Buffer.concat(
      Object.keys(this.nodeByName)
        .sort()
        .map(nodeName =>
          encodeNode({ nodeName, node: this.nodeByName[nodeName] })
        )
    );
  }
}

module.exports = {
  Tree,
};
