const assert = require('assert');

const { NitTester } = require('../test/nitTester');
const { running } = require('../test/runner');

async function testing_status_untracked_files_ordered() {
  await NitTester.init(async nit => {
    await nit.write('file.txt', '');
    await nit.write('another.txt', '');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, ['?? another.txt', '?? file.txt', ''].join('\n'));
  });
}

async function testing_status_untracked_when_not_in_index() {
  await NitTester.init(async nit => {
    await nit.write('committed.txt', '');
    await nit.cmd(['add', '.']);
    await nit.cmd(['commit'], { input: 'msg' });
    await nit.write('file.txt', '');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, '?? file.txt\n');
  });
}

const testList = [
  testing_status_untracked_files_ordered,
  testing_status_untracked_when_not_in_index,
];

async function testing() {
  await running({ testList });
}

module.exports = {
  testing,
};
