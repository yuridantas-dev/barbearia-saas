export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  description?: string;
}

export interface Barber {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  rating: number;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  services: Service[];
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  totalValue: number;
  totalDuration: number;
  paymentType: 'antecipado' | 'local';
  paymentStatus: 'pendente' | 'pago' | 'confirmado';
  createdAt: string;
}

export interface AppointmentCoupon {
  id: string;
  appointmentId: string;
  ownerKey: string;
  summaryText: string;
  paymentLabel: string;
  createdAt: string;
  expiresAt: string;
}

export interface CancellationReceipt {
  id: string;
  appointmentId: string;
  ownerKey: string;
  summaryText: string;
  createdAt: string;
  expiresAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  options?: { label: string; value: string; action?: string }[];
  customType?:
    | 'service-select'
    | 'barber-select'
    | 'datetime-select'
    | 'pix-payment'
    | 'appointment-card'
    | 'cancellation-card'
    | 'cancel-select-widget'
    | 'my-appointments-list';
  expiresAt?: string;
}

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  pinHash: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'cancellation_user' | 'cancellation_barber' | 'refund_required';
  recipientType: 'user' | 'barber';
  recipientId: string;
  title: string;
  message: string;
  appointmentId: string;
  read: boolean;
  createdAt: string;
}

export interface BarbeariaConfig {
  name: string;
  phone: string;
  pixKey: string;
  cancelBufferHours: number; // e.g. 2 hours
  openingTime: string; // "09:00"
  closingTime: string; // "19:00"
}
