const assert = require('assert');

const { File } = require('../lib/file');
const { Name } = require('../lib/name');
const { Repository } = require('../lib/repository');
const { Root } = require('../lib/root');
const { cli } = require('../cli/nit');

const { FakeConsole } = require('./fakeConsole');

class ExitError extends Error {
  constructor(...params) {
    super(...params);
    Error.captureStackTrace(this, ExitError);
  }
}

class NitTester {
  constructor() {
    const { path } = File.createTempDir();
    const root = new Root(path);
    this.repo = new Repository({ root });
  }

  static async init(block) {
    const nit = new NitTester();
    try {
      await nit.cmd(['init', nit.repo.root.value]);
      assert.equal(
        nit.stdout,
        `Initialized empty git repository in ${
          nit.repo.root.path.value
        }\\.git\n`
      );
      await block(nit);
    } finally {
      nit.destroy();
    }
  }

  destroy() {
    File.removeRecursive({ path: this.repo.root.path });
  }

  async write(name, string) {
    const path = this.repo.root.path.joinName(new Name(name));
    await File.ensureDirectory({ path });
    await File.writingFile({ path, string });
  }

  async removeRecursive(name) {
    const path = this.repo.root.path.joinName(new Name(name));
    await File.removeRecursive({ path });
  }

  async unlink(name) {
    const path = this.repo.root.path.joinName(new Name(name));
    await File.unlink({ path });
  }

  async cmd(
    argv,
    {
      env = {
        GIT_AUTHOR_NAME: 'Nit Tester',
        GIT_AUTHOR_EMAIL: 'nit@example.com',
      },
      input,
      status = 0,
    } = {}
  ) {
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
        cwd: () => this.repo.root.path.value, // ToDo: FakeShell.create(), shell.destroy()
        env,
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
    this.stdout = fakeConsole.stdout;
    this.stderr = fakeConsole.stderr;
    if (exitStatus !== status) {
      console.error(this.stderr);
      assert.equal(status, exitStatus);
    }
  }

  async lsFiles() {
    // ToDo: extract to command
    const { index } = this.repo;
    await index.loading();
    return index.getEntryList().map(entry => [entry.mode, entry.name.value]);
  }
}

module.exports = {
  NitTester,
};
