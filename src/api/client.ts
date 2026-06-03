const API_BASE = import.meta.env.VITE_API_URL || '/api';

export type TokenKind = 'customer' | 'staff' | 'platform';

function tokenKey(kind: TokenKind) {
  return `barber_token_${kind}`;
}

export function getToken(kind: TokenKind): string | null {
  return localStorage.getItem(tokenKey(kind));
}

export function setToken(kind: TokenKind, token: string | null) {
  if (token) localStorage.setItem(tokenKey(kind), token);
  else localStorage.removeItem(tokenKey(kind));
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.ok && data.database === true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  tokenKind?: TokenKind
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (tokenKind) {
    const token = getToken(tokenKind);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
  }
  return data as T;
}

export { API_BASE };
