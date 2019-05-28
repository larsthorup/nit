const { Repository } = require('../lib/repository');

async function listingStatus({ console, cwd, exit }) {
  const { index, workspace } = Repository.at(cwd());
  await index.loading();
  const nameList = await workspace.readingFileList();
  const untrackedNameList = nameList.filter(name => !index.isTracked({ name }));
  for (const name of untrackedNameList) {
    console.log(`?? ${name.value}`);
  }
  exit(0);
}

module.exports = {
  listingStatus,
};
