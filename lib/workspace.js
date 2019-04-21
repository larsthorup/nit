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
    const directoryFileList = await readingDir(directory, {
      withFileTypes: true,
    });
    const isNotIgnored = ({ name }) => !IGNORE_LIST.includes(name);
    const recursing = async dirent => {
      assert(dirent instanceof fs.Dirent);
      const { name } = dirent;
      const filePath = path.join(directory, name);
      if (dirent.isDirectory()) {
        const subdirectoryFileList = await this.readingFileList({
          directory: filePath,
        });
        return subdirectoryFileList; // Note: will be flattened below
      } else {
        const nativePath = path.relative(this.rootPath, filePath);
        const isWindows = process.platform === 'win32';
        const unixPath = isWindows
          ? nativePath.replace(/\\/g, '/')
          : nativePath;
        return unixPath;
      }
    };
    const fileList = await Promise.all(
      directoryFileList.filter(isNotIgnored).map(recursing)
    );
    return fileList.flat();
  }
}

module.exports = {
  Workspace,
};
