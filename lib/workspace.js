const assert = require('assert');
const fs = require('fs');
const util = require('util');

const { Name } = require('./name');
const { Path } = require('./path');

const readingDir = util.promisify(fs.readdir);

const IGNORE_LIST = [
  '.',
  '..',
  '.git',
  '.idea', // ToDo: eventually use .gitignore instead
];

class Workspace {
  constructor({ path }) {
    assert(path instanceof Path);
    assert(path.isAbsolute());
    assert(path.exists());
    this.path = path;
  }

  async readingFile({ name }) {
    assert(name instanceof Name);
    const filePath = this.path.joinName(name);
    assert(filePath.exists());
    const buffer = await util.promisify(fs.readFile)(filePath.value);
    const stat = fs.statSync(filePath.value);
    return { buffer, stat };
  }

  async readingFileList({ path = this.path } = {}) {
    assert(path instanceof Path);
    const stat = fs.statSync(path.value);
    if (stat.isDirectory()) {
      const direntList = await readingDir(path.value, {
        withFileTypes: true,
      });
      const isNotIgnored = ({ name }) => !IGNORE_LIST.includes(name);
      const recursing = async dirent => {
        assert(dirent instanceof fs.Dirent);
        const name = new Name(dirent.name);
        return this.readingFileList({ path: path.joinName(name) });
      };
      const fileList = await Promise.all(
        direntList.filter(isNotIgnored).map(recursing)
      );
      return fileList.flat();
    } else {
      return path.nameRelativeTo(this.path);
    }
  }
}

module.exports = {
  Workspace,
};