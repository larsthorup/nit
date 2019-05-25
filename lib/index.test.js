const assert = require('assert');
const fs = require('fs');

const { Index } = require('./index');
const { Name } = require('./name');
const { FakeOid } = require('./oid.test');
const { Path } = require('./path');

class FakeIndex {
  static create() {
    const path = new Path('some-path'); // ToDo
    return new Index({ path });
  }
}

function beforeEach() {
  const index = FakeIndex.create();
  const oid = FakeOid.create();
  const stat = fs.statSync(__filename); // ToDo
  return { index, oid, stat };
}

async function testing_add() {
  const { index, oid, stat } = beforeEach();

  index.add({ name: new Name('alice.txt'), oid, stat });

  assert.deepStrictEqual(
    ['alice.txt'],
    index.getEntryList().map(entry => entry.name.value)
  );
}

async function testing_add_replaces_file_with_directory() {
  const { index, oid, stat } = beforeEach();
  index.add({ name: new Name('alice.txt'), oid, stat });
  index.add({ name: new Name('bob.txt'), oid, stat });

  index.add({ name: new Name('alice.txt/nested.txt'), oid, stat });

  assert.deepStrictEqual(
    ['alice.txt/nested.txt', 'bob.txt'],
    index.getEntryList().map(entry => entry.name.value)
  );
}

async function testing_add_replaces_directory_with_file() {
  const { index, oid, stat } = beforeEach();
  index.add({ name: new Name('alice.txt'), oid, stat });
  index.add({ name: new Name('nested/bob.txt'), oid, stat });

  index.add({ name: new Name('nested'), oid, stat });

  assert.deepStrictEqual(
    ['alice.txt', 'nested'],
    index.getEntryList().map(entry => entry.name.value)
  );
}

async function testing_add_replaces_sub_directory_with_file() {
  const { index, oid, stat } = beforeEach();
  index.add({ name: new Name('alice.txt'), oid, stat });
  index.add({ name: new Name('nested/bob.txt'), oid, stat });
  index.add({ name: new Name('nested/inner/claire.txt'), oid, stat });

  index.add({ name: new Name('nested'), oid, stat });

  assert.deepStrictEqual(
    ['alice.txt', 'nested'],
    index.getEntryList().map(entry => entry.name.value)
  );
}

async function testing() {
  await testing_add();
  await testing_add_replaces_file_with_directory();
  await testing_add_replaces_directory_with_file();
  await testing_add_replaces_sub_directory_with_file();
}

module.exports = {
  FakeIndex,
  testing,
};
