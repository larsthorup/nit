const { Blob } = require('../lib/database/blob');
const { Database } = require('../lib/database');
const { Name } = require('../lib/name');
const { Repository } = require('../lib/repository');

const ADDED_TO_INDEX = 'ADDED_TO_INDEX';
const MODIFIED_IN_INDEX = 'MODIFIED_IN_INDEX';
const MODIFIED_IN_WORKSPACE = 'MODIFIED_IN_WORKSPACE';
const DELETED_FROM_WORKSPACE = 'DELETED_FROM_WORKSPACE';

class StatusCollector {
  constructor({ repo }) {
    this.repo = repo;
  }

  async scanningWorkspace({ directoryName } = {}) {
    const { index, workspace } = this.repo;
    if (!directoryName) {
      this.fileStatByName = {};
      this.untrackedNameList = [];
    }
    const { statByName } = await workspace.listingDirectory({ directoryName });
    for (const nameString of Object.keys(statByName)) {
      const name = new Name(nameString);
      const stat = statByName[nameString];
      if (index.isTracked({ name })) {
        if (stat.isFile()) {
          this.fileStatByName[nameString] = stat;
        } else if (stat.isDirectory()) {
          await this.scanningWorkspace({ directoryName: name });
        }
      } else if (await this.isTrackable({ name, stat })) {
        const untrackedName = `${name.value}${stat.isDirectory() ? '/' : ''}`;
        this.untrackedNameList.push(untrackedName);
      }
    }
  }

  async isTrackable({ name, stat }) {
    const { index, workspace } = this.repo;
    if (stat.isFile()) {
      return !index.isTracked({ name });
    }
    if (!stat.isDirectory()) {
      return false;
    }
    const directoryName = name;
    const { statByName } = await workspace.listingDirectory({ directoryName });
    const fileNameList = Object.keys(statByName).filter(key =>
      statByName[key].isFile()
    );
    const dirNameList = Object.keys(statByName).filter(key =>
      statByName[key].isDirectory()
    );
    for (const nameString of [].concat(fileNameList, dirNameList)) {
      const entryName = new Name(nameString);
      const entryStat = statByName[nameString];
      if (await this.isTrackable({ name: entryName, stat: entryStat })) {
        return true;
      }
    }
    return false;
  }

  async isEntryChanged({ entry, fileStat }) {
    const { index, workspace } = this.repo;
    if (!entry.isSizeMatching({ stat: fileStat })) {
      return true; // Note: if size has changed file must have changed
    }
    if (entry.isTimeMatching({ stat: fileStat })) {
      return false; // Note: if size and time is unchanged, file cannot have changed
    }
    const { data } = await workspace.readingFile({ name: entry.name });
    const blob = new Blob({ data });
    const { oid: fileOid } = Database.hash({ object: blob });
    if (!entry.oid.equals(fileOid)) {
      return true; // Note: content has changed
    }
    // Note: time changed but not content, let's update index to reflect change
    index.updateEntryStat({ entry, stat: fileStat });
    return false;
  }

  async loadingHeadTree() {
    this.headEntryByName = {};
    const { database, refs } = this.repo;
    const { oid: headId } = await refs.readingHead();
    if (!headId) return;
    const { commit } = await database.loadingCommit({ oid: headId });
    const { treeId } = commit;
    await this.readingTree({ treeId });
  }

  async readingTree({ namePrefix, treeId }) {
    const { database } = this.repo;
    const { tree } = await database.loadingTree({ oid: treeId });
    for (const entry of tree.getEntryList()) {
      const name = namePrefix ? namePrefix.join(entry.name) : entry.name;
      if (entry.isTree()) {
        await this.readingTree({ namePrefix: name, treeId: entry.oid });
      } else {
        this.headEntryByName[name.value] = entry;
      }
    }
  }
  async detectingChanges() {
    const { index } = this.repo;
    this.changedNameList = [];
    this.changeTypeSetByName = {};
    for (const entry of index.getEntryList()) {
      await this.checkingIndexEntryAgainstWorkspace({ entry });
      await this.checkingIndexEntryAgainstHead({ entry });
    }
  }

  async checkingIndexEntryAgainstWorkspace({ entry }) {
    const { name } = entry;
    const fileStat = this.fileStatByName[name.value];
    if (fileStat) {
      const isEntryChanged = await this.isEntryChanged({ entry, fileStat });
      if (isEntryChanged) {
        this.recordChange({ name, type: MODIFIED_IN_WORKSPACE });
      }
    } else {
      this.recordChange({ name, type: DELETED_FROM_WORKSPACE });
    }
  }

  async checkingIndexEntryAgainstHead({ entry }) {
    const { name } = entry;
    const headEntry = this.headEntryByName[name.value];
    if (headEntry) {
      if (!headEntry.oid.equals(entry.oid)) {
        this.recordChange({ name, type: MODIFIED_IN_INDEX });
      }
    } else {
      this.recordChange({ name, type: ADDED_TO_INDEX });
    }
  }

  recordChange({ name, type }) {
    this.changedNameList.push(`${name.value}`);
    const object = this.changeTypeSetByName;
    const key = name.value;
    const changeTypeSet = object[key] || (object[key] = new Set());
    changeTypeSet.add(type);
  }

  printResults({ console }) {
    const print = ({ status, name }) => console.log(`${status} ${name}`);
    for (const name of this.changedNameList.sort()) {
      const status = this.statusFor({ name });
      print({ status, name });
    }
    for (const name of this.untrackedNameList.sort()) {
      print({ status: '??', name });
    }
  }

  statusFor({ name }) {
    const changeTypeSet = this.changeTypeSetByName[name];
    const left = (() => {
      if (changeTypeSet.has(ADDED_TO_INDEX)) {
        return 'A';
      } else if (changeTypeSet.has(MODIFIED_IN_INDEX)) {
        return 'M';
      } else {
        return ' ';
      }
    })();
    const right = (() => {
      if (changeTypeSet.has(DELETED_FROM_WORKSPACE)) {
        return 'D';
      } else if (changeTypeSet.has(MODIFIED_IN_WORKSPACE)) {
        return 'M';
      } else {
        return ' ';
      }
    })();
    return `${left}${right}`;
  }
}

async function listingStatus({ console, cwd, exit }) {
  const repo = Repository.at(cwd());
  // Note: prepare to update the index in case, as index entry time stamps might be updated during change detection
  await repo.index.updating(async () => {
    const collector = new StatusCollector({ repo });
    await collector.scanningWorkspace();
    await collector.loadingHeadTree();
    await collector.detectingChanges();
    collector.printResults({ console });
  });
  exit(0);
}

module.exports = {
  listingStatus,
};
