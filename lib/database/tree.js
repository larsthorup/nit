// Note: a Tree contains a set of nodes which can be either Entry or Tree

const assert = require('assert').strict;

const { isSorted } = require('../array');
const { DIRECTORY_MODE, Entry } = require('../index/entry');
const { Name } = require('../name');
const { Oid } = require('../oid');

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
  constructor() {
    this.nodeByName = {};
  }

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

  static parse({ scanner }) {
    const entryList = [];
    while (scanner.hasMore()) {
      const mode = parseInt(
        scanner.readString({ beforeString: ' ', encoding: 'ascii' }),
        8 // Note: convert from octal string
      );
      const nameString = scanner.readString({
        beforeString: '\0',
        encoding: 'utf8',
      });
      const name = new Name(nameString);
      const oidString = scanner.readBuffer({ count: 20 }).toString('hex');
      const oid = new Oid(oidString);
      const entry = Entry.fromTreeNode({ mode, name, oid });
      entryList.push(entry);
    }
    return Tree.build({ entryList });
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

  getEntryList() {
    return Object.values(this.nodeByName);
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
