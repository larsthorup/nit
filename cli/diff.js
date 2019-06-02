const { Blob } = require('../lib/database/blob');
const { Database } = require('../lib/database');
const { Name } = require('../lib/name');
const { Repository } = require('../lib/repository');
const { StatusCollector } = require('../lib/repository/status');

async function diffing({ console, cwd, exit }) {
  const repo = Repository.at(cwd());
  const { index } = repo;
  await index.loading();
  const collector = await StatusCollector.collecting({ repo });
  const { changeByName } = collector;
  for (const nameString of Object.keys(changeByName.workspace)) {
    if (changeByName.workspace[nameString] === 'MODIFIED') {
      const name = new Name(nameString);
      await diffingFileModifiedInWorkspace({ name, repo });
    }
  }
}

async function diffingFileModifiedInWorkspace({ name, repo }) {
  const { database, index, workspace } = repo;
  const entry = index.getEntry({ name });
  const aId = entry.oid;
  const aMode = entry.mode.toString(8); // Note: convert to octal string
  const aName = new Name('a').join(name);
  const { data } = await workspace.readingFile({ name });
  const blob = new Blob({ data });
  const { oid: bId } = Database.hash({ object: blob });
  const bName = new Name('b').join(name);
  const short = Database.shortenOid;
  console.log(`diff --git ${aName.value} ${bName.value}`);
  console.log(`index ${short(aId)}..${short(bId)} ${aMode}`);
  console.log(`--- ${aName.value}`);
  console.log(`+++ ${bName.value}`);
}

module.exports = {
  diffing,
};
