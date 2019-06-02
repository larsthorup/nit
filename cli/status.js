const { Repository } = require('../lib/repository');
const { StatusCollector } = require('../lib/repository/status');

const { format } = require('../lib/color');

const GREEN = 'GREEN';
const RED = 'RED';

const SHORT_STATUS = {
  ADDED: 'A',
  MODIFIED: 'M',
  DELETED: 'D',
};

const LONG_STATUS_WIDTH = 12;
const LONG_STATUS = {
  ADDED: 'new file:',
  MODIFIED: 'modified:',
  DELETED: 'deleted:',
};

class StatusPrinter {
  constructor({ collector, console }) {
    this.changeByName = collector.changeByName;
    this.changedNameList = collector.changedNameList;
    this.console = console;
    this.untrackedByName = collector.untrackedByName;
  }

  printResults({ argv }) {
    if (argv[0] === '--porcelain') {
      this.renderPorcelain();
    } else {
      this.renderLong();
    }
  }

  renderLong() {
    this.renderChanges({
      changeByName: this.changeByName.index,
      message: 'Changes to be committed',
      style: GREEN,
    });
    this.renderChanges({
      changeByName: this.changeByName.workspace,
      message: 'Changes not staged for commit',
      style: RED,
    });
    this.renderChanges({
      changeByName: this.untrackedByName,
      message: 'Untracked files',
      style: RED,
    });
    this.renderCommitStatus();
  }

  renderChanges({ changeByName, message, style }) {
    const nameList = Object.keys(changeByName).sort();
    if (nameList.length === 0) return;
    this.console.log(`${message}:`);
    this.console.log('');
    for (const name of nameList) {
      const type = changeByName[name];
      const status = this.longStatusFor({ type });
      this.console.log(`\t${format({ string: `${status}${name}`, style })}`);
    }
    this.console.log('');
  }

  longStatusFor({ type }) {
    if (type) {
      return LONG_STATUS[type].padEnd(LONG_STATUS_WIDTH, ' ');
    } else {
      return '';
    }
  }

  renderCommitStatus() {
    if (Object.keys(this.changeByName.index).length > 0) return;
    if (Object.keys(this.changeByName.workspace).length > 0) {
      this.console.log('no changes added to commit');
    } else if (Object.keys(this.untrackedByName).length > 0) {
      this.console.log('nothing added to commit but untracked files present');
    } else {
      this.console.log('nothing to commit, working tree clean');
    }
  }

  renderPorcelain() {
    const print = ({ status, nameString }) =>
      this.console.log(`${status} ${nameString}`);
    for (const nameString of this.changedNameList.sort()) {
      const status = this.statusFor({ nameString });
      print({ status, nameString });
    }
    for (const nameString of Object.keys(this.untrackedByName).sort()) {
      print({ status: '??', nameString });
    }
  }

  statusFor({ nameString }) {
    const left = SHORT_STATUS[this.changeByName.index[nameString]] || ' ';
    const right = SHORT_STATUS[this.changeByName.workspace[nameString]] || ' ';
    return `${left}${right}`;
  }
}

async function listingStatus({ argv, console, cwd, exit }) {
  const repo = Repository.at(cwd());
  // Note: prepare to update the index in case, as index entry time stamps might be updated during change detection
  await repo.index.updating(async () => {
    const collector = await StatusCollector.collecting({ repo });
    const printer = new StatusPrinter({ collector, console });
    printer.printResults({ argv });
  });
  exit(0);
}

module.exports = {
  listingStatus,
};
