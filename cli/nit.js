const { adding } = require('./add');
const { cleaning } = require('./clean');
const { committing } = require('./commit');
const { initializing } = require('./init');

async function cli({ argv, cwd, stdin }) {
  const nodeExecutable = argv.shift();
  const nitJs = argv.shift();
  const command = argv.shift();

  switch (command) {
    case 'add':
      await adding({ argv, cwd });
      break;
    case 'clean':
      await cleaning({ cwd });
      break;
    case 'commit':
      await committing({ cwd, stdin });
      break;
    case 'init':
      await initializing({ argv, cwd });
      break;
    default:
      console.error(`nit: "${command}" is not a nit command`);
      process.exit(1);
  }
  process.exit(0);
}

module.exports = {
  cli,
};
