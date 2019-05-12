const assert = require('assert');
const fs = require('fs');
const path = require('path');
const util = require('util');

const readingDir = util.promisify(fs.readdir);
const readingFile = util.promisify(fs.readFile);

const IGNORE_LIST = [
  '.',
  '..',
  '.git',
  '.idea', // ToDo: eventually use .gitignore instead
];

function relative(rootPath, filePath) {
  const nativePath = path.relative(rootPath, filePath);
  const isWindows = process.platform === 'win32';
  const unixPath = isWindows ? nativePath.replace(/\\/g, '/') : nativePath;
  return unixPath; // ToDo: use Name
}

class Workspace {
  constructor({ rootPath }) {
    assert(path.isAbsolute(rootPath));
    assert(fs.existsSync(rootPath));
    this.rootPath = rootPath;
  }

  async readingFile({ fileName }) {
    const filePath = path.join(this.rootPath, fileName);
    assert(fs.existsSync(filePath));
    const buffer = await readingFile(filePath);
    const stat = fs.statSync(filePath);
    return { buffer, stat };
  }

  async readingFileList({ directory } = {}) {
    directory = directory || this.rootPath;
    assert.equal(typeof directory, 'string');
    const stat = fs.statSync(directory);
    if (stat.isDirectory()) {
      const directoryFileList = await readingDir(directory, {
        withFileTypes: true,
      });
      const isNotIgnored = ({ name }) => !IGNORE_LIST.includes(name);
      const recursing = async dirent => {
        assert(dirent instanceof fs.Dirent);
        const { name } = dirent;
        const filePath = path.join(directory, name);
        return this.readingFileList({ directory: filePath });
      };
      const fileList = await Promise.all(
        directoryFileList.filter(isNotIgnored).map(recursing)
      );
      return fileList.flat();
    } else {
      return [relative(this.rootPath, directory)];
    }
  }
}

module.exports = {
  Workspace,
};
