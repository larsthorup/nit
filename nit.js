const { cli } = require('./cli/nit');

function fatal(options) {
  console.error(options);
  process.exit(1);
}

process.on('unhandledRejection', reason => {
  fatal({ type: 'unhandledRejection', reason, stack: reason.stack });
});

process.on('uncaughtException', err => {
  fatal({ type: 'uncaughtException', err, stack: err.stack });
});

cli({ argv: process.argv, cwd: process.cwd, stdin: process.stdin });
