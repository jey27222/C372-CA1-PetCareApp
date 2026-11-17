// Focused failure tests: no database is opened or modified by this file.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../config/db');
const model = require('../models/serviceBookingModel');

for (const failure of ['acquire', 'begin', 'booking', 'payment', 'commit', 'rollback', 'unavailable', 'none']) {
  test('booking transaction: ' + failure, async () => {
    const calls = { release: 0, destroy: 0, rollback: 0, commit: 0, queries: 0, callback: 0 };
    const error = new Error('Simulated ' + failure + ' failure');
    const connection = {
      beginTransaction(cb) { cb(failure === 'begin' ? error : null); },
      query(sql, values, cb) {
        calls.queries++;
        const first = calls.queries === 1;
        if (first) assert.deepEqual(values, ['2030-01-01', 5, 4, 1]);
        else assert.deepEqual(values, [12]);
        const fail = (first && failure === 'booking') || (!first && ['payment', 'rollback'].includes(failure));
        cb(fail ? error : null, { affectedRows: failure === 'unavailable' ? 0 : 1, insertId: first ? 12 : 20 });
      },
      commit(cb) { calls.commit++; cb(failure === 'commit' ? error : null); },
      rollback(cb) { calls.rollback++; cb(failure === 'rollback' ? error : null); },
      release() { calls.release++; },
      destroy() { calls.destroy++; }
    };
    const original = pool.getConnection;
    pool.getConnection = cb => cb(failure === 'acquire' ? error : null, connection);
    let outcome;
    try {
      outcome = await new Promise(resolve => model.createPendingBooking(4, 5, 1, '2030-01-01', (err, result) => {
        calls.callback++;
        resolve({ err, result });
      }));
    } finally {
      pool.getConnection = original;
    }
    assert.equal(calls.callback, 1);
    if (failure === 'none') {
      assert.deepEqual(outcome.result, { bookingId: 12, paymentId: 20 });
      assert.equal(outcome.err, null);
      assert.equal(calls.commit, 1);
      assert.equal(calls.rollback, 0);
    } else if (failure === 'unavailable') {
      assert.equal(outcome.err, null);
      assert.equal(outcome.result, null);
      assert.equal(calls.rollback, 1);
      assert.equal(calls.queries, 1);
    } else {
      assert.ok(outcome.err);
      assert.ok(outcome.result == null);
      assert.equal(calls.rollback, ['acquire', 'begin'].includes(failure) ? 0 : 1);
    }
    assert.equal(calls.release, ['acquire', 'rollback'].includes(failure) ? 0 : 1);
    assert.equal(calls.destroy, failure === 'rollback' ? 1 : 0);
  });
}
