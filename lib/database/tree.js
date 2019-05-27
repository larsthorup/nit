const assert = require('assert').strict;

const { isSorted } = require('../array');
const { Entry } = require('../index/entry');
const { Oid } = require('../oid');

const DIRECTORY_MODE = 0o40000;

function encodeNode({ nodeName, node }) {
  assert.equal(typeof node.mode, 'number');
  assert.equal(typeof nodeName, 'string');
  assert(node.oid instanceof Oid);
  return Buffer.concat([
    Buffer.from(node.mode.toString(8)), // Note: convert to octal string
    Buffer.from(' '),
    Buffer.from(nodeName, 'utf8'), // Note: is utf8 okay?
    Buffer.from([0]),
    Buffer.from(node.oid.value, 'hex'),
  ]);
}

class Tree {
  static build({ entryList }) {
    const byName = (a, b) => (a.name.value < b.name.value ? -1 : 1);
    assert(isSorted(entryList, byName));
    const root = new Tree();
    entryList.forEach(entry => {
      assert(entry instanceof Entry);
      const { fileName, parentDirectoryList } = entry.name.split();
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
