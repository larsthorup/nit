const { Blob } = require('../lib/database/blob');
const { Database } = require('../lib/database');
const { Name } = require('../lib/name');
const { Repository } = require('../lib/repository');

async function isTrackable({ name, repo, stat }) {
  if (stat.isFile()) {
    return !repo.index.isTracked({ name });
  }
  if (!stat.isDirectory()) {
    return false;
  }
  const { entryStatByName } = await repo.workspace.listingDirectory({
    directoryName: name,
  });
  const fileNameList = Object.keys(entryStatByName).filter(key =>
    entryStatByName[key].isFile()
  );
  const dirNameList = Object.keys(entryStatByName).filter(key =>
    entryStatByName[key].isDirectory()
  );
  for (const nameString of [].concat(fileNameList, dirNameList)) {
    const entryName = new Name(nameString);
    const entryStat = entryStatByName[nameString];
    if (
      await isTrackable({
        name: entryName,
        repo,
        stat: entryStat,
      })
    ) {
      return true;
    }
  }
  return false;
}

async function scanningWorkspace({ directoryName, repo }) {
  const fileStatByName = {};
  const untrackedNameList = [];
  const { entryStatByName } = await repo.workspace.listingDirectory({
    directoryName,
  });
  for (const nameString of Object.keys(entryStatByName)) {
    const name = new Name(nameString);
    const stat = entryStatByName[nameString];
    if (repo.index.isTracked({ name })) {
      if (stat.isFile()) {
        fileStatByName[nameString] = stat;
      } else if (stat.isDirectory()) {
        const {
          fileStatByName: subFileStatByName,
          untrackedNameList: subNameList,
        } = await scanningWorkspace({
          directoryName: name,
          repo,
          untrackedNameList,
        });
        Array.prototype.push.apply(untrackedNameList, subNameList);
        Object.assign(fileStatByName, subFileStatByName);
      }
    } else if (await isTrackable({ name, repo, stat })) {
      const untrackedName = `${name.value}${stat.isDirectory() ? '/' : ''}`;
      untrackedNameList.push(untrackedName);
    }
  }
  return { fileStatByName, untrackedNameList };
}

async function detectingWorkspaceChanges({ fileStatByName, repo }) {
  const changedNameList = [];
  for (const entry of repo.index.getEntryList()) {
    const fileStat = fileStatByName[entry.name.value];
    if (await isEntryChanged({ entry, fileStat, repo })) {
      changedNameList.push(`${entry.name.value}`);
    }
  }
  return { changedNameList };
}

async function isEntryChanged({ entry, fileStat, repo }) {
  if (!entry.isStatMatching({ stat: fileStat })) {
    return true;
  }
  const { data } = await repo.workspace.readingFile({ name: entry.name });
  const blob = new Blob({ data });
  const { oid: fileOid } = Database.hash({ object: blob });
  if (!entry.oid.equals(fileOid)) {
    return true;
  }
  return false;
}

async function listingStatus({ console, cwd, exit }) {
  const repo = Repository.at(cwd());
  await repo.index.loading();
  const { fileStatByName, untrackedNameList } = await scanningWorkspace({
    repo,
  });
  const { changedNameList } = await detectingWorkspaceChanges({
    fileStatByName,
    repo,
  });
  for (const name of changedNameList.sort()) {
    console.log(` M ${name}`);
  }
  for (const name of untrackedNameList.sort()) {
    console.log(`?? ${name}`);
  }
  exit(0);
}

module.exports = {
  listingStatus,
};
