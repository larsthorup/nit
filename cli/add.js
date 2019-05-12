const assert = require('assert');

const { Blob } = require('../lib/database/blob');
const { Database } = require('../lib/database');
const { Index } = require('../lib/index');
const { Name } = require('../lib/name');
const { Oid } = require('../lib/oid');
const { Path } = require('../lib/path');
const { Root } = require('../lib/root');
const { Workspace } = require('../lib/workspace');

async function adding({ argv, cwd }) {
  const root = new Root(new Path(cwd()));
  const workspace = new Workspace({ path: root.path });
  const database = new Database({ dbPath: root.databasePath().value }); // ToDo: Database.path
  const index = new Index({ path: root.indexPath() });
  for (const arg of argv) {
    const path = Path.resolve(arg);
    if (!path.exists()) {
      console.error(`nit: cannot add "${path.value}"`);
      process.exit(1);
    }
    const nameList = await workspace.readingFileList({ path });
    for (const name of nameList) {
      assert(name instanceof Name);
      const { buffer: data, stat } = await workspace.readingFile({ name });
      const blob = new Blob({ data });
      await database.storing({ object: blob });
      assert(blob.oid); // Note: created by database.storing()
      index.add({ name, oid: new Oid(blob.oid), stat }); // ToDo: convert to Oid earlier
    }
  }
  await index.writingUpdates();
}

module.exports = {
  adding,
};
