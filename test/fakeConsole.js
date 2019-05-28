const assert = require('assert');

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

module.exports = {
  FakeConsole,
};
