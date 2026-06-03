import { AppointmentCoupon, ChatMessage, Appointment } from './types';
import { shopStorageKey } from './shopStorage';

const COUPONS_KEY = 'barber_coupons';

function readCoupons(): AppointmentCoupon[] {
  try {
    const raw = localStorage.getItem(shopStorageKey(COUPONS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCoupons(coupons: AppointmentCoupon[]): void {
  localStorage.setItem(shopStorageKey(COUPONS_KEY), JSON.stringify(coupons));
}

export function getOwnerKey(email?: string, guestName?: string): string {
  if (email) return `user:${email.toLowerCase()}`;
  if (guestName) return `guest:${guestName.trim().toLowerCase()}`;
  return 'guest:anonymous';
}

export function purgeExpiredCoupons(): AppointmentCoupon[] {
  const now = Date.now();
  const active = readCoupons().filter(c => new Date(c.expiresAt).getTime() > now);
  writeCoupons(active);
  return active;
}

/** Cupom válido até o fim do dia do atendimento (23:59:59). */
export function getCouponExpiryFromAppointment(date: string, _time: string, _durationMinutes: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

export function buildCouponSummary(apt: Pick<Appointment, 'customerName' | 'services' | 'barberName' | 'date' | 'time' | 'totalValue' | 'paymentType'>): string {
  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };
  const paymentLabel = apt.paymentType === 'antecipado' ? '💳 Antecipado (Enviado PIX)' : '💵 Presencial (No Local)';
  return (
    `Agendamento confirmado! Resumo:\n\n` +
    `👤 Cliente: ${apt.customerName}\n` +
    `✂️ Serviço: ${apt.services.map(s => s.name).join(' + ')}\n` +
    `👨 Profissional: ${apt.barberName}\n` +
    `📅 Data: ${formatDate(apt.date)} às ${apt.time}\n` +
    `💰 Valor: R$ ${apt.totalValue}\n` +
    `💳 Pagamento: ${paymentLabel}\n\n` +
    `Apresente este cupom ao chegar na barbearia.`
  );
}

export function saveCoupon(
  coupon: Omit<AppointmentCoupon, 'id' | 'createdAt' | 'expiresAt'>,
  appointmentDate: string,
  appointmentTime: string,
  durationMinutes: number
): AppointmentCoupon {
  const now = new Date();
  const saved: AppointmentCoupon = {
    ...coupon,
    id: 'coupon-' + Math.random().toString().substring(2, 10),
    createdAt: now.toISOString(),
    expiresAt: getCouponExpiryFromAppointment(appointmentDate, appointmentTime, durationMinutes)
  };
  const others = purgeExpiredCoupons().filter(c => c.appointmentId !== saved.appointmentId);
  writeCoupons([saved, ...others]);
  return saved;
}

export function updateCouponForAppointment(
  appointmentId: string,
  appointmentDate: string,
  appointmentTime: string,
  durationMinutes: number,
  summaryText: string,
  paymentLabel: string,
  ownerKey: string
): AppointmentCoupon {
  const expiresAt = getCouponExpiryFromAppointment(appointmentDate, appointmentTime, durationMinutes);
  const coupons = purgeExpiredCoupons();
  const existing = coupons.find(c => c.appointmentId === appointmentId);
  if (existing) {
    const updated: AppointmentCoupon = { ...existing, summaryText, paymentLabel, expiresAt };
    writeCoupons([updated, ...coupons.filter(c => c.appointmentId !== appointmentId)]);
    return updated;
  }
  return saveCoupon({ appointmentId, ownerKey, summaryText, paymentLabel }, appointmentDate, appointmentTime, durationMinutes);
}

export function getActiveCoupons(ownerKey: string): AppointmentCoupon[] {
  const now = Date.now();
  return purgeExpiredCoupons()
    .filter(c => c.ownerKey === ownerKey && new Date(c.expiresAt).getTime() > now)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getActiveCouponByAppointmentId(appointmentId: string): AppointmentCoupon | undefined {
  const now = Date.now();
  return purgeExpiredCoupons().find(
    c => c.appointmentId === appointmentId && new Date(c.expiresAt).getTime() > now
  );
}

export function removeCouponByAppointmentId(appointmentId: string): void {
  writeCoupons(readCoupons().filter(c => c.appointmentId !== appointmentId));
}

export function couponToChatMessage(coupon: AppointmentCoupon): ChatMessage {
  return {
    id: `coupon-msg-${coupon.id}`,
    sender: 'assistant',
    text: coupon.summaryText,
    timestamp: new Date(coupon.createdAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    customType: 'appointment-card',
    expiresAt: coupon.expiresAt
  };
}

export function clearAllCoupons(): void {
  localStorage.removeItem(shopStorageKey(COUPONS_KEY));
}

export function formatCouponExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
