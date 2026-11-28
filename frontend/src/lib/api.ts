const BASE_URL = (
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:5000/api'
).replace(/\/+$/, '');

/**
 * The endpoints that answer **401** for a wrong password — and not because
 * the session died. A failed sign-in attempt must never sign the visitor
 * out of a session that is still perfectly valid.
 */
const CREDENTIAL_ENDPOINTS = [
  '/auth/login',
  '/auth/login-phone',
  '/auth/phone-login',
  '/auth/firebase-phone',
  '/auth/register',
  '/auth/verify-aadhaar',
];

/**
 * Removes a session that the shared backend no longer accepts.
 *
 * The backend refuses a session when the account was deleted or suspended.
 * The website used to keep the cached user on the screen in that case, so
 * the visitor saw a signed-in interface whose every request failed. The
 * session is now cleared and the listeners are notified.
 *
 * The event name is `AUTH_SYNC_EVENT` from `hooks/useAuth` — it is repeated
 * here as a literal so that this module stays free of a React import.
 */
function clearDeadSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('farmconnect_token');
    localStorage.removeItem('fc_token');
    localStorage.removeItem('farmconnect_role');
    localStorage.removeItem('farmconnect_user');
    localStorage.removeItem('fc_user');

    const expireOption =
      '; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
    document.cookie = `token=${expireOption}`;
    document.cookie = `fc_token=${expireOption}`;
    document.cookie = `farmconnect_token=${expireOption}`;
    document.cookie = `farmconnect_role=${expireOption}`;
    document.cookie = `role=${expireOption}`;

    window.dispatchEvent(new Event('farmconnect_auth_sync'));
  } catch {
    /* storage may be unavailable in private mode */
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${BASE_URL}${cleanEndpoint}`;

  // Read auth token safely across both naming conventions with inline SSR guard
  const token: string | null =
    typeof window !== 'undefined'
      ? localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token')
      : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    let data: any = null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!res.ok) {
      // A **401** on an ordinary endpoint means the session is over: the
      // account was deleted, suspended or the token expired. The cached
      // user must not stay on the screen.
      if (
        res.status === 401 &&
        token &&
        !CREDENTIAL_ENDPOINTS.some((path) => cleanEndpoint.startsWith(path))
      ) {
        clearDeadSession();
      }

      let errorMsg = data?.message || data?.error;
      if (!errorMsg || typeof errorMsg !== 'string' || errorMsg.includes('<html')) {
        errorMsg = `Server error (${res.status}): ${res.statusText || 'Unable to complete request'}`;
      }
      const error = new Error(errorMsg) as any;
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data as T;
  } catch (err: any) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn(`[API Notice] ${cleanEndpoint}:`, err.message);
    }
    throw err;
  }
}