const { Name } = require('../lib/name');
const { Repository } = require('../lib/repository');

async function isTrackable({ index, name, stat, workspace }) {
  if (stat.isFile()) {
    return !index.isTracked({ name });
  }
  if (!stat.isDirectory()) {
    return false;
  }
  const { statByName } = await workspace.listingDirectory({
    directoryName: name,
  });
  const fileNameList = Object.keys(statByName).filter(key =>
    statByName[key].isFile()
  );
  const dirNameList = Object.keys(statByName).filter(key =>
    statByName[key].isDirectory()
  );
  for (const nameString of [].concat(fileNameList, dirNameList)) {
    const entryName = new Name(nameString);
    const entryStat = statByName[nameString];
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

async function scanning({ directoryName, index, workspace }) {
  const untrackedNameList = [];
  const { statByName } = await workspace.listingDirectory({ directoryName });
  for (const nameString of Object.keys(statByName)) {
    const name = new Name(nameString);
    const stat = statByName[nameString];
    if (index.isTracked({ name })) {
      if (stat.isDirectory()) {
        const { untrackedNameList: nameList } = await scanning({
          directoryName: name,
          index,
          untrackedNameList,
          workspace,
        });
        Array.prototype.push.apply(untrackedNameList, nameList);
      }
    } else if (await isTrackable({ index, name, stat, workspace })) {
      const untrackedName = `${name.value}${stat.isDirectory() ? '/' : ''}`;
      untrackedNameList.push(untrackedName);
    }
  }
  return { untrackedNameList };
}

async function listingStatus({ console, cwd, exit }) {
  const { index, workspace } = Repository.at(cwd());
  await index.loading();
  const { untrackedNameList } = await scanning({ index, workspace });
  for (const name of untrackedNameList.sort()) {
    console.log(`?? ${name}`);
  }
  exit(0);
}

module.exports = {
  listingStatus,
};
