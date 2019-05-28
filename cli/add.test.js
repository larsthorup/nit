const assert = require('assert');

const { NitTester } = require('../test/nitTester');
const { Path } = require('../lib/path');
const { running } = require('../test/runner');

async function testing_add_regular_file() {
  await NitTester.init(async nit => {
    await nit.write('hello.txt', 'hello');

    await nit.cmd(['add', 'hello.txt']);

    assert.deepEqual(await nit.lsFiles(), [[0o100644, 'hello.txt']]);
  });
}

async function testing_add_multiple_files() {
  await NitTester.init(async nit => {
    await nit.write('hello.txt', 'hello');
    await nit.write('world.txt', 'world');

    await nit.cmd(['add', 'hello.txt', 'world.txt']);

    assert.deepEqual(await nit.lsFiles(), [
      [0o100644, 'hello.txt'],
      [0o100644, 'world.txt'],
    ]);
  });
}

async function testing_add_incrementally() {
  await NitTester.init(async nit => {
    await nit.write('hello.txt', 'hello');
    await nit.write('world.txt', 'world');

    await nit.cmd(['add', 'world.txt']);

    assert.deepEqual(await nit.lsFiles(), [[0o100644, 'world.txt']]);

    await nit.cmd(['add', 'hello.txt']);

    assert.deepEqual(await nit.lsFiles(), [
      // Note: in sort order
      [0o100644, 'hello.txt'],
      [0o100644, 'world.txt'],
    ]);
  });
}

async function testing_add_directory() {
  await NitTester.init(async nit => {
    await nit.write('dir/nested.txt', 'content');

    await nit.cmd(['add', 'dir']);

    assert.deepEqual(await nit.lsFiles(), [[0o100644, 'dir/nested.txt']]);
  });
}

async function testing_add_root_directory() {
  await NitTester.init(async nit => {
    await nit.write('a/b/c/file.txt', 'content');

    await nit.cmd(['add', '.']);

    assert.deepEqual(await nit.lsFiles(), [[0o100644, 'a/b/c/file.txt']]);
  });
}

async function testing_add_fail_file_not_found() {
  await NitTester.init(async nit => {
    await nit.cmd(['add', 'missing.txt'], { status: 128 });
    assert.equal(nit.stderr, 'nit: cannot add "missing.txt"\n');
    assert.deepEqual(await nit.lsFiles(), []);
  });
}

async function testing_add_fail_locked() {
  await NitTester.init(async nit => {
    await nit.write('file.txt', '');
    await nit.write('.git/index.lock', '');

    await nit.cmd(['add', 'file.txt'], { status: 128 });

    assert.equal(
      nit.stderr,
      `fatal: Unable to create "${nit.repo.root.path.value}${Path.sep}.git${
        Path.sep
      }index.lock": File exists.\n`
    );
    assert.deepEqual(await nit.lsFiles(), []);
  });
}

async function testing_commit() {
  await NitTester.init(async nit => {
    await nit.write('hello.txt', 'hello');
    await nit.cmd(['add', 'hello.txt']);

    await nit.cmd(['commit'], { input: 'msg' });

    assert(/\[\(root-commit\) [0-9a-f]{40}\] msg\n/.test(nit.stdout));
  });
}

const testList = [
  testing_add_regular_file,
  testing_add_multiple_files,
  testing_add_incrementally,
  testing_add_directory,
  testing_add_root_directory,
  testing_add_fail_file_not_found,
  testing_add_fail_locked,
];

async function testing() {
  await running({ testList });
}

module.exports = {
  testing,
};
