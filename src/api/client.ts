/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Garante URL no formato https://host/api (sem barra no final). */
export function normalizeApiBase(url?: string): string {
  if (!url?.trim()) return '/api';
  const trimmed = url.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

/** true quando o build não recebeu VITE_API_URL e o app chama /api no domínio da Vercel (404). */
export const isMisconfiguredProductionApi =
  import.meta.env.PROD && API_BASE === '/api';

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

const HEALTH_TIMEOUT_MS = import.meta.env.VITE_API_URL ? 20000 : 3000;

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
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

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${API_BASE}${normalizedPath}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        'API não encontrada (404). Confira VITE_API_URL na Vercel — deve ser https://SUA-API.onrender.com/api'
      );
    }
    throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
  }
  return data as T;
}

export { API_BASE };
