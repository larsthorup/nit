const assert = require('assert').strict;

const { Blob } = require('../lib/database/blob');
const { LockDenied } = require('../lib/lockfile');
const { Name } = require('../lib/name');
const { Path } = require('../lib/path');
const { Repository } = require('../lib/repository');

async function addingFile({ database, index, name, workspace }) {
  assert(name instanceof Name);
  const { data, stat } = await workspace.readingFile({ name });
  const blob = new Blob({ data });
  await database.storing({ object: blob });
  assert(blob.oid); // Note: created by database.storing()
  index.add({ name, oid: blob.oid, stat });
}

async function collectingNameList({ argv, console, exit, root, workspace }) {
  const nameList = [];
  for (const arg of argv) {
    const path = Path.resolve(root.path.value, arg);
    if (!path.exists()) {
      console.error(`nit: cannot add "${arg}"`);
      exit(128);
    }
    const fileListForPath = await workspace.readingFileList({ path });
    Array.prototype.push.apply(nameList, fileListForPath);
  }
  return { nameList };
}

async function adding(shell) {
  const { console, cwd, exit } = shell;
  const { database, index, root, workspace } = Repository.at(cwd());
  const { nameList } = await collectingNameList({ root, workspace, ...shell });
  try {
    await index.updating(async () => {
      for (const name of nameList) {
        await addingFile({ database, index, name, workspace });
      }
    });
  } catch (error) {
    if (error instanceof LockDenied) {
      console.error(`fatal: ${error.message}`);
      exit(128);
    } else {
      throw error;
    }
  }
}

module.exports = {
  adding,
};
