const assert = require('assert');

const { running } = require('../test/runner');

const { File } = require('../lib/file');
const { Name } = require('../lib/name');

const { cli } = require('./nit');

class FakeConsole {
  // ToDo: use new console.Console
  constructor() {
    this.stderr = '';
    this.stdout = '';
  }

  debug(...args) {
    console.debug(...args);
  }

  error(msg) {
    assert(typeof msg, 'string');
    this.stderr += `${msg}\n`;
  }

  log(msg) {
    assert(typeof msg, 'string');
    this.stdout += `${msg}\n`;
  }
}

class ExitError extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, ExitError);
  }
}

class Scenario {
  constructor() {
    const { path } = File.createTempDir();
    this.root = path;
  }

  destroy() {
    File.removeRecursive({ path: this.root });
  }

  async assertingCommand({ argv, input, stderr = '', stdout = '' }) {
    let exitStatus = null;
    const fakeExit = status => {
      // ToDo: FakeShell
      exitStatus = status;
      throw new ExitError();
    };
    const fakeConsole = new FakeConsole();
    try {
      await cli({
        argv: ['node', 'nit'].concat(argv),
        console: fakeConsole,
        cwd: () => this.root.value, // ToDo: FakeShell.create(), shell.destroy()
        exit: fakeExit,
        input,
      });
    } catch (error) {
      if (error instanceof ExitError) {
        // Note: expected, we will verify exitStatus below
      } else {
        console.error(error);
        assert(false, 'Unhandled error');
      }
    }
    assert.equal(stderr, fakeConsole.stderr);
    assert.equal(0, exitStatus);
    if (stdout instanceof RegExp) {
      assert(stdout.test(fakeConsole.stdout));
    } else {
      assert.equal(stdout, fakeConsole.stdout);
    }
  }
}

async function testing_init_add_commit() {
  const scenario = new Scenario();
  const { root } = scenario;
  try {
    await scenario.assertingCommand({
      argv: ['init', root.value],
      stdout: `Initialized empty git repository in ${root.value}\\.git\n`,
    });
    const helloName = new Name('hello.txt');
    await File.writingFile({ path: root.joinName(helloName), string: 'hello' });
    await scenario.assertingCommand({ argv: ['add', helloName.value] });
    await scenario.assertingCommand({
      argv: ['commit'],
      input: 'Commit message',
      stdout: /\[\(root-commit\) [0-9a-f]{40}\] Commit message\n/,
    });
  } finally {
    scenario.destroy(); // ToDo: afterEach
  }
}

const testList = [testing_init_add_commit];

async function testing() {
  await running({ testList });
}

module.exports = {
  testing,
};
