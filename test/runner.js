const path = require('path');

async function running({ testPathList, testList }) {
  if (testPathList) {
    await testPathList.reduce(async (acc, testPath) => {
      await acc;
      console.log(testPath);
      const test = require(path.join(__dirname, '..', `${testPath}.test`));
      await test.testing();
    }, Promise.resolve());
  }
  if (testList) {
    await testList.reduce(async (acc, test) => {
      await acc;
      const msg = `  ${test.name}`;
      console.time(msg);
      try {
        await test();
      } finally {
        console.timeEnd(msg);
      }
    }, Promise.resolve());
  }
}

module.exports = {
  running,
};
