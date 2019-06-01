const { Blob } = require('../../lib/database/blob');
const { Database } = require('../../lib/database');
const { Name } = require('../../lib/name');

const ADDED = 'ADDED';
const MODIFIED = 'MODIFIED';
const DELETED = 'DELETED';

class StatusCollector {
  constructor({ repo }) {
    this.repo = repo;
  }

  async scanningWorkspace({ directoryName } = {}) {
    const { index, workspace } = this.repo;
    if (!directoryName) {
      this.fileStatByName = {};
      this.untrackedByName = {};
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
        this.untrackedByName[untrackedName] = false;
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

  async loadingHead() {
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
  async collectingChangesFromIndex() {
    const { index } = this.repo;
    this.changedNameList = [];
    this.changeByName = {
      index: {},
      workspace: {},
    };
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
        this.recordChange({ name, type: MODIFIED, where: 'workspace' });
      }
    } else {
      this.recordChange({ name, type: DELETED, where: 'workspace' });
    }
  }

  async checkingIndexEntryAgainstHead({ entry }) {
    const { name } = entry;
    const headEntry = this.headEntryByName[name.value];
    if (headEntry) {
      if (!headEntry.oid.equals(entry.oid)) {
        this.recordChange({ name, type: MODIFIED, where: 'index' });
      }
    } else {
      this.recordChange({ name, type: ADDED, where: 'index' });
    }
  }

  async collectingChangesFromHead() {
    const { index } = this.repo;
    const nameList = Object.keys(this.headEntryByName).map(s => new Name(s));
    for (const name of nameList) {
      if (!index.isTrackedFile({ name })) {
        this.recordChange({ name, type: DELETED, where: 'index' });
      }
    }
  }

  recordChange({ name, type, where }) {
    this.changedNameList.push(`${name.value}`);
    this.changeByName[where][name.value] = type;
  }
}

module.exports = {
  StatusCollector,
};
