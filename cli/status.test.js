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

async function test_status_change_file_time() {
  await NitTester.init(async nit => {
    await before_changes({ nit });
    await nit.write('1.txt', 'one'); // note: same content, updated modification time

    await nit.cmd(['status']);

    assert.equal(nit.stdout, '');
  });
}

async function test_status_change_file_delete() {
  await NitTester.init(async nit => {
    await before_changes({ nit });
    await nit.unlink('a/2.txt');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, ' D a/2.txt\n');
  });
}

async function test_status_change_directory_delete() {
  await NitTester.init(async nit => {
    await before_changes({ nit });
    await nit.removeRecursive('a');

    await nit.cmd(['status']);

    assert.equal(nit.stdout, [' D a/2.txt', ' D a/b/3.txt', ''].join('\n'));
  });
}

async function test_status_add_file() {
  await NitTester.init(async nit => {
    await before_changes({ nit });
    await nit.write('a/4.txt', 'four');
    await nit.cmd(['add', '.']);

    await nit.cmd(['status']);

    assert.equal(nit.stdout, 'A  a/4.txt\n');
  });
}

async function test_status_add_file_untracked_directory() {
  await NitTester.init(async nit => {
    await before_changes({ nit });
    await nit.write('d/e/5.txt', 'five');
    await nit.cmd(['add', '.']);

    await nit.cmd(['status']);

    assert.equal(nit.stdout, 'A  d/e/5.txt\n');
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
  test_status_change_file_time,
  test_status_change_file_delete,
  test_status_change_directory_delete,
  test_status_add_file,
  test_status_add_file_untracked_directory,
];

async function testing() {
  await running({ testList });
}

module.exports = {
  testing,
};
