const fs = require('fs');
const path = require('path');

const { Blob } = require('./blob');
const { Database } = require('./database');
const { Workspace } = require('./workspace');

async function main() {
  const { argv } = process;
  const nodeExecutable = argv.shift();
  const nitJs = argv.shift();
  const command = argv.shift();

  switch (command) {
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
    case 'commit':
      {
        const rootPath = process.cwd();
        const gitPath = path.join(rootPath, '.git');
        const dbPath = path.join(gitPath, 'objects');
        const database = new Database({ dbPath });
        const workspace = new Workspace({ rootPath });
        const { fileList } = await workspace.readingFileList();
        for (let fileName of fileList) {
          const { buffer: data } = await workspace.readingFile({ fileName });
          const blob = new Blob({ data });
          await database.storing({ blob });
        }
      }
      break;
    default:
      console.error(`nit: "${command}" is not a nit command`);
      process.exit(1);
  }
}

main();
