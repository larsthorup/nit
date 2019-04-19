function convertLineEndings(buf) {
  // Note: eventually avoid this for non-text files, but how to know?
  const crlf = Buffer.from('\r\n');
  const lf = Buffer.from('\n');
  while (true) {
    const crlfPos = buf.indexOf(crlf);
    if (crlfPos === -1) break;
    buf = Buffer.concat([buf.slice(0, crlfPos), lf, buf.slice(crlfPos + 2)]); // Note: slow
  }
  return buf;
}

class Blob {
  constructor({ data }) {
    this.data = convertLineEndings(data);
  }

  get type() {
    return 'blob';
  }
}

module.exports = {
  Blob,
};
