// Note: name of git entry, root-relative /-separated directory list followed by file name

const assert = require('assert');

class Name {
  constructor(value) {
    this.value = value;
  }

  static fromDirectoryList(directoryList) {
    return new Name(directoryList.join('/'));
  }

  getParentList() {
    const parentList = [];
    const { parentDirectoryList } = this.split();
    while (parentDirectoryList.length > 0) {
      parentList.push(Name.fromDirectoryList(parentDirectoryList));
      parentDirectoryList.pop(); // Note: pops last element
    }
    return parentList;
  }

  getParentName() {
    const { parentDirectoryList } = this.split();
    return Name.fromDirectoryList(parentDirectoryList);
  }

  join(name) {
    assert(name instanceof Name);
    return Name.fromDirectoryList([this.value, name.value]);
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
