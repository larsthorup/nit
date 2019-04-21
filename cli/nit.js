const assert = require('assert');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const writingFile = util.promisify(fs.writeFile);

async function readingStream(stream) {
  let buffer = Buffer.alloc(0);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer.toString('utf8');
}

const { Author } = require('../lib/database/author');
const { Blob } = require('../lib/database/blob');
const { Commit } = require('../lib/database/commit');
const { Database } = require('../lib/database');
const { Entry } = require('../lib/entry');
const { Refs } = require('../lib/refs');
const { Tree } = require('../lib/database/tree');
const { Workspace } = require('../lib/workspace');

async function cli({ argv, cwd, stdin }) {
  const nodeExecutable = argv.shift();
  const nitJs = argv.shift();
  const command = argv.shift();

  switch (command) {
    case 'clean':
      {
        const rootPath = cwd();
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
      break;
    case 'init':
      {
        const initPath = argv[0] || cwd();
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

module.exports = {
  cli,
};
