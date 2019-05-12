const fs = require('fs');
const path = require('path');

async function initializing({ argv, cwd }) {
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

module.exports = {
  initializing,
};
