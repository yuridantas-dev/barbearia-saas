import { apiFetch, setToken, getToken, TokenKind } from './client';
import { ChatUser } from '../types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export async function registerCustomer(name: string, email: string, pin: string): Promise<AuthUser> {
  const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/register-customer', {
    method: 'POST',
    body: JSON.stringify({ name, email, pin })
  });
  setToken('customer', data.token);
  return data.user;
}

export async function loginCustomer(email: string, pin: string): Promise<AuthUser> {
  const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/login-customer', {
    method: 'POST',
    body: JSON.stringify({ email, pin })
  });
  setToken('customer', data.token);
  return data.user;
}

const STAFF_SHOP_SLUG_KEY = 'barber_staff_shop_slug';

export function getStaffShopSlug(): string | null {
  const fromLocal = localStorage.getItem(STAFF_SHOP_SLUG_KEY);
  if (fromLocal) return fromLocal;
  const legacy = sessionStorage.getItem(STAFF_SHOP_SLUG_KEY);
  if (legacy) {
    localStorage.setItem(STAFF_SHOP_SLUG_KEY, legacy);
    sessionStorage.removeItem(STAFF_SHOP_SLUG_KEY);
  }
  return legacy;
}

function setStaffShopSlug(slug: string | null) {
  sessionStorage.removeItem(STAFF_SHOP_SLUG_KEY);
  if (slug) localStorage.setItem(STAFF_SHOP_SLUG_KEY, slug);
  else localStorage.removeItem(STAFF_SHOP_SLUG_KEY);
}

function isAuthError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('401') ||
    m.includes('não autenticado') ||
    m.includes('token inválido') ||
    m.includes('expirado') ||
    m.includes('credenciais')
  );
}

export async function loginStaff(
  email: string,
  password: string,
  shopSlug?: string
): Promise<{ user: AuthUser; role: string }> {
  const data = await apiFetch<{ token: string; user: AuthUser; role: string }>('/auth/login-staff', {
    method: 'POST',
    body: JSON.stringify({ email, password, shopSlug: shopSlug || undefined })
  });
  setToken(data.role === 'platform_admin' ? 'platform' : 'staff', data.token);
  if (shopSlug) setStaffShopSlug(shopSlug);
  return { user: data.user, role: data.role };
}

/** Só considera logado no admin se entrou nesta barbearia (não usa sessão do painel SaaS). */
export async function verifyStaffShopAccess(slug: string): Promise<AuthUser | null> {
  const boundSlug = getStaffShopSlug();
  if (boundSlug !== slug) return null;

  const tokenKind: TokenKind | null = getToken('staff')
    ? 'staff'
    : getToken('platform')
      ? 'platform'
      : null;
  if (!tokenKind) return null;

  try {
    const data = await apiFetch<AuthUser & { role?: string }>(
      `/shops/${slug}/staff/session`,
      {},
      tokenKind
    );
    return { id: data.id, name: data.name, email: data.email };
  } catch (e) {
    const message = (e as Error).message || '';

    if (isAuthError(message)) {
      if (tokenKind === 'staff') setToken('staff', null);
      setStaffShopSlug(null);
      return null;
    }

    // API lenta/indisponível ou rota antiga: confia no token se /auth/me ainda responde
    try {
      const me = await fetchMe(tokenKind);
      if (me) return me;
    } catch {
      /* ignore */
    }

    return null;
  }
}

export async function requestPasswordReset(
  email: string,
  accountType: 'customer' | 'staff' = 'customer'
): Promise<string> {
  const data = await apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, accountType })
  });
  return data.message;
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string,
  accountType: 'customer' | 'staff' = 'customer'
): Promise<void> {
  await apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword, accountType })
  });
}

export function logoutCustomer() {
  setToken('customer', null);
}

export function logoutStaff() {
  setToken('staff', null);
  setStaffShopSlug(null);
}

export function logoutPlatform() {
  setToken('platform', null);
}

export async function fetchMe(kind: TokenKind): Promise<AuthUser | null> {
  if (!getToken(kind)) return null;
  try {
    return await apiFetch<AuthUser>('/auth/me', {}, kind);
  } catch {
    setToken(kind, null);
    return null;
  }
}

export function toChatUser(u: AuthUser): ChatUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    pinHash: '',
    createdAt: new Date().toISOString()
  };
}
