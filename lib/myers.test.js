const assert = require('assert');

const { running } = require('../test/runner');

const { Myers } = require('./myers');

async function test_myers_diff() {
  const a = 'ABCABBA'.split('');
  const b = 'CBABAC'.split('');
  const { editList } = Myers.diff(a, b);
  assert.deepEqual(editList.map(edit => edit.toString()), [
    '-A',
    '-B',
    ' C',
    '+B',
    ' A',
    ' B',
    '-B',
    ' A',
    '+C',
  ]);
}

const testList = [test_myers_diff];

async function testing() {
  await running({ testList });
}

module.exports = {
  testing,
};
