/**
 * The rules that decide what the administrator command center is allowed
 * to show.
 *
 * The module exists because the rules were previously buried inside a
 * React component, where they could not be tested. The audit found that
 * the dashboard answered a **refused** request with a dashboard full of
 * zeros: the error body of the shared backend
 * (`{ success: false, message: 'Forbidden: ...' }`) was read as if it were
 * a metric set, and an empty list was shown as if the platform really had
 * no users and no complaints.
 *
 * The rule is simple:
 *
 *   * data that was **read** may be shown,
 *   * data that was **not read** is reported as not read.
 *
 * The functions below are pure, so the rule can be tested without a
 * browser, a server or a database.
 */

/** The three resources the command center reads from the shared backend. */
export type AdminResource = 'metrics' | 'users' | 'complaints';

/** Every resource, in the order the banner reports the first failure. */
export const ADMIN_RESOURCES: readonly AdminResource[] = [
  'metrics',
  'users',
  'complaints',
] as const;

/** The translation key that describes a failed resource. */
export type AdminErrorKey = 'misc.admin.forbidden' | 'misc.admin.loadError';

/**
 * The message for a failed resource.
 *
 * A **403** means the account may not read the data at all. Every other
 * status means the platform could not answer. The two are not the same
 * and the visitor is told which one it is.
 */
export function errorKeyForStatus(status: number | null | undefined): AdminErrorKey {
  return status === 403 ? 'misc.admin.forbidden' : 'misc.admin.loadError';
}

/**
 * Is this body an **error** answer of the shared backend?
 *
 * The backend reports a failure as `{ success: false, message: ... }`.
 */
export function isErrorBody(payload: unknown): boolean {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      (payload as any).success === false
  );
}

/**
 * The metric set of the platform — or `null` when the answer is not a
 * metric set.
 *
 * `null` means "nothing is known". The caller must then report that the
 * numbers were not read instead of rendering zeros.
 */
export function extractMetrics(payload: unknown): Record<string, any> | null {
  if (!payload || typeof payload !== 'object') return null;
  if (isErrorBody(payload)) return null;

  const body = payload as any;
  const candidate = body?.data?.stats || body?.data || body?.stats || body;

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null;
  }

  // A metric set carries at least one **number**. An object without a
  // single number is not a metric set — it is some other answer that
  // happens to be an object.
  const hasNumber = Object.values(candidate).some(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );

  return hasNumber ? candidate : null;
}

/**
 * The list of the accounts — or `null` when the answer is not a list.
 */
export function extractUserList(payload: unknown): any[] | null {
  if (!payload || typeof payload !== 'object') return null;
  if (isErrorBody(payload)) return null;

  const body = payload as any;
  const candidate =
    body?.data?.users || body?.data || body?.users || (Array.isArray(body) ? body : null);

  return Array.isArray(candidate) ? candidate : null;
}

/**
 * The list of the complaints — or `null` when the answer is not a list.
 */
export function extractComplaintList(payload: unknown): any[] | null {
  if (!payload || typeof payload !== 'object') return null;
  if (isErrorBody(payload)) return null;

  const body = payload as any;
  const candidate =
    body?.data?.complaints ||
    body?.data ||
    body?.complaints ||
    (Array.isArray(body) ? body : null);

  return Array.isArray(candidate) ? candidate : null;
}

/** The state of one resource after a load attempt. */
export interface AdminResourceState {
  /** Was the data **read** from the shared backend? */
  loaded: boolean;
  /** The HTTP status of the failure — `null` when there was none. */
  status: number | null;
  /** The translation key that describes the failure — `null` on success. */
  errorKey: AdminErrorKey | null;
  /**
   * Is the request still running?
   *
   * A resource that is still pending is neither read nor failed — the
   * page must not claim that it knows anything about it.
   */
  pending: boolean;
}

/** The state of a resource that was read. */
export const loadedState: AdminResourceState = {
  loaded: true,
  status: null,
  errorKey: null,
  pending: false,
};

/** The state of a resource whose request has not finished yet. */
export const pendingState: AdminResourceState = {
  loaded: false,
  status: null,
  errorKey: null,
  pending: true,
};

/**
 * The state of a resource that was **not** read.
 *
 * `status` is `null` when the request failed without an HTTP status
 * (a network error or a deadline, for example).
 */
export function failedState(status: number | null | undefined): AdminResourceState {
  return {
    loaded: false,
    status: typeof status === 'number' ? status : null,
    errorKey: errorKeyForStatus(status),
    pending: false,
  };
}

/**
 * The first failure of a set of resources — the one the banner reports.
 *
 * A resource that is still pending is **not** a failure: the request may
 * still answer. `null` when every resource was read or is still pending.
 */
export function firstFailure(
  states: Partial<Record<AdminResource, AdminResourceState>>
): { resource: AdminResource; state: AdminResourceState } | null {
  for (const resource of ADMIN_RESOURCES) {
    const state = states[resource];
    if (state && !state.loaded && !state.pending) {
      return { resource, state };
    }
  }
  return null;
}

/**
 * Has at least one resource finished — read or failed?
 *
 * The page leaves its first loading state as soon as one resource has
 * answered. It used to wait for **all** of them, so a single request
 * that never arrived kept the whole command center on "Loading Command
 * Center...".
 */
export function anySettled(
  states: Partial<Record<AdminResource, AdminResourceState>>
): boolean {
  for (const resource of ADMIN_RESOURCES) {
    const state = states[resource];
    if (state && !state.pending) return true;
  }
  return false;
}
