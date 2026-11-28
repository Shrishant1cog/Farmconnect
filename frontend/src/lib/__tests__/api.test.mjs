/**
 * Regression tests for the single HTTP path of the website.
 *
 * The end-to-end audit found a screen that waited **for ever**: the
 * administrator command center asked the shared backend for three
 * resources and stayed on "Loading Command Center..." as long as one of
 * them had not answered. The host of the platform (a free tier
 * instance) occasionally keeps a connection open without ever answering
 * it — the request was observed as `pending` in the network log of the
 * browser while the same endpoint answered the next call in 56 ms.
 *
 * A request without a deadline turns that hiccup into a page that never
 * loads. `fetchApi` therefore gives every request a deadline and
 * reports a request that overran it as a failure.
 *
 * Run with:
 *
 *     node --test frontend/src/lib/__tests__/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { fetchApi, DEFAULT_REQUEST_TIMEOUT_MS } from '../api.ts';

/**
 * Starts a server, runs the body and shuts the server down.
 *
 * The connections are closed explicitly: the pool of the HTTP client
 * keeps a socket of an aborted request open, and `server.close()` would
 * then wait for ever.
 */
async function withServer(handler, body) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}`;
  try {
    return await body(url);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
}

test('API: every request has a deadline', () => {
  assert.equal(typeof DEFAULT_REQUEST_TIMEOUT_MS, 'number');
  assert.ok(DEFAULT_REQUEST_TIMEOUT_MS > 0);
  assert.ok(DEFAULT_REQUEST_TIMEOUT_MS <= 120000, 'the deadline must stay reasonable');
});

test('API: a request that never answers fails instead of hanging', async () => {
  // A server that accepts the connection and never answers it — the
  // behaviour that the live platform showed.
  const started = Date.now();

  const failure = await withServer(
    (_req, res) => {
      // The response is never written.
      res.on('error', () => {});
    },
    async (url) => {
      try {
        await fetchApi(`${url}/never-answers`, { method: 'GET' }, 300);
        return null;
      } catch (err) {
        return err;
      }
    }
  );

  const elapsed = Date.now() - started;

  assert.ok(failure, 'the request must fail');
  assert.equal(failure.isTimeout, true, 'the failure must be reported as a deadline');
  assert.equal(failure.status, null, 'a deadline has no HTTP status');
  assert.match(failure.message, /did not answer/i);
  assert.ok(elapsed < 5000, `the deadline must be honoured (took ${elapsed} ms)`);
});

test('API: a request that answers in time is not disturbed', async () => {
  const answer = await withServer(
    (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { value: 42 } }));
    },
    (url) => fetchApi(`${url}/answers`, { method: 'GET' }, 5000)
  );

  assert.equal(answer.success, true);
  assert.equal(answer.data.value, 42);
});

test('API: a refused request carries the HTTP status', async () => {
  const failure = await withServer(
    (_req, res) => {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Forbidden: Requires ADMIN' }));
    },
    async (url) => {
      try {
        await fetchApi(`${url}/admin/metrics`, { method: 'GET' }, 5000);
        return null;
      } catch (err) {
        return err;
      }
    }
  );

  assert.ok(failure, 'a refused request must fail');
  assert.equal(failure.status, 403);
  assert.match(failure.message, /Forbidden/);
  assert.equal(failure.isTimeout, undefined);
});
