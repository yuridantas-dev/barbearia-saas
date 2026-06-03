import { Service, Barber, Appointment, BarbeariaConfig } from './types';

export const DEFAULT_CONFIG: BarbeariaConfig = {
  name: "Navalha & Estilo",
  phone: "(11) 99999-8888",
  pixKey: "pix@navalhaestilo.com.br",
  cancelBufferHours: 2,
  openingTime: "09:00",
  closingTime: "19:00"
};

export const DEFAULT_SERVICES: Service[] = [
  { id: '1', name: 'Corte', price: 35, duration: 30, description: 'Corte de cabelo moderno ou clássico com lavagem inclusa' },
  { id: '2', name: 'Barba', price: 25, duration: 20, description: 'Barba alinhada com toalha quente e balm' },
  { id: '3', name: 'Corte + Barba', price: 55, duration: 50, description: 'Combo clássico: cabelo com técnica moderna e barba na toalha' },
  { id: '4', name: 'Corte + Barba + Listra freestyle', price: 75, duration: 70, description: 'Super combo com design exclusivo de listra freestyle' },
  { id: '5', name: 'Alinhamento / Sobrancelha', price: 15, duration: 15, description: 'Design de sobrancelha com pinça' },
  { id: '6', name: 'Pigmentação de Barba', price: 30, duration: 30, description: 'Correção de falhas com tintura de alta qualidade' }
];

export const DEFAULT_BARBERS: Barber[] = [
  { id: 'barber-1', name: 'Lucas "Navalha"', specialty: 'Cabelo & Freestyle', avatar: 'LN', rating: 4.9 },
  { id: 'barber-2', name: 'Mateus Duarte', specialty: 'Especialista em Barba', avatar: 'MD', rating: 4.8 },
  { id: 'barber-3', name: 'Gabriel Alencar', specialty: 'Cortes Clássicos & Degradê', avatar: 'GA', rating: 4.7 }
];

export const formatLocalDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getBaseDate = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const getRelativeDateStr = (offsetDays: number): string => {
  const d = getBaseDate();
  d.setDate(d.getDate() + offsetDays);
  return formatLocalDate(d);
};

export const getRelativeDays = (
  count = 5,
  labelFormat: 'chat' | 'agenda' = 'chat'
): { label: string; value: string }[] => {
  return Array.from({ length: count }, (_, offset) => {
    const d = getBaseDate();
    d.setDate(d.getDate() + offset);
    const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayNum = d.getDate();
    const dateStr = formatLocalDate(d);
    const label =
      labelFormat === 'agenda'
        ? `${dayLabel}, ${dayNum}/${d.toLocaleDateString('pt-BR', { month: '2-digit' })}`
        : `${dayLabel}, ${dayNum} ${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`;
    return { label, value: dateStr };
  });
};

// Helper to generate dates relative to today
const getRelativeDateStrLegacy = (offsetDays: number): string => getRelativeDateStr(offsetDays);

export const DEFAULT_APPOINTMENTS: Appointment[] = [
  // Appointments for June 3, 2026
  {
    id: 'apt-1',
    customerName: 'Rodrigo Silva',
    customerPhone: '(11) 98765-4321',
    services: [DEFAULT_SERVICES[0]], // Corte
    barberId: 'barber-1',
    barberName: 'Lucas "Navalha"',
    date: getRelativeDateStrLegacy(0),
    time: '09:30',
    totalValue: 35,
    totalDuration: 30,
    paymentType: 'local',
    paymentStatus: 'confirmado',
    createdAt: new Date('2026-06-02T10:00:00Z').toISOString()
  },
  {
    id: 'apt-2',
    customerName: 'Carlos Eduardo',
    customerPhone: '(11) 91234-5678',
    services: [DEFAULT_SERVICES[2]], // Corte + Barba
    barberId: 'barber-2',
    barberName: 'Mateus Duarte',
    date: getRelativeDateStrLegacy(0),
    time: '11:00',
    totalValue: 55,
    totalDuration: 50,
    paymentType: 'antecipado',
    paymentStatus: 'confirmado',
    createdAt: new Date('2026-06-02T14:30:00Z').toISOString()
  },
  {
    id: 'apt-3',
    customerName: 'Felipe Santos',
    customerPhone: '(11) 95555-4444',
    services: [DEFAULT_SERVICES[3]], // Corte + Barba + Listra
    barberId: 'barber-1',
    barberName: 'Lucas "Navalha"',
    date: getRelativeDateStrLegacy(0),
    time: '14:00',
    totalValue: 75,
    totalDuration: 70,
    paymentType: 'local',
    paymentStatus: 'confirmado',
    createdAt: new Date('2026-06-02T16:00:00Z').toISOString()
  },
  {
    id: 'apt-4',
    customerName: 'Bruno Oliveira',
    customerPhone: '(11) 97777-6666',
    services: [DEFAULT_SERVICES[1]], // Barba
    barberId: 'barber-3',
    barberName: 'Gabriel Alencar',
    date: getRelativeDateStrLegacy(0),
    time: '16:30',
    totalValue: 25,
    totalDuration: 20,
    paymentType: 'local',
    paymentStatus: 'confirmado',
    createdAt: new Date('2026-06-02T11:15:00Z').toISOString()
  },

  // Appointments for June 4, 2026 (Tomorrow)
  {
    id: 'apt-5',
    customerName: 'Thiago Martins',
    customerPhone: '(11) 99888-7777',
    services: [DEFAULT_SERVICES[0]], // Corte
    barberId: 'barber-2',
    barberName: 'Mateus Duarte',
    date: getRelativeDateStrLegacy(1),
    time: '10:00',
    totalValue: 35,
    totalDuration: 30,
    paymentType: 'local',
    paymentStatus: 'confirmado',
    createdAt: new Date('2026-06-02T15:22:00Z').toISOString()
  },
  {
    id: 'apt-6',
    customerName: 'André Castilho',
    customerPhone: '(11) 96666-5555',
    services: [DEFAULT_SERVICES[2]], // Corte + Barba
    barberId: 'barber-3',
    barberName: 'Gabriel Alencar',
    date: getRelativeDateStrLegacy(1),
    time: '13:00',
    totalValue: 55,
    totalDuration: 50,
    paymentType: 'antecipado',
    paymentStatus: 'confirmado',
    createdAt: new Date('2026-06-03T09:10:00Z').toISOString()
  },
  {
    id: 'apt-7',
    customerName: 'Gustavo Lima',
    customerPhone: '(11) 91111-2222',
    services: [DEFAULT_SERVICES[0]], // Corte
    barberId: 'barber-1',
    barberName: 'Lucas "Navalha"',
    date: getRelativeDateStrLegacy(1),
    time: '15:00',
    totalValue: 35,
    totalDuration: 30,
    paymentType: 'local',
    paymentStatus: 'confirmado',
    createdAt: new Date('2026-06-03T08:45:00Z').toISOString()
  }
];

export const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30"
];

export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const generateTimeSlots = (
  openingTime: string,
  closingTime: string,
  intervalMinutes = 30
): string[] => {
  const start = timeToMinutes(openingTime);
  const end = timeToMinutes(closingTime);
  const slots: string[] = [];
  for (let t = start; t < end; t += intervalMinutes) {
    slots.push(minutesToTime(t));
  }
  return slots;
};

const rangesOverlap = (startA: number, endA: number, startB: number, endB: number): boolean =>
  startA < endB && startB < endA;

/** Horário já passou no dia de hoje (não pode ser reservado). */
export const isPastSlot = (date: string, time: string): boolean => {
  const today = formatLocalDate(new Date());
  if (date !== today) return false;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(time) <= nowMinutes;
};

/** Verifica conflito com agendamentos existentes (cancelados já não estão na lista). */
export const hasAppointmentConflict = (
  appointments: Appointment[],
  date: string,
  barberId: string,
  startMinutes: number,
  endMinutes: number,
  excludeAppointmentId?: string
): boolean => {
  for (const apt of appointments) {
    if (excludeAppointmentId && apt.id === excludeAppointmentId) continue;
    if (apt.date !== date) continue;
    if (apt.barberId !== barberId) continue;
    const aptStart = timeToMinutes(apt.time);
    const aptEnd = aptStart + apt.totalDuration;
    if (rangesOverlap(startMinutes, endMinutes, aptStart, aptEnd)) return true;
  }
  return false;
};

/** Horário de início disponível para um barbeiro: cabe no expediente e não conflita. */
export const isSlotAvailable = (
  appointments: Appointment[],
  date: string,
  time: string,
  barberId: string,
  durationMinutes: number,
  openingTime: string,
  closingTime: string,
  excludeAppointmentId?: string
): boolean => {
  if (durationMinutes <= 0) return false;

  const start = timeToMinutes(time);
  const end = start + durationMinutes;
  const open = timeToMinutes(openingTime);
  const close = timeToMinutes(closingTime);

  if (start < open || end > close) return false;
  if (isPastSlot(date, time)) return false;

  return !hasAppointmentConflict(appointments, date, barberId, start, end, excludeAppointmentId);
};

/** @deprecated use isSlotAvailable */
export const isTimeSlotOccupied = (
  appointments: Appointment[],
  date: string,
  time: string,
  barberId: string,
  durationMinutes: number
): boolean => {
  const start = timeToMinutes(time);
  const end = start + durationMinutes;
  if (barberId === 'any') {
    return false;
  }
  return hasAppointmentConflict(appointments, date, barberId, start, end);
};

export const getAvailableBarbersForSlot = (
  appointments: Appointment[],
  barbers: Barber[],
  date: string,
  time: string,
  durationMinutes: number,
  openingTime: string,
  closingTime: string,
  excludeAppointmentId?: string
): Barber[] => {
  return barbers.filter(barber =>
    isSlotAvailable(appointments, date, time, barber.id, durationMinutes, openingTime, closingTime, excludeAppointmentId)
  );
};

export interface SlotAvailability {
  time: string;
  isFree: boolean;
  assignedBarber: Barber | null;
}

export const getSlotsAvailability = (
  appointments: Appointment[],
  barbers: Barber[],
  date: string,
  durationMinutes: number,
  openingTime: string,
  closingTime: string,
  preferredBarber: Barber | null,
  anyBarber: boolean,
  excludeAppointmentId?: string
): SlotAvailability[] => {
  const slots = generateTimeSlots(openingTime, closingTime);

  return slots.map(time => {
    if (anyBarber) {
      const available = getAvailableBarbersForSlot(
        appointments,
        barbers,
        date,
        time,
        durationMinutes,
        openingTime,
        closingTime,
        excludeAppointmentId
      );
      return {
        time,
        isFree: available.length > 0,
        assignedBarber: available[0] ?? null
      };
    }

    if (!preferredBarber) {
      return { time, isFree: false, assignedBarber: null };
    }

    const isFree = isSlotAvailable(
      appointments,
      date,
      time,
      preferredBarber.id,
      durationMinutes,
      openingTime,
      closingTime,
      excludeAppointmentId
    );
    return {
      time,
      isFree,
      assignedBarber: isFree ? preferredBarber : null
    };
  });
};
