const assert = require('assert').strict;
const fs = require('fs');
const util = require('util');

const writingFile = util.promisify(fs.writeFile);

const { Author } = require('../lib/database/author');
const { Commit } = require('../lib/database/commit');
const { Path } = require('../lib/path');
const { Repository } = require('../lib/repository');
const { Root } = require('../lib/root');
const { Tree } = require('../lib/database/tree');

async function readingStream(stream) {
  let buffer = Buffer.alloc(0);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer.toString('utf8');
}

async function committing({ console, cwd, exit, input, stdin }) {
  const name = process.env.GIT_AUTHOR_NAME;
  if (!name) {
    console.error(`nit: missing environment variable GIT_AUTHOR_NAME`);
    exit(1);
  }
  const email = process.env.GIT_AUTHOR_EMAIL;
  if (!email) {
    console.error(`nit: missing environment variable GIT_AUTHOR_EMAIL`);
    exit(1);
  }
  const time = Date.now(); // ToDo: is this UTC?
  const author = new Author({ email, name, time });
  // console.log(author.data);
  const message = input || (await readingStream(stdin));
  // console.log(message);
  const root = new Root(new Path(cwd()));
  const { database, index, refs } = new Repository({ root });
  const { oid: parent } = await refs.readingHead();
  await index.loading();
  const entryList = index.getEntryList();
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
  await writingFile(root.headPath().value, commit.oid.value);
  const isRootCommit = parent === null ? '(root-commit) ' : '';
  console.log(`[${isRootCommit}${commit.oid.value}] ${message.split('\n')[0]}`);
}

module.exports = {
  committing,
};
