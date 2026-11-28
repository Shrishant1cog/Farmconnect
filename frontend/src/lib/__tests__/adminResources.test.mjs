/**
 * Regression tests for the administrator command center.
 *
 * The end-to-end audit found that the dashboard answered a **refused**
 * request with a dashboard full of zeros:
 *
 *   * the error body of the shared backend
 *     (`{ success: false, message: 'Forbidden: ...' }`) was read as if it
 *     were a metric set, so every card showed `0`,
 *   * an empty list was shown as if the platform really had no users and
 *     no complaints,
 *   * the page waited for a second request that could never be answered,
 *     so a visitor without administrator rights saw an endless spinner.
 *
 * The rules that decide what may be shown live in `adminResources.ts`, so
 * they can be tested without a browser, a server or a database.
 *
 * Run with:
 *
 *     node --test frontend/src/lib/__tests__/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ADMIN_RESOURCES,
  anySettled,
  errorKeyForStatus,
  extractComplaintList,
  extractMetrics,
  extractUserList,
  failedState,
  firstFailure,
  isErrorBody,
  loadedState,
  pendingState,
} from '../adminResources.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..', '..');

// ---------------------------------------------------------------------------
// The answer of the shared backend
// ---------------------------------------------------------------------------

/** The real answer of `GET /admin/metrics` for an administrator. */
const metricsAnswer = {
  success: true,
  data: {
    totalUsers: 12,
    totalFarmers: 5,
    totalConsumers: 7,
    activeProducts: 44,
    activeOrders: 3,
    pendingComplaints: 1,
    totalEnquiries: 9,
  },
};

/** The real answer of `GET /admin/metrics` for an ordinary account. */
const forbiddenAnswer = {
  success: false,
  message: 'Forbidden: Requires one of the following roles: [ADMIN]',
};

// ---------------------------------------------------------------------------
// 1. A refused request is not a metric set
// ---------------------------------------------------------------------------

test('ADMIN: the error body of the backend is not read as a metric set', () => {
  // This is the defect: the error body used to reach the cards and every
  // one of them showed a fabricated zero.
  assert.equal(extractMetrics(forbiddenAnswer), null);
  assert.equal(extractMetrics({ success: false, data: { totalUsers: 0 } }), null);
});

test('ADMIN: the real metric set is read', () => {
  const stats = extractMetrics(metricsAnswer);
  assert.ok(stats);
  assert.equal(stats.totalUsers, 12);
  assert.equal(stats.totalFarmers, 5);
  assert.equal(stats.totalConsumers, 7);
  assert.equal(stats.activeProducts, 44);
  assert.equal(stats.totalEnquiries, 9);
});

test('ADMIN: an object without a single number is not a metric set', () => {
  // `{ success: true, message: '...' }` is an answer, but not a metric
  // set. Reading it would fill the cards with zeros again.
  assert.equal(extractMetrics({ success: true, message: 'nothing here' }), null);
  assert.equal(extractMetrics({}), null);
  assert.equal(extractMetrics(null), null);
  assert.equal(extractMetrics(undefined), null);
  assert.equal(extractMetrics('forbidden'), null);
  assert.equal(extractMetrics([1, 2, 3]), null);
});

test('ADMIN: the metric set is also found below `data.stats`', () => {
  const stats = extractMetrics({ success: true, data: { stats: { totalUsers: 4 } } });
  assert.ok(stats);
  assert.equal(stats.totalUsers, 4);
});

// ---------------------------------------------------------------------------
// 2. A refused request is not an empty list
// ---------------------------------------------------------------------------

test('ADMIN: the error body of the backend is not read as an empty user list', () => {
  assert.equal(extractUserList(forbiddenAnswer), null);
  assert.equal(extractComplaintList(forbiddenAnswer), null);
});

test('ADMIN: an empty list that was really read is kept', () => {
  // "There is nothing" and "nothing is known" are different answers.
  assert.deepEqual(extractUserList({ success: true, data: { users: [] } }), []);
  assert.deepEqual(extractComplaintList({ success: true, data: { complaints: [] } }), []);
});

test('ADMIN: the real lists are read', () => {
  const users = extractUserList({
    success: true,
    data: { users: [{ id: 'u1', name: 'Cultivator' }] },
  });
  assert.equal(users.length, 1);
  assert.equal(users[0].id, 'u1');

  const complaints = extractComplaintList({
    success: true,
    data: { complaints: [{ id: 'c1', subject: 'Late delivery' }] },
  });
  assert.equal(complaints.length, 1);
  assert.equal(complaints[0].subject, 'Late delivery');
});

test('ADMIN: a body that is not a list is not read as an empty list', () => {
  assert.equal(extractUserList({ success: true, data: { users: 'none' } }), null);
  assert.equal(extractComplaintList({ success: true, message: 'none' }), null);
});

// ---------------------------------------------------------------------------
// 3. The state of a resource
// ---------------------------------------------------------------------------

test('ADMIN: a refused resource reports that it may not be read', () => {
  const state = failedState(403);
  assert.equal(state.loaded, false);
  assert.equal(state.status, 403);
  assert.equal(state.errorKey, 'misc.admin.forbidden');
});

test('ADMIN: a broken resource reports a platform failure', () => {
  const state = failedState(500);
  assert.equal(state.loaded, false);
  assert.equal(state.status, 500);
  assert.equal(state.errorKey, 'misc.admin.loadError');
});

test('ADMIN: a request without an HTTP status is reported as a failure', () => {
  const state = failedState(undefined);
  assert.equal(state.loaded, false);
  assert.equal(state.status, null);
  assert.equal(state.errorKey, 'misc.admin.loadError');
});

test('ADMIN: the three resources of the command center are known', () => {
  assert.deepEqual([...ADMIN_RESOURCES], ['metrics', 'users', 'complaints']);
});

test('ADMIN: a resource that is still running is neither read nor failed', () => {
  assert.equal(pendingState.loaded, false);
  assert.equal(pendingState.pending, true);
  assert.equal(pendingState.status, null);
  assert.equal(pendingState.errorKey, null);
});

test('ADMIN: a pending resource is not reported as a failure', () => {
  // The request may still answer — it is not a failure yet.
  const failure = firstFailure({
    metrics: pendingState,
    users: pendingState,
    complaints: pendingState,
  });
  assert.equal(failure, null);
});

test('ADMIN: the page leaves its loading state when one resource answered', () => {
  // A single request that never arrives must not keep the whole command
  // center on "Loading Command Center...".
  assert.equal(
    anySettled({ metrics: pendingState, users: pendingState, complaints: pendingState }),
    false
  );
  assert.equal(
    anySettled({ metrics: loadedState, users: pendingState, complaints: pendingState }),
    true
  );
  assert.equal(
    anySettled({ metrics: failedState(403), users: pendingState, complaints: pendingState }),
    true
  );
});

test('ADMIN: a resource that was read has no error', () => {
  const state = loadedState;
  assert.equal(state.loaded, true);
  assert.equal(state.status, null);
  assert.equal(state.errorKey, null);
  assert.equal(state.pending, false);
});

test('ADMIN: the banner reports the first failed resource', () => {
  const failure = firstFailure({
    metrics: failedState(403),
    users: failedState(403),
    complaints: loadedState,
  });
  assert.ok(failure);
  assert.equal(failure.resource, 'metrics');
  assert.equal(failure.state.errorKey, 'misc.admin.forbidden');
});

test('ADMIN: no failure is reported when every resource was read', () => {
  const failure = firstFailure({
    metrics: loadedState,
    users: loadedState,
    complaints: loadedState,
  });
  assert.equal(failure, null);
});

test('ADMIN: the three resources of the command center are known', () => {
  assert.deepEqual([...ADMIN_RESOURCES], ['metrics', 'users', 'complaints']);
});

test('ADMIN: the message of a status is chosen by the status', () => {
  assert.equal(errorKeyForStatus(403), 'misc.admin.forbidden');
  assert.equal(errorKeyForStatus(401), 'misc.admin.loadError');
  assert.equal(errorKeyForStatus(500), 'misc.admin.loadError');
  assert.equal(errorKeyForStatus(null), 'misc.admin.loadError');
});

test('ADMIN: the error body of the backend is recognised', () => {
  assert.equal(isErrorBody(forbiddenAnswer), true);
  assert.equal(isErrorBody(metricsAnswer), false);
  assert.equal(isErrorBody(null), false);
});

// ---------------------------------------------------------------------------
// 4. The architectural guard
// ---------------------------------------------------------------------------

/** Every source file of the website, except the test itself. */
function websiteSources() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        files.push(full);
      }
    }
  };
  walk(SRC);
  return files;
}

test('GUARD: the base URL of the shared backend is resolved in one place only', () => {
  // Every request to the shared backend goes through `lib/api.ts`, which
  // resolves the base URL and attaches the bearer token. A module that
  // builds the base URL itself can address the **wrong** origin — that is
  // how the command center ended up waiting for an answer that never
  // came.
  //
  // Outside that module the variable may only be read for the **socket**,
  // which lives on the root of the API host.
  const offenders = [];
  for (const file of websiteSources()) {
    const relative = path.relative(SRC, file).replace(/\\/g, '/');
    if (relative === 'lib/api.ts') continue;

    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!line.includes('NEXT_PUBLIC_API_URL')) return;
      if (!/socket/i.test(line)) {
        offenders.push(`${relative}:${index + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});

test('GUARD: no module may read the body of an answer of the shared backend', () => {
  // The removed pattern read the body of an error answer as if it were the
  // requested data. `lib/api.ts` is the only module that may read the
  // body of an answer of the shared backend; a third-party service (the
  // postal directory or the address service) may be read directly.
  const offenders = [];
  for (const file of websiteSources()) {
    const relative = path.relative(SRC, file).replace(/\\/g, '/');
    if (relative === 'lib/api.ts') continue;

    const source = fs.readFileSync(file, 'utf8');
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!/await\s+(res|response)\.json\(\)/.test(line)) return;

      // Find the `fetch` that produced the answer.
      let fetchLine = -1;
      for (let back = index; back >= 0 && back >= index - 6; back--) {
        if (/await fetch\(/.test(lines[back])) {
          fetchLine = back;
          break;
        }
      }
      if (fetchLine < 0) return;

      // The address of the service must be a literal — a variable would
      // mean that it could be the shared backend.
      const address = lines
        .slice(fetchLine, fetchLine + 3)
        .join(' ')
        .replace(/^\s*const res = await fetch\(/, '');
      if (!/https?:\/\//.test(address)) {
        offenders.push(`${relative}:${fetchLine + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, []);
});
