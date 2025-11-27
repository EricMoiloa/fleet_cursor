// src/lib/apiClient.ts

// export const API_BASE =
//   process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/api/v1';
// src/lib/apiClient.ts
const DEFAULT_API = 'http://127.0.0.1:8000/api/v1';

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API).replace(/\/+$/, '');
console.log('[API_BASE]', API_BASE);


function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}


function full(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function parse<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  let body: any = null;

  try {
    if (ct.includes('application/json')) {
      body = await res.json();
    } else {
      const text = await res.text();
      try { body = JSON.parse(text); }
      catch {
        console.error('Non-JSON API response:', text.slice(0, 800));
        body = null;
      }
    }
  } catch {
    const text = await res.text().catch(() => '');
    console.error('JSON parse failed. Raw:', text.slice(0, 800));
    body = null;
  }

  if (!res.ok) {
    const msg = body?.error || body?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  // If server returned nothing, let caller handle it (this triggers your current error)
  if (body == null) return null as any;

  return (body?.data !== undefined ? body.data : body) as T;
}


/* ---------------------- HTTP helpers ---------------------- */

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(full(path), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    cache: 'no-store',
  });
  return parse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(full(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return parse<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(full(path), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return parse<T>(res);
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await fetch(full(path), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
  });
  return parse<T>(res);
}

/** NEW: Form-encoded POST (good for Laravel validators / non-JSON) */
export async function apiPostForm<T = any>(path: string, form: Record<string, string>): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) {
    if (v !== undefined && v !== null) body.set(k, String(v));
  }

  const res = await fetch(full(path), {
    method: 'POST',
    // Let fetch set Content-Type for URLSearchParams (application/x-www-form-urlencoded)
    headers: {
      Accept: 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body,
  });

  return parse<T>(res);
}
/** NEW: form-encoded POST, but return raw Response so caller can inspect status */
export async function apiPostFormRaw(path: string, form: Record<string, string>): Promise<Response> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) {
    if (v !== undefined && v !== null) body.set(k, String(v));
  }

  const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(typeof window !== 'undefined' && localStorage.getItem('auth_token')
        ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        : {}),
    },
    body,
  });

  return res; // caller decides how to handle non-2xx
}


/* Optional convenience getters (you can keep or remove) */
export const getDispatchRequests = () => apiGet<any[]>('/dispatch-requests');
export const getTrips             = () => apiGet<any[]>('/trips');
export const getVehicles          = () => apiGet<any[]>('/vehicles');
// src/lib/apiClient.ts
export const getMyVehicles = () => apiGet<any[]>('/vehicles'); // Driver gets only their vehicles now
