const testPathList = ['lib/index', 'cli/add', 'cli/status', 'cli/commit'];

const { running } = require('./test/runner');

const msg = 'All tests passed';
console.time(msg);
running({ testPathList })
  .then(() => {
    console.timeEnd(msg);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
