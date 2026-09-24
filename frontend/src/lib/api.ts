const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Universal token retriever with backward compatibility and "Bearer" sanitization
 */
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  const rawToken =
    localStorage.getItem('farmconnect_token') ||
    localStorage.getItem('fc_token');

  if (!rawToken) return null;

  // Strip duplicate "Bearer " prefix if accidentally stored with one
  return rawToken.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Robust fetch wrapper with automatic auth hydration, generic typing, and self-clearing auth errors
 */
export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const targetUrl = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers,
    });

    // Handle 204 No Content cleanly
    if (res.status === 204) {
      return {} as T;
    }

    const data = (await res.json().catch(() => ({}))) as any;

    if (!res.ok) {
      // Auto-purge bad or expired tokens to prevent infinite 401 loops
      if (res.status === 401 || res.status === 403) {
        const errorMsg = data?.message?.toLowerCase() || '';
        if (
          errorMsg.includes('signature') ||
          errorMsg.includes('expired') ||
          errorMsg.includes('tampered') ||
          errorMsg.includes('malformed') ||
          data?.code === 'TOKEN_EXPIRED' ||
          data?.code === 'TOKEN_MALFORMED'
        ) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('farmconnect_token');
            localStorage.removeItem('farmconnect_user');
            localStorage.removeItem('fc_token');
          }
        }
      }

      throw new Error(data?.message || `Request failed with status ${res.status}`);
    }

    return data as T;
  } catch (err: any) {
    // Avoid noisy console errors for expected 401/403 validation checks
    if (!err.message?.includes('401') && !err.message?.includes('403')) {
      console.error(`Fetch error on endpoint ${endpoint}:`, err.message);
    }
    throw err;
  }
}

export default fetchApi;