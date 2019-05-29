const assert = require('assert').strict;
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

  async listingDirectory({ directoryName }) {
    assert(directoryName === undefined || directoryName instanceof Name);
    const path = directoryName ? this.path.joinName(directoryName) : this.path;
    const direntList = await readingDir(path.value, {
      withFileTypes: true,
    });
    const isNotIgnored = ({ name }) => !IGNORE_LIST.includes(name);
    const entryStatByName = {};
    for (const dirent of direntList.filter(isNotIgnored)) {
      const direntName = new Name(dirent.name);
      const entryName = directoryName
        ? directoryName.join(direntName)
        : direntName;
      const entryPath = this.path.joinName(entryName);
      entryStatByName[entryName.value] = fs.statSync(entryPath.value);
    }
    return { entryStatByName };
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
    } else if (stat.isFile()) {
      return [path.nameRelativeTo(this.path)];
    } else {
      throw new MissingFileError(
        `path "${path.value}" did not match any files`
      );
    }
  }
}

class MissingFileError extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, MissingFileError);
  }
}

module.exports = {
  MissingFile: MissingFileError,
  Workspace,
};
