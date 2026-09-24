const BASE_URL = (
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:5000/api'
).replace(/\/+$/, '');

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