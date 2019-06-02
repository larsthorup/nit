const SGR_CODES = {
  RED: 31,
  GREEN: 32,
};

const ESC = '\x1b';

function format({ string, style }) {
  const code = SGR_CODES[style];
  return `${ESC}[${code}m${string}${ESC}[m`;
}

module.exports = {
  format,
};
