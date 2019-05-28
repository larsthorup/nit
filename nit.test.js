const testPathList = ['lib/index.test', 'cli/scenario.test'];

const { running } = require('./test/runner');

running({ testPathList })
  .then(() => {
    console.log('All tests passed');
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
