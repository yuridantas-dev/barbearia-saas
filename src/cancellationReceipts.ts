import { CancellationReceipt, ChatMessage } from './types';
import { shopStorageKey } from './shopStorage';

const RECEIPTS_KEY = 'barber_cancellation_receipts';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function readReceipts(): CancellationReceipt[] {
  try {
    const raw = localStorage.getItem(shopStorageKey(RECEIPTS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeReceipts(receipts: CancellationReceipt[]): void {
  localStorage.setItem(shopStorageKey(RECEIPTS_KEY), JSON.stringify(receipts));
}

export function purgeExpiredCancellationReceipts(): CancellationReceipt[] {
  const now = Date.now();
  const active = readReceipts().filter(r => new Date(r.expiresAt).getTime() > now);
  writeReceipts(active);
  return active;
}

export function saveCancellationReceipt(
  receipt: Omit<CancellationReceipt, 'id' | 'createdAt' | 'expiresAt'>
): CancellationReceipt {
  const now = new Date();
  const saved: CancellationReceipt = {
    ...receipt,
    id: 'cancel-' + Math.random().toString().substring(2, 10),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ONE_DAY_MS).toISOString()
  };
  const others = purgeExpiredCancellationReceipts().filter(r => r.appointmentId !== saved.appointmentId);
  writeReceipts([saved, ...others]);
  return saved;
}

export function getActiveCancellationReceipts(ownerKey: string): CancellationReceipt[] {
  const now = Date.now();
  return purgeExpiredCancellationReceipts()
    .filter(r => r.ownerKey === ownerKey && new Date(r.expiresAt).getTime() > now)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function cancellationToChatMessage(receipt: CancellationReceipt): ChatMessage {
  return {
    id: `cancel-msg-${receipt.id}`,
    sender: 'assistant',
    text: receipt.summaryText,
    timestamp: new Date(receipt.createdAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    customType: 'cancellation-card',
    expiresAt: receipt.expiresAt
  };
}

export function clearAllCancellationReceipts(): void {
  localStorage.removeItem(shopStorageKey(RECEIPTS_KEY));
}
