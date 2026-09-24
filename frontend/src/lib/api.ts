const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${BASE_URL}${cleanEndpoint}`;

  // Safely retrieve token across both key conventions
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
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
      const errorMsg = data?.message || data?.error || `Request failed with status ${res.status}`;
      const error = new Error(errorMsg) as any;
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data as T;
  } catch (err: any) {
    // Use warn instead of error so Next.js dev overlay does not falsely pop up
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[API] ${endpoint} returned:`, err.message);
    }
    throw err;
  }
}