const assert = require('assert');

const { NitTester } = require('../test/nitTester');
const { running } = require('../test/runner');

async function testing_commit() {
  await NitTester.init(async nit => {
    await nit.write('hello.txt', 'hello');
    await nit.cmd(['add', 'hello.txt']);

    await nit.cmd(['commit'], { input: 'msg' });

    assert(/\[\(root-commit\) [0-9a-f]{40}\] msg\n/.test(nit.stdout));
  });
}

const testList = [testing_commit];

async function testing() {
  await running({ testList });
}

module.exports = {
  testing,
};
