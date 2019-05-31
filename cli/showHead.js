const { Repository } = require('../lib/repository');

async function showingTree({ namePrefix, repo, treeId }) {
  const { database } = repo;
  const { tree } = await database.loadingTree({ oid: treeId });
  for (const entry of tree.getEntryList()) {
    const name = namePrefix ? namePrefix.join(entry.name) : entry.name;
    if (entry.isTree()) {
      await showingTree({ namePrefix: name, repo, treeId: entry.oid });
    } else {
      console.log(`${entry.oid.value} ${name.value}`);
    }
  }
}

async function running() {
  const repo = Repository.at(process.cwd());
  const { database, refs } = repo;
  const { oid: headId } = await refs.readingHead();
  const { commit } = await database.loadingCommit({ oid: headId });
  const { treeId } = commit;
  await showingTree({ repo, treeId });
}

running().catch(console.error);
