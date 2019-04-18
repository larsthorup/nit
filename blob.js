class Blob {
  constructor({ data }) {
    this.data = data;
  }

  get type() {
    return 'blob';
  }
}

module.exports = {
  Blob,
};
