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
    return { buffer };
  }

  async readingFileList() {
    const fullFileList = await readingDir(this.rootPath);
    const isRelevant = fileName => !IGNORE_LIST.includes(fileName);
    const relevantFileList = fullFileList.filter(isRelevant);
    return { fileList: relevantFileList };
  }
}

module.exports = {
  Workspace,
};
