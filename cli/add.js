const assert = require('assert');

const { Blob } = require('../lib/database/blob');
const { Database } = require('../lib/database');
const { Index } = require('../lib/index');
const { Name } = require('../lib/name');
const { Oid } = require('../lib/oid');
const { Path } = require('../lib/path');
const { Workspace } = require('../lib/workspace');

async function adding({ argv, cwd }) {
  const rootPath = new Path(cwd());
  const gitPath = rootPath.join(new Path('.git'));
  const workspace = new Workspace({ rootPath: rootPath.value });
  const dbPath = gitPath.join(new Path('objects'));
  const database = new Database({ dbPath: dbPath.value });
  const indexPath = gitPath.join(new Path('index'));
  const index = new Index({ indexPath });
  for (const arg of argv) {
    const name = new Name(arg);
    const filePath = rootPath.join(Path.fromName(name));
    if (!filePath.exists()) {
      console.error(`nit: cannot add "${name.value}"`);
      process.exit(1);
    }
    const { buffer: data, stat } = await workspace.readingFile({
      fileName: name.value, // ToDo: convert to use Name
    });
    const blob = new Blob({ data });
    await database.storing({ object: blob });
    assert(blob.oid); // Note: created by database.storing()
    index.add({ name, oid: new Oid(blob.oid), stat }); // ToDo: convert earlier
  }
  await index.writingUpdates();
}

module.exports = {
  adding,
};
