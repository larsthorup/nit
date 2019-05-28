const testPathList = ['lib/index', 'cli/add', 'cli/status', 'cli/commit'];

const { running } = require('./test/runner');

running({ testPathList })
  .then(() => {
    console.log('All tests passed');
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
