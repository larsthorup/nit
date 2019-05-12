const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('util');

const writingFile = util.promisify(fs.writeFile);

const { Author } = require('../lib/database/author');
const { Blob } = require('../lib/database/blob');
const { Commit } = require('../lib/database/commit');
const { Database } = require('../lib/database');
const { Entry } = require('../lib/entry');
const { Refs } = require('../lib/refs');
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
  const rootPath = cwd();
  const gitPath = path.join(rootPath, '.git');
  const dbPath = path.join(gitPath, 'objects');
  const database = new Database({ dbPath });
  const refs = new Refs({ gitPath });
  const { oid: parent } = await refs.readingHead();
  const workspace = new Workspace({ rootPath });
  const fileList = await workspace.readingFileList();
  // console.log(fileList);
  const entryList = await Promise.all(
    fileList.map(async fileName => {
      const { buffer: data, stat } = await workspace.readingFile({
        fileName,
      });
      const blob = new Blob({ data });
      await database.storing({ object: blob });
      assert(blob.oid); // Note: created by database.storing()
      return new Entry({ name: fileName, oid: blob.oid, stat });
    })
  );
  const root = Tree.build({ entryList });
  await root.visiting(async tree => {
    database.storing({ object: tree });
    assert(tree.oid); // Note: created by database.storing()
  });
  const commit = new Commit({
    author,
    message,
    parent,
    treeId: root.oid,
  });
  await database.storing({ object: commit });
  assert(commit.oid); // Note: created by database.storing()
  await refs.updatingHead({ oid: commit.oid });
  const headPath = path.join(gitPath, 'HEAD');
  await writingFile(headPath, commit.oid);
  const isRootCommit = parent === null ? '(root-commit) ' : '';
  console.log(`[${isRootCommit}${commit.oid}] ${message.split('\n')[0]}`);
}

module.exports = {
  committing,
};
