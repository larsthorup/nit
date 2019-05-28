const { adding } = require('./add');
const { committing } = require('./commit');
const { initializing } = require('./init');
const { listingStatus } = require('./status');

async function cli({ argv, console, cwd, env, exit, input, stdin }) {
  const nodeExecutable = argv.shift();
  const nitJs = argv.shift();
  const command = argv.shift();
  switch (command) {
    case 'add':
      await adding({ argv, console, cwd, exit });
      break;
    case 'commit':
      await committing({ console, cwd, env, exit, input, stdin });
      break;
    case 'init':
      await initializing({ argv, console, cwd, exit });
      break;
    case 'status':
      await listingStatus({ console, cwd, exit });
      break;
    default:
      console.error(`nit: "${command}" is not a nit command`);
      exit(1);
  }
  exit(0);
}

module.exports = {
  cli,
};
