const assert = require('assert');

const { Blob } = require('../lib/database/blob');
const { LockDenied } = require('../lib/lockfile');
const { Name } = require('../lib/name');
const { Path } = require('../lib/path');
const { Repository } = require('../lib/repository');
const { Root } = require('../lib/root');

async function adding({ argv, cwd }) {
  const root = new Root(new Path(cwd()));
  const { database, index, workspace } = new Repository({ root });
  const nameList = [];
  for (const arg of argv) {
    const path = Path.resolve(arg);
    if (!path.exists()) {
      console.error(`nit: cannot add "${path.value}"`);
      process.exit(1);
    }
    Array.prototype.push.apply(
      nameList,
      await workspace.readingFileList({ path })
    );
  }
  try {
    await index.updating(async () => {
      for (const name of nameList) {
        assert(name instanceof Name);
        const { buffer: data, stat } = await workspace.readingFile({ name });
        const blob = new Blob({ data });
        await database.storing({ object: blob });
        assert(blob.oid); // Note: created by database.storing()
        index.add({ name, oid: blob.oid, stat });
      }
    });
  } catch (error) {
    if (error instanceof LockDenied) {
      console.error(`fatal: ${error.message}`);
      process.exit(1);
    } else {
      throw error;
    }
  }
}

module.exports = {
  adding,
};
