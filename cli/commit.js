const assert = require('assert');
const fs = require('fs');
const util = require('util');

const writingFile = util.promisify(fs.writeFile);

const { Author } = require('../lib/database/author');
const { Blob } = require('../lib/database/blob');
const { Commit } = require('../lib/database/commit');
const { Database } = require('../lib/database');
const { Entry } = require('../lib/entry');
const { Name } = require('../lib/name');
const { Path } = require('../lib/path');
const { Refs } = require('../lib/refs');
const { Root } = require('../lib/root');
const { Tree } = require('../lib/database/tree');
const { Workspace } = require('../lib/workspace');

async function readingStream(stream) {
  let buffer = Buffer.alloc(0);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer.toString('utf8');
}

async function committing({ cwd, stdin }) {
  const name = process.env.GIT_AUTHOR_NAME;
  if (!name) {
    console.error(`nit: missing environment variable GIT_AUTHOR_NAME`);
    process.exit(1);
  }
  const email = process.env.GIT_AUTHOR_EMAIL;
  if (!email) {
    console.error(`nit: missing environment variable GIT_AUTHOR_EMAIL`);
    process.exit(1);
  }
  const time = Date.now(); // ToDo: is this UTC?
  const author = new Author({ email, name, time });
  // console.log(author.data);
  const message = await readingStream(stdin);
  // console.log(message);
  const root = new Root(new Path(cwd()));
  const database = new Database({ path: root.databasePath() });
  const refs = new Refs({ gitPath: root.gitPath().value });
  const { oid: parent } = await refs.readingHead();
  const workspace = new Workspace({ path: root.path });
  const nameList = await workspace.readingFileList();
  // console.log(fileList);
  const entryList = await Promise.all(
    nameList.map(async name => {
      assert(name instanceof Name);
      const { buffer: data, stat } = await workspace.readingFile({ name });
      const blob = new Blob({ data });
      await database.storing({ object: blob });
      assert(blob.oid); // Note: created by database.storing()
      return new Entry({ name: name.value, oid: blob.oid, stat });
    })
  );
  const tree = Tree.build({ entryList });
  await tree.visiting(async node => {
    database.storing({ object: node });
    assert(node.oid); // Note: created by database.storing()
  });
  const commit = new Commit({
    author,
    message,
    parent,
    treeId: tree.oid,
  });
  await database.storing({ object: commit });
  assert(commit.oid); // Note: created by database.storing()
  await refs.updatingHead({ oid: commit.oid });
  await writingFile(root.headPath().value, commit.oid);
  const isRootCommit = parent === null ? '(root-commit) ' : '';
  console.log(`[${isRootCommit}${commit.oid}] ${message.split('\n')[0]}`);
}

module.exports = {
  committing,
};
