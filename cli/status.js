const { Name } = require('../lib/name');
const { Repository } = require('../lib/repository');

async function isTrackable({ index, name, stat, workspace }) {
  if (stat.isFile()) {
    return !index.isTracked({ name });
  }
  if (!stat.isDirectory()) {
    return false;
  }
  const { entryStatByName } = await workspace.listingDirectory({
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
        index,
        stat: entryStat,
        workspace,
      })
    ) {
      return true;
    }
  }
  return false;
}

async function scanningWorkspace({ directoryName, index, workspace }) {
  const fileStatByName = {};
  const untrackedNameList = [];
  const { entryStatByName } = await workspace.listingDirectory({
    directoryName,
  });
  for (const nameString of Object.keys(entryStatByName)) {
    const name = new Name(nameString);
    const stat = entryStatByName[nameString];
    if (index.isTracked({ name })) {
      if (stat.isFile()) {
        fileStatByName[nameString] = stat;
      } else if (stat.isDirectory()) {
        const {
          fileStatByName: subFileStatByName,
          untrackedNameList: subNameList,
        } = await scanningWorkspace({
          directoryName: name,
          index,
          untrackedNameList,
          workspace,
        });
        Array.prototype.push.apply(untrackedNameList, subNameList);
        Object.assign(fileStatByName, subFileStatByName);
      }
    } else if (await isTrackable({ index, name, stat, workspace })) {
      const untrackedName = `${name.value}${stat.isDirectory() ? '/' : ''}`;
      untrackedNameList.push(untrackedName);
    }
  }
  return { fileStatByName, untrackedNameList };
}

async function detectingWorkspaceChanges({ fileStatByName, index }) {
  const changedNameList = [];
  for (const entry of index.getEntryList()) {
    const fileStat = fileStatByName[entry.name.value];
    if (isEntryChanged({ entry, fileStat })) {
      changedNameList.push(`${entry.name.value}`);
    }
  }
  return { changedNameList };
}

function isEntryChanged({ entry, fileStat }) {
  if (!entry.isStatMatching({ stat: fileStat })) {
    return true;
  }
  return false;
}

async function listingStatus({ console, cwd, exit }) {
  const { index, workspace } = Repository.at(cwd());
  await index.loading();
  const { fileStatByName, untrackedNameList } = await scanningWorkspace({
    index,
    workspace,
  });
  const { changedNameList } = await detectingWorkspaceChanges({
    fileStatByName,
    index,
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
