const { Meyers } = require('./myers');

function lines(string) {
  return string.split('\n');
}

function diffDocuments(a, b) {
  return Meyers.diff(lines(a), lines(b));
}

function diffArrays(a, b) {
  return Meyers.diff(a, b);
}

module.exports = {
  diffArrays,
  diffDocuments,
};
