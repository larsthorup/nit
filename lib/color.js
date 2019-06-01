const SGR_CODES = {
  RED: 31,
  GREEN: 32,
};

function format({ string, style }) {
  const code = SGR_CODES[style];
  return string; // Note: figure out how to get colors working
  // return `\e[${code}m${string}\e[m`;
}

module.exports = {
  format,
};
