const assert = require('assert');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const { Blob } = require('./blob');
const { Database } = require('./database');
const { Entry } = require('./entry');
const { Tree } = require('./tree');
const { Workspace } = require('./workspace');

async function main() {
  const { argv } = process;
  const nodeExecutable = argv.shift();
  const nitJs = argv.shift();
  const command = argv.shift();

  switch (command) {
    case 'clean':
      {
        const rootPath = process.cwd();
        const gitPath = path.join(rootPath, '.git');
        if (fs.existsSync(gitPath)) {
          const isWindows = process.platform === 'win32';
          const rmdirCmd = isWindows ? 'rmdir /s /q' : 'rm -rf';
          cp.execSync(`${rmdirCmd} ${gitPath}`);
        }
      }
      break;
    case 'commit':
      {
        const rootPath = process.cwd();
        const gitPath = path.join(rootPath, '.git');
        const dbPath = path.join(gitPath, 'objects');
        const database = new Database({ dbPath });
        const workspace = new Workspace({ rootPath });
        const { fileList } = await workspace.readingFileList();
        const entryList = await Promise.all(
          fileList.map(async fileName => {
            const { buffer: data } = await workspace.readingFile({ fileName });
            const blob = new Blob({ data });
            await database.storing({ object: blob });
            assert(blob.oid); // Note: created by database.storing()
            return new Entry({ name: fileName, oid: blob.oid });
          })
        );
        const tree = new Tree({ entryList });
        await database.storing({ object: tree });
        assert(tree.oid); // Note: created by database.storing()
        console.log(`tree: ${tree.oid}`);
      }
      break;
    case 'init':
      {
        const initPath = argv[0] || process.cwd();
        const rootPath = path.resolve(initPath);
        const gitPath = path.join(rootPath, '.git');
        ['objects', 'refs'].forEach(dirName => {
          try {
            fs.mkdirSync(path.join(gitPath, dirName), { recursive: true });
          } catch (error) {
            console.error(`fatal: ${error.message}`);
            process.exit(1);
          }
        });
        console.log(`Initialized empty git repository in ${gitPath}`);
      }
      break;
    default:
      console.error(`nit: "${command}" is not a nit command`);
      process.exit(1);
  }
}

main();
