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

async function testing_status_untracked_directory_not_content() {
  await NitTester.init(async nit => {
    await nit.write('file.txt', '');
    await nit.write('dir/another.txt', '');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, ['?? dir/', '?? file.txt', ''].join('\n'));
  });
}

async function testing_status_untracked_files_in_tracked_directory() {
  await NitTester.init(async nit => {
    await nit.write('a/b/inner.txt', '');
    await nit.cmd(['add', '.']);
    await nit.cmd(['commit'], { input: 'msg' });
    await nit.write('a/outer.txt', '');
    await nit.write('a/b/c/file.txt', '');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, ['?? a/b/c/', '?? a/outer.txt', ''].join('\n'));
  });
}

const testList = [
  testing_status_untracked_files_ordered,
  testing_status_untracked_when_not_in_index,
  testing_status_untracked_directory_not_content,
  testing_status_untracked_files_in_tracked_directory,
];

async function testing() {
  await running({ testList });
}

module.exports = {
  testing,
};
