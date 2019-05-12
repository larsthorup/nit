const cp = require('child_process');
const fs = require('fs');
const path = require('path');

async function cleaning({ cwd }) {
  const rootPath = cwd();
  const gitPath = path.join(rootPath, '.git');
  if (fs.existsSync(gitPath)) {
    const isWindows = process.platform === 'win32';
    const rmdirCmd = isWindows ? 'rmdir /s /q' : 'rm -rf';
    cp.execSync(`${rmdirCmd} ${gitPath}`);
  }
}

module.exports = {
  cleaning,
};
