const testList = [require('./lib/index.test'), require('./cli/scenario.test')];

async function running() {
  await testList.reduce(async (acc, test) => {
    await acc;
    await test.testing();
  }, Promise.resolve());
}

running()
  .then(() => {
    console.log('All tests passed');
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
