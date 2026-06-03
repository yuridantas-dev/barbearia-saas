import { Appointment, AppNotification } from './types';
import { shopStorageKey } from './shopStorage';

const NOTIFICATIONS_KEY = 'barber_notifications';

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function readNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(shopStorageKey(NOTIFICATIONS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function writeNotifications(notifications: AppNotification[]): void {
  localStorage.setItem(shopStorageKey(NOTIFICATIONS_KEY), JSON.stringify(notifications));
}

export function createCancellationNotifications(apt: Appointment, refundPixKey?: string): AppNotification[] {
  const now = new Date().toISOString();
  const dateLabel = formatDate(apt.date);
  const serviceLabel = apt.services.map(s => s.name).join(' + ');
  const notifs: AppNotification[] = [];

  if (apt.customerEmail) {
    notifs.push({
      id: 'notif-' + Math.random().toString().substring(2, 10),
      type: 'cancellation_user',
      recipientType: 'user',
      recipientId: apt.customerEmail,
      title: 'Agendamento cancelado',
      message: `Seu horário em ${dateLabel} às ${apt.time} com ${apt.barberName} (${serviceLabel}) foi cancelado com sucesso.`,
      appointmentId: apt.id,
      read: false,
      createdAt: now
    });
  }

  notifs.push({
    id: 'notif-' + Math.random().toString().substring(2, 10),
    type: 'cancellation_barber',
    recipientType: 'barber',
    recipientId: apt.barberId,
    title: 'Horário cancelado pelo cliente',
    message: `${apt.customerName} cancelou o agendamento de ${dateLabel} às ${apt.time} — ${serviceLabel}. O horário foi liberado na agenda.`,
    appointmentId: apt.id,
    read: false,
    createdAt: now
  });

  const paidAntecipado =
    apt.paymentType === 'antecipado' &&
    (apt.paymentStatus === 'pago' || apt.paymentStatus === 'confirmado');

  if (paidAntecipado) {
    const pixInfo = refundPixKey
      ? ` Chave PIX do cliente para devolução: ${refundPixKey}.`
      : ' Aguardando chave PIX do cliente para devolução.';
    notifs.push({
      id: 'notif-' + Math.random().toString().substring(2, 10),
      type: 'refund_required',
      recipientType: 'barber',
      recipientId: apt.barberId,
      title: 'Devolução PIX necessária',
      message: `⚠️ ${apt.customerName} cancelou um horário pago antecipadamente (R$ ${apt.totalValue}).${pixInfo}`,
      appointmentId: apt.id,
      read: false,
      createdAt: now
    });
  }

  return notifs;
}

export function appendNotifications(newOnes: AppNotification[]): AppNotification[] {
  const merged = [...newOnes, ...readNotifications()];
  writeNotifications(merged);
  return merged;
}

export function getBarberNotifications(barberId?: string): AppNotification[] {
  return readNotifications().filter(
    n => n.recipientType === 'barber' && (!barberId || n.recipientId === barberId)
  );
}

export function getUserNotifications(userEmail: string): AppNotification[] {
  return readNotifications().filter(
    n => n.recipientType === 'user' && n.recipientId === userEmail
  );
}

export function markNotificationRead(id: string): AppNotification[] {
  const updated = readNotifications().map(n => (n.id === id ? { ...n, read: true } : n));
  writeNotifications(updated);
  return updated;
}

export function clearNotifications(): void {
  localStorage.removeItem(shopStorageKey(NOTIFICATIONS_KEY));
}
