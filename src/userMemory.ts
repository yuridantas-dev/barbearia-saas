import { ChatUser } from './types';
import { shopStorageKey } from './shopStorage';

const USERS_KEY = 'barber_chat_users';
const CURRENT_USER_KEY = 'barber_current_user_id';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function hashPin(pin: string): string {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) h = (h * 33) ^ pin.charCodeAt(i);
  return `h${Math.abs(h).toString(36)}_${pin.length}`;
}

function readUsers(): ChatUser[] {
  try {
    const raw = localStorage.getItem(shopStorageKey(USERS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: ChatUser[]): void {
  localStorage.setItem(shopStorageKey(USERS_KEY), JSON.stringify(users));
}

export function findUserByEmail(email: string): ChatUser | undefined {
  return readUsers().find(u => u.email === normalizeEmail(email));
}

export function createUser(name: string, email: string, pin: string): ChatUser {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error('INVALID_EMAIL');
  const users = readUsers();
  if (users.some(u => u.email === normalized)) throw new Error('EMAIL_EXISTS');
  const user: ChatUser = {
    id: 'user-' + Math.random().toString().substring(2, 10),
    name: name.trim(),
    email: normalized,
    pinHash: hashPin(pin),
    createdAt: new Date().toISOString()
  };
  writeUsers([...users, user]);
  return user;
}

export function verifyLogin(email: string, pin: string): ChatUser | null {
  const user = findUserByEmail(email);
  if (!user || user.pinHash !== hashPin(pin)) return null;
  return user;
}

export function getCurrentUser(): ChatUser | null {
  const id = localStorage.getItem(shopStorageKey(CURRENT_USER_KEY));
  if (!id) return null;
  return readUsers().find(u => u.id === id) ?? null;
}

export function setCurrentUserId(userId: string | null): void {
  const key = shopStorageKey(CURRENT_USER_KEY);
  if (userId) localStorage.setItem(key, userId);
  else localStorage.removeItem(key);
}

export function logoutUser(): void {
  setCurrentUserId(null);
}

const RESET_KEY = 'barber_password_reset';

interface ResetEntry {
  email: string;
  code: string;
  expiresAt: number;
}

function readResetEntry(): ResetEntry | null {
  try {
    const raw = localStorage.getItem(shopStorageKey(RESET_KEY));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeResetEntry(entry: ResetEntry | null): void {
  const key = shopStorageKey(RESET_KEY);
  if (entry) localStorage.setItem(key, JSON.stringify(entry));
  else localStorage.removeItem(key);
}

/** Solicita redefinição local — retorna código demo se e-mail existir */
export function requestPasswordResetLocal(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!findUserByEmail(normalized)) return null;

  const code = String(Math.floor(100000 + Math.random() * 900000));
  writeResetEntry({
    email: normalized,
    code,
    expiresAt: Date.now() + 15 * 60 * 1000
  });
  return code;
}

export function resetPasswordLocal(email: string, code: string, pin: string): boolean {
  const normalized = normalizeEmail(email);
  const entry = readResetEntry();
  if (!entry || entry.email !== normalized) return false;
  if (entry.code !== code.replace(/\D/g, '')) return false;
  if (Date.now() > entry.expiresAt) return false;
  if (!/^\d{4}$/.test(pin)) return false;

  const users = readUsers();
  const idx = users.findIndex(u => u.email === normalized);
  if (idx === -1) return false;

  users[idx] = { ...users[idx], pinHash: hashPin(pin) };
  writeUsers(users);
  writeResetEntry(null);
  return true;
}

export function clearUserAccounts(): void {
  localStorage.removeItem(shopStorageKey(USERS_KEY));
  localStorage.removeItem(shopStorageKey(CURRENT_USER_KEY));
}
