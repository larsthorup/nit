const assert = require('assert');

const DELETE = 'DELETE';
const EQUAL = 'EQUAL';
const INSERT = 'INSERT';

const SYMBOLS = {
  DELETE: '-',
  EQUAL: ' ',
  INSERT: '+',
};

class Edit {
  constructor({ type, text }) {
    this.type = type;
    this.text = text;
  }

  toString() {
    return `${SYMBOLS[this.type]}${this.text}`;
  }
}

class Myers {
  static diff(a, b) {
    return new Myers(a, b).diff();
  }

  constructor(a, b) {
    assert(Array.isArray(a));
    assert(Array.isArray(b));
    this.a = a;
    this.b = b;
  }

  diff() {
    const editList = [];
    const { moveList } = this.backtrack();
    for (const move of moveList) {
      const {
        from: [xPrev, yPrev],
        to: [x, y],
      } = move;
      if (x === xPrev) {
        // Note: a downward move, or an insertion
        editList.push(new Edit({ type: INSERT, text: this.b[yPrev] }));
      } else if (y === yPrev) {
        // Note: a rightward move, or a deletion
        editList.push(new Edit({ type: DELETE, text: this.a[xPrev] }));
      } else {
        editList.push(new Edit({ type: EQUAL, text: this.a[xPrev] }));
      }
    }
    return {
      editList: editList.reverse(),
    };
  }

  shortestEdit() {
    const n = this.a.length;
    const m = this.b.length;

    // Note: max is the maximum number of edits we need to make
    const max = n + m;

    // Note: v holds the latest value of x for each k
    // and k can take values from -max to max
    const v = new Array(2 * max + 1);

    // Note: store snapshots of v for backtracking purposes
    const trace = [];

    // Note: We set v[1] = 0 so that the iteration for d = 0 picks x = 0.
    // We need to treat the d = 0 iteration just the same as the later iterations
    // since we might be allowed to move diagonally immediately.
    // Setting v[1] = 0 makes the algorithm behave as though it begins
    // with a virtual move downwards from (x, y) = (0,–1).
    v[1] = 0;

    for (let d = 0; d <= max; d += 1) {
      const vClone = [].concat(v);
      trace.push(vClone);
      for (let k = -d; k <= d; k += 2) {
        let x;
        if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
          // Note: we move downward
          x = v[k + 1];
        } else {
          // Note: we move rightward
          x = v[k - 1] + 1;
        }
        let y = x - k;

        // Note: Take any diagonal steps: as long as we’ve not deleted
        // the entire @a string or added the entire @b string,
        // and the elements of each string at the current position are the same,
        // we can increment both x and y
        while (x < n && (y < m) & (this.a[x] === this.b[y])) {
          x += 1;
          y += 1;
        }

        // Note: Store off the value of x we reached for the current k
        v[k] = x;

        // Note: Finally, we return the current value of d
        // if we’ve reached the bottom-right position,
        // telling the caller the minimum number of edits required to convert from a to b
        if (x >= n && y >= m) {
          return trace;
        }
      }
    }
  }

  backtrack() {
    const moveList = [];

    // Note: start with the target final position
    let x = this.a.length;
    let y = this.b.length;
    const trace = this.shortestEdit();

    // Note: iterate over the trace in reverse order
    for (let d = trace.length - 1; d >= 0; --d) {
      const v = trace[d];

      // Note: calculate the k value,
      // and then determine what the previous k would have been,
      // using the same logic as in the shortestEdit method
      const k = x - y;
      let kPrev;
      if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
        kPrev = k + 1;
      } else {
        kPrev = k - 1;
      }

      // Note: from that previous k value,
      // we can retrieve the previous value of x from the trace,
      // and use these k and x values to calculate the previous y
      const xPrev = v[kPrev];
      const yPrev = xPrev - kPrev;

      // Note: If the current x and y values are both greater than the previous ones,
      // we know we can make a diagonal move,
      // so we yield a move from x-1, y-1 to x, y
      // and then decrement x and y as long as this condition holds.
      while (x > xPrev && y > yPrev) {
        const move = { from: [x - 1, y - 1], to: [x, y] };
        moveList.push(move);
        x -= 1;
        y -= 1;
      }

      // Note: Finally, we yield a move from the previous x and y from the trace,
      // to the position we reached after following diagonals.
      // This should be a single downward or rightward step.
      // If d is zero, there is no previous position to move back to,
      // so we skip this step in that case.
      if (d > 0) {
        moveList.push({ from: [xPrev, yPrev], to: [x, y] });
      }
      x = xPrev;
      y = yPrev;
    }
    return { moveList };
  }
}

module.exports = {
  Myers,
};
