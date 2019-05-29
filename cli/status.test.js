const assert = require('assert');

const { NitTester } = require('../test/nitTester');
const { running } = require('../test/runner');

async function test_status_untrack_file_order() {
  await NitTester.init(async nit => {
    await nit.write('file.txt', '');
    await nit.write('another.txt', '');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, ['?? another.txt', '?? file.txt', ''].join('\n'));
  });
}

async function test_status_untrack_when_not_in_index() {
  await NitTester.init(async nit => {
    await nit.write('committed.txt', '');
    await nit.cmd(['add', '.']);
    await nit.cmd(['commit'], { input: 'msg' });
    await nit.write('file.txt', '');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, '?? file.txt\n');
  });
}

async function test_status_untrack_directory_not_content() {
  await NitTester.init(async nit => {
    await nit.write('file.txt', '');
    await nit.write('dir/another.txt', '');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, ['?? dir/', '?? file.txt', ''].join('\n'));
  });
}

async function test_status_untrack_file_in_tracked_directory() {
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

async function before_changes({ nit }) {
  await nit.write('1.txt', 'one');
  await nit.write('a/2.txt', 'two');
  await nit.write('a/b/3.txt', 'three');
  await nit.cmd(['add', '.']);
  await nit.cmd(['commit'], { input: 'msg' });
}

async function test_status_change_none() {
  await NitTester.init(async nit => {
    await before_changes({ nit });

    await nit.cmd(['status']);

    assert.equal(nit.stdout, '');
  });
}

async function test_status_change_file_content_same_size() {
  await NitTester.init(async nit => {
    await before_changes({ nit });
    await nit.write('1.txt', 'un');
    await nit.write('a/2.txt', 'deux');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, [' M 1.txt', ' M a/2.txt', ''].join('\n'));
  });
}

async function test_status_change_file_size() {
  await NitTester.init(async nit => {
    await before_changes({ nit });
    await nit.write('a/b/3.txt', 'trois');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, ' M a/b/3.txt\n');
  });
}

const testList = [
  test_status_untrack_file_order,
  test_status_untrack_when_not_in_index,
  test_status_untrack_directory_not_content,
  test_status_untrack_file_in_tracked_directory,
  test_status_change_none,
  test_status_change_file_size,
  test_status_change_file_content_same_size,
];

async function testing() {
  await running({ testList });
}

module.exports = {
  testing,
};
