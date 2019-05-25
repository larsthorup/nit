const assert = require('assert');

const { Blob } = require('../lib/database/blob');
const { Database } = require('../lib/database');
const { Index } = require('../lib/index');
const { LockDenied } = require('../lib/lockfile');
const { Name } = require('../lib/name');
const { Oid } = require('../lib/oid');
const { Path } = require('../lib/path');
const { Root } = require('../lib/root');
const { Workspace } = require('../lib/workspace');

async function adding({ argv, cwd }) {
  const root = new Root(new Path(cwd()));
  const workspace = new Workspace({ path: root.path });
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
    const database = new Database({ path: root.databasePath() });
    const index = new Index({ path: root.indexPath() });
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
