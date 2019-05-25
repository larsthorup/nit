// Note: name of git entry, root-relative /-separated directory list followed by file name

class Name {
  constructor(value) {
    this.value = value;
  }

  split() {
    const parentDirectoryList = this.value.split('/');
    const fileName = parentDirectoryList.pop(); // Note: pops last element
    return { fileName, parentDirectoryList };
  }
}

module.exports = {
  Name,
};
