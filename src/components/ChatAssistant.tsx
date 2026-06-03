import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scissors, User, CheckCircle2, RefreshCw, Send, ArrowRight, LogOut, Calendar, XCircle } from 'lucide-react';
import { Service, Barber, Appointment, ChatMessage, BarbeariaConfig, ChatUser } from '../types';
import { getRelativeDays, getSlotsAvailability, isSlotAvailable } from '../data';
import {
  registerCustomer,
  loginCustomer,
  logoutCustomer,
  fetchMe,
  toChatUser,
  requestPasswordReset,
  resetPasswordWithCode
} from '../api/authApi';
import { checkApiHealth } from '../api/client';
import {
  saveCoupon,
  buildCouponSummary,
  updateCouponForAppointment,
  getOwnerKey,
  getActiveCouponByAppointmentId,
  removeCouponByAppointmentId,
  formatCouponExpiry
} from '../coupons';
import {
  saveCancellationReceipt,
  getActiveCancellationReceipts,
  cancellationToChatMessage
} from '../cancellationReceipts';
import { normalizeEmail, isValidEmail, getCurrentUser, setCurrentUserId, createUser, verifyLogin, logoutUser, requestPasswordResetLocal, resetPasswordLocal } from '../userMemory';

interface ChatAssistantProps {
  useApi?: boolean;
  config: BarbeariaConfig;
  services: Service[];
  barbers: Barber[];
  appointments: Appointment[];
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => void;
  onCancelAppointment: (id: string, refundPixKey?: string) => void;
}

type Step =
  | 'AUTH_GATE'
  | 'AUTH_LOGIN_EMAIL'
  | 'AUTH_LOGIN_PIN'
  | 'AUTH_FORGOT_EMAIL'
  | 'AUTH_FORGOT_CODE'
  | 'AUTH_FORGOT_NEW_PIN'
  | 'AUTH_FORGOT_PIN_CONFIRM'
  | 'AUTH_REGISTER_NAME'
  | 'AUTH_REGISTER_EMAIL'
  | 'AUTH_REGISTER_PIN'
  | 'AUTH_REGISTER_PIN_CONFIRM'
  | 'USER_DASHBOARD'
  | 'NOTIF_ASK'
  | 'SERVICE_SELECT'
  | 'SERVICE_CONFIRM'
  | 'BARBER_SELECT'
  | 'DATETIME_SELECT'
  | 'DATETIME_CONFIRM'
  | 'PAYMENT_CHOICE'
  | 'PAYMENT_PIX'
  | 'FINAL_CONFIRMED'
  | 'CANCEL_COLLECT_INFO'
  | 'CANCEL_SELECTION'
  | 'CANCEL_PIX_KEY'
  | 'RESCHEDULE_DATETIME'
  | 'RESCHEDULE_CONFIRM';

export default function ChatAssistant({
  useApi,
  config,
  services,
  barbers,
  appointments,
  onAddAppointment,
  onUpdateAppointment,
  onCancelAppointment
}: ChatAssistantProps) {
  const apiMode = useApi ?? false;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>('AUTH_GATE');
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(() => getCurrentUser());
  const [authDraft, setAuthDraft] = useState({ name: '', email: '', pin: '', resetCode: '' });
  const [bootstrapped, setBootstrapped] = useState(false);
  const [displayAppointments, setDisplayAppointments] = useState<Appointment[]>([]);

  // Schedulable info state
  const [clientName, setClientName] = useState('');
  const [notifEnabled, setNotifEnabled] = useState<boolean | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [isAnyBarber, setIsAnyBarber] = useState(false);
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD
  const [selectedTime, setSelectedTime] = useState(''); // HH:MM
  const [paymentChoice, setPaymentChoice] = useState<'antecipado' | 'local' | null>(null);

  // Cancellation flow state
  const [cancelNameInput, setCancelNameInput] = useState('');
  const [cancelDateInput, setCancelDateInput] = useState('');
  const [foundCancelAppointments, setFoundCancelAppointments] = useState<Appointment[]>([]);
  const [pendingCancelAppointment, setPendingCancelAppointment] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const isPaidAntecipado = (apt: Appointment) =>
    apt.paymentType === 'antecipado' &&
    (apt.paymentStatus === 'pago' || apt.paymentStatus === 'confirmado');

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (bootstrapped || messages.length > 0) return;
    setBootstrapped(true);
    (async () => {
      if (apiMode) {
        const user = await fetchMe('customer');
        if (user) {
          setCurrentUser(toChatUser(user));
          showUserDashboard(toChatUser(user));
          return;
        }
      } else {
        const user = getCurrentUser();
        if (user) {
          setCurrentUser(user);
          showUserDashboard(user);
          return;
        }
      }
      triggerAuthGate();
    })();
  }, [bootstrapped, messages.length, apiMode]);

  const formatSelectedDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getUserAppointments = (user: ChatUser, extra: Appointment[] = []): Appointment[] => {
    const email = user.email.toLowerCase();
    const name = user.name.toLowerCase();
    const seen = new Set<string>();
    return [...extra, ...appointments]
      .filter(apt => {
        if (seen.has(apt.id)) return false;
        const match =
          apt.customerEmail?.toLowerCase() === email ||
          apt.customerName.toLowerCase() === name ||
          apt.customerName.toLowerCase().includes(name);
        if (!match) return false;
        seen.add(apt.id);
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  };

  const getPersistedMessages = (ownerKey: string): ChatMessage[] => {
    return getActiveCancellationReceipts(ownerKey)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(r => cancellationToChatMessage(r));
  };

  const showUserDashboard = (user: ChatUser) => {
    setClientName(user.name);
    setCurrentStep('USER_DASHBOARD');
    const persisted = getPersistedMessages(getOwnerKey(user.email));
    setTimeout(() => {
      setMessages([
        ...persisted,
        {
          id: 'welcome-back',
          sender: 'assistant',
          text: `Seja bem-vindo(a) de volta, ${user.name}! 👋\n\nComo posso te ajudar hoje?`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          options: [
            { label: '📅 Ver meus agendamentos', value: 'menu_show_appointments' },
            { label: '✂️ Criar novo agendamento', value: 'menu_new_booking' }
          ]
        }
      ]);
    }, 200);
  };

  const appendDashboardMenu = () => {
    setCurrentStep('USER_DASHBOARD');
    addSystemMessage('O que deseja fazer agora?', [
      { label: '📅 Ver meus agendamentos', value: 'menu_show_appointments' },
      { label: '✂️ Criar novo agendamento', value: 'menu_new_booking' }
    ]);
  };

  const triggerAuthGate = () => {
    setCurrentStep('AUTH_GATE');
    setMessages([
      {
        id: 'auth-intro',
        sender: 'assistant',
        text: `Olá! Sou a assistente virtual da ${config.name}.\n\nCrie sua conta ou entre para agendar.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        options: [
          { label: '✨ Criar minha conta', value: 'auth_register' },
          { label: '🔑 Já tenho conta — Entrar', value: 'auth_login' },
          { label: '🔓 Esqueci minha senha', value: 'auth_forgot' }
        ]
      }
    ]);
  };

  const startBookingForUser = (user: ChatUser) => {
    setClientName(user.name);
    setNotifEnabled(null);
    setSelectedServices([]);
    setSelectedBarber(null);
    setIsAnyBarber(false);
    setSelectedDate('');
    setSelectedTime('');
    setPaymentChoice(null);
    setCurrentStep('NOTIF_ASK');
    addSystemMessage(
      `Vamos agendar seu horário, ${user.name}!\n\nGostaria de ativar lembretes para as atualizações do seu agendamento?`,
      [
        { label: '🔔 Sim, por favor', value: 'yes' },
        { label: '🔕 Não precisa', value: 'no' }
      ]
    );
  };

  const startReschedule = (apt: Appointment) => {
    const barber = barbers.find(b => b.id === apt.barberId) ?? null;
    setRescheduleTarget(apt);
    setSelectedServices(apt.services);
    setSelectedBarber(barber);
    setIsAnyBarber(false);
    setSelectedDate(apt.date);
    setSelectedTime(apt.time);
    setCurrentStep('RESCHEDULE_DATETIME');
    addUserMessage(`Quero remarcar o horário de ${formatSelectedDate(apt.date)} às ${apt.time}.`);
    addSystemMessage(
      `Sem problemas! Escolha o novo dia e horário para ${apt.services.map(s => s.name).join(' + ')} com ${apt.barberName}:`,
      [],
      'datetime-select'
    );
  };

  const completeReschedule = () => {
    if (!rescheduleTarget || !selectedBarber) return;

    const paymentLabel =
      rescheduleTarget.paymentType === 'antecipado'
        ? '💳 Antecipado (Enviado PIX)'
        : '💵 Presencial (No Local)';

    const updatedApt: Appointment = {
      ...rescheduleTarget,
      date: selectedDate,
      time: selectedTime,
      barberId: selectedBarber.id,
      barberName: selectedBarber.name
    };

    onUpdateAppointment(rescheduleTarget.id, {
      date: selectedDate,
      time: selectedTime,
      barberId: selectedBarber.id,
      barberName: selectedBarber.name
    });

    const summaryText = buildCouponSummary(updatedApt);
    const ownerKey = getOwnerKey(currentUser?.email || updatedApt.customerEmail, updatedApt.customerName);
    const coupon = updateCouponForAppointment(
      rescheduleTarget.id,
      selectedDate,
      selectedTime,
      updatedApt.totalDuration,
      summaryText,
      paymentLabel,
      ownerKey
    );

    setRescheduleTarget(null);
    setDisplayAppointments(prev =>
      prev.map(a => (a.id === updatedApt.id ? updatedApt : a))
    );

    addSystemMessage(
      `✅ Agendamento remarcado com sucesso!\n\n` +
        `📅 Novo horário: ${formatSelectedDate(selectedDate)} às ${selectedTime}\n` +
        `👨 Profissional: ${selectedBarber.name}\n\n` +
        `Seu cupom foi atualizado. O barbeiro também verá a alteração na agenda.`,
      [],
      'appointment-card',
      coupon.expiresAt
    );

    setTimeout(() => appendDashboardMenu(), 1500);
  };

  const showMyAppointments = (user: ChatUser, extra: Appointment[] = []) => {
    const records = getUserAppointments(user, extra);
    setDisplayAppointments(records);
    addUserMessage('Quero ver meus agendamentos.');
    if (records.length === 0) {
      addSystemMessage('Você ainda não possui agendamentos ativos.', [
        { label: '✂️ Criar novo agendamento', value: 'menu_new_booking' }
      ]);
      return;
    }
    addSystemMessage(
      `Você tem ${records.length} agendamento(s) ativo(s). Seus cupons ficam válidos até o dia do atendimento:`,
      [],
      'my-appointments-list'
    );
  };

  const startCancelForUser = (user: ChatUser) => {
    const records = getUserAppointments(user);
    addUserMessage('Quero cancelar um agendamento.');
    if (records.length === 0) {
      addSystemMessage('Você não possui agendamentos para cancelar.', [
        { label: '✂️ Criar novo agendamento', value: 'menu_new_booking' }
      ]);
      return;
    }
    setFoundCancelAppointments(records);
    setCurrentStep('CANCEL_SELECTION');
    addSystemMessage('Selecione qual agendamento deseja cancelar:', [], 'cancel-select-widget');
  };

  const completeRegistration = async () => {
    try {
      let user: ChatUser;
      if (apiMode) {
        const u = await registerCustomer(authDraft.name, authDraft.email, authDraft.pin);
        user = toChatUser(u);
      } else {
        user = createUser(authDraft.name, authDraft.email, authDraft.pin);
        setCurrentUserId(user.id);
      }
      setCurrentUser(user);
      addSystemMessage(`Conta criada, ${user.name}! 🎉 E-mail: ${user.email}`);
      setTimeout(() => startBookingForUser(user), 1000);
    } catch (e) {
      const err = (e as Error).message;
      if (err.includes('cadastrado') || err === 'EMAIL_EXISTS') {
        addSystemMessage('Este e-mail já está cadastrado.', [
          { label: '🔑 Entrar', value: 'auth_login' },
          { label: '✏️ Outro e-mail', value: 'auth_register' }
        ]);
        setCurrentStep('AUTH_GATE');
      } else {
        addSystemMessage(err || 'E-mail inválido. Tente novamente.');
        setCurrentStep('AUTH_REGISTER_EMAIL');
      }
    }
  };

  const handleLogout = () => {
    if (!confirm('Sair da sua conta?')) return;
    if (apiMode) logoutCustomer();
    else logoutUser();
    setCurrentUser(null);
    setAuthDraft({ name: '', email: '', pin: '', resetCode: '' });
    setMessages([]);
    setBootstrapped(false);
    setTimeout(triggerAuthGate, 100);
  };

  // System responses with elegant typing delay
  const addSystemMessage = (
    text: string,
    options?: { label: string; value: string; action?: string }[],
    customType?: ChatMessage['customType'],
    expiresAt?: string
  ) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'assistant',
          text,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          options,
          customType,
          expiresAt
        }
      ]);
    }, 1100);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const startForgotPassword = () => {
    setAuthDraft({ name: '', email: '', pin: '', resetCode: '' });
    setCurrentStep('AUTH_FORGOT_EMAIL');
    addSystemMessage('Digite o e-mail da sua conta. Enviaremos um código de 6 dígitos para redefinir sua senha.');
  };

  const promptAuthForBooking = () => {
    setCurrentStep('AUTH_GATE');
    addSystemMessage('Para agendar, crie sua conta ou entre:', [
      { label: '✨ Criar minha conta', value: 'auth_register' },
      { label: '🔑 Já tenho conta — Entrar', value: 'auth_login' },
      { label: '🔓 Esqueci minha senha', value: 'auth_forgot' }
    ]);
  };

  const handleSend = (textToSend?: string, optionValue?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (!textToSend) setInputText('');
    addUserMessage(text);

    if (optionValue === 'restart_booking') {
      if (currentUser) startBookingForUser(currentUser);
      else promptAuthForBooking();
      return;
    }

    if (optionValue === 'auth_forgot') {
      startForgotPassword();
      return;
    }

    // Auth
    if (currentStep === 'AUTH_GATE') {
      if (optionValue === 'auth_register') {
        setAuthDraft({ name: '', email: '', pin: '', resetCode: '' });
        setCurrentStep('AUTH_REGISTER_NAME');
        addSystemMessage('Qual é o seu nome completo?');
      } else if (optionValue === 'auth_login') {
        setAuthDraft({ name: '', email: '', pin: '', resetCode: '' });
        setCurrentStep('AUTH_LOGIN_EMAIL');
        addSystemMessage('Digite seu e-mail cadastrado:');
      }
      return;
    }
    if (currentStep === 'AUTH_LOGIN_EMAIL') {
      if (!isValidEmail(text)) {
        addSystemMessage('E-mail inválido. Use: seu.nome@email.com');
        return;
      }
      setAuthDraft(p => ({ ...p, email: normalizeEmail(text) }));
      setCurrentStep('AUTH_LOGIN_PIN');
      addSystemMessage('Digite sua senha de 4 dígitos:', [
        { label: '🔓 Esqueci minha senha', value: 'auth_forgot' }
      ]);
      return;
    }
    if (currentStep === 'AUTH_LOGIN_PIN') {
      const pin = text.replace(/\D/g, '');
      if (apiMode) {
        loginCustomer(authDraft.email, pin)
          .then(u => {
            const user = toChatUser(u);
            setCurrentUser(user);
            setMessages([]);
            setTimeout(() => showUserDashboard(user), 300);
          })
          .catch(() => {
            addSystemMessage('E-mail ou senha incorretos.', [
              { label: '🔑 Tentar de novo', value: 'auth_login' },
              { label: '🔓 Esqueci minha senha', value: 'auth_forgot' }
            ]);
            setCurrentStep('AUTH_GATE');
          });
        return;
      }
      const user = verifyLogin(authDraft.email, pin);
      if (!user) {
        addSystemMessage('E-mail ou senha incorretos.', [
          { label: '🔑 Tentar de novo', value: 'auth_login' },
          { label: '🔓 Esqueci minha senha', value: 'auth_forgot' }
        ]);
        setCurrentStep('AUTH_GATE');
        return;
      }
      setCurrentUserId(user.id);
      setCurrentUser(user);
      setMessages([]);
      setTimeout(() => showUserDashboard(user), 300);
      return;
    }
    if (currentStep === 'AUTH_FORGOT_EMAIL') {
      if (!isValidEmail(text)) {
        addSystemMessage('E-mail inválido. Use: seu.nome@email.com');
        return;
      }
      const email = normalizeEmail(text);
      setAuthDraft(p => ({ ...p, email }));

      if (apiMode) {
        requestPasswordReset(email, 'customer')
          .then(msg => {
            setCurrentStep('AUTH_FORGOT_CODE');
            addSystemMessage(
              `${msg}\n\nDigite o código de 6 dígitos recebido por e-mail.\n(Sem e-mail configurado? Veja o terminal da API — dev:server.)`
            );
          })
          .catch(() => {
            addSystemMessage('Não foi possível enviar o código. Tente novamente.', [
              { label: '🔓 Tentar de novo', value: 'auth_forgot' },
              { label: '🔑 Voltar ao login', value: 'auth_login' }
            ]);
            setCurrentStep('AUTH_GATE');
          });
        return;
      }

      const demoCode = requestPasswordResetLocal(email);
      setCurrentStep('AUTH_FORGOT_CODE');
      addSystemMessage(
        demoCode
          ? `Se este e-mail estiver cadastrado, enviamos um código.\n\nModo demo — seu código: **${demoCode}**\n\nDigite o código de 6 dígitos:`
          : 'Se este e-mail estiver cadastrado, enviamos um código.\n\nDigite o código de 6 dígitos:'
      );
      return;
    }
    if (currentStep === 'AUTH_FORGOT_CODE') {
      const code = text.replace(/\D/g, '');
      if (code.length !== 6) {
        addSystemMessage('O código deve ter 6 dígitos. Tente novamente:');
        return;
      }
      setAuthDraft(p => ({ ...p, resetCode: code }));
      setCurrentStep('AUTH_FORGOT_NEW_PIN');
      addSystemMessage('Crie uma nova senha de 4 dígitos:');
      return;
    }
    if (currentStep === 'AUTH_FORGOT_NEW_PIN') {
      const pin = text.replace(/\D/g, '');
      if (pin.length !== 4) {
        addSystemMessage('A senha deve ter 4 dígitos. Tente novamente:');
        return;
      }
      setAuthDraft(p => ({ ...p, pin }));
      setCurrentStep('AUTH_FORGOT_PIN_CONFIRM');
      addSystemMessage('Confirme a nova senha:');
      return;
    }
    if (currentStep === 'AUTH_FORGOT_PIN_CONFIRM') {
      const confirm = text.replace(/\D/g, '');
      if (confirm !== authDraft.pin) {
        addSystemMessage('Senhas não coincidem. Digite a nova senha novamente:');
        setCurrentStep('AUTH_FORGOT_NEW_PIN');
        return;
      }

      if (apiMode) {
        resetPasswordWithCode(authDraft.email, authDraft.resetCode, authDraft.pin, 'customer')
          .then(() => {
            addSystemMessage('Senha redefinida com sucesso! Agora faça login:', [
              { label: '🔑 Entrar', value: 'auth_login' }
            ]);
            setCurrentStep('AUTH_GATE');
          })
          .catch(() => {
            addSystemMessage('Código inválido ou expirado.', [
              { label: '🔓 Solicitar novo código', value: 'auth_forgot' },
              { label: '🔑 Voltar ao login', value: 'auth_login' }
            ]);
            setCurrentStep('AUTH_GATE');
          });
        return;
      }

      const ok = resetPasswordLocal(authDraft.email, authDraft.resetCode, authDraft.pin);
      if (!ok) {
        addSystemMessage('Código inválido ou expirado.', [
          { label: '🔓 Solicitar novo código', value: 'auth_forgot' },
          { label: '🔑 Voltar ao login', value: 'auth_login' }
        ]);
        setCurrentStep('AUTH_GATE');
        return;
      }

      addSystemMessage('Senha redefinida com sucesso! Agora faça login:', [
        { label: '🔑 Entrar', value: 'auth_login' }
      ]);
      setCurrentStep('AUTH_GATE');
      return;
    }
    if (currentStep === 'AUTH_REGISTER_NAME') {
      setAuthDraft(p => ({ ...p, name: text }));
      setCurrentStep('AUTH_REGISTER_EMAIL');
      addSystemMessage('Qual e-mail deseja usar para login?');
      return;
    }
    if (currentStep === 'AUTH_REGISTER_EMAIL') {
      if (!isValidEmail(text)) {
        addSystemMessage('E-mail inválido.');
        return;
      }
      setAuthDraft(p => ({ ...p, email: normalizeEmail(text) }));
      setCurrentStep('AUTH_REGISTER_PIN');
      addSystemMessage('Crie uma senha numérica de 4 dígitos:');
      return;
    }
    if (currentStep === 'AUTH_REGISTER_PIN') {
      setAuthDraft(p => ({ ...p, pin: text.replace(/\D/g, '') }));
      setCurrentStep('AUTH_REGISTER_PIN_CONFIRM');
      addSystemMessage('Confirme a senha:');
      return;
    }
    if (currentStep === 'AUTH_REGISTER_PIN_CONFIRM') {
      if (text.replace(/\D/g, '') !== authDraft.pin) {
        addSystemMessage('Senhas não coincidem. Digite novamente:');
        return;
      }
      completeRegistration();
      return;
    }
    if (currentStep === 'USER_DASHBOARD') {
      if (optionValue === 'menu_new_booking' && currentUser) startBookingForUser(currentUser);
      else if (optionValue === 'menu_show_appointments' && currentUser) showMyAppointments(currentUser);
      else if (currentUser && (text.toLowerCase().includes('agendar') || text.toLowerCase().includes('novo'))) startBookingForUser(currentUser);
      else if (currentUser && text.toLowerCase().includes('ver')) showMyAppointments(currentUser);
      else addSystemMessage('Escolha uma opção acima.', [
        { label: '📅 Ver meus agendamentos', value: 'menu_show_appointments' },
        { label: '✂️ Criar novo agendamento', value: 'menu_new_booking' }
      ]);
      return;
    }

    // Booking flow
    if (currentStep === 'NOTIF_ASK') {
      const isYes = optionValue === 'yes' || text.toLowerCase().includes('sim');
      setNotifEnabled(isYes);
      setCurrentStep('SERVICE_SELECT');
      addSystemMessage(
        "Por qual serviço você está procurando?\nVocê pode combinar mais de um serviço se desejar! Selecione abaixo os serviços desejados.",
        [],
        'service-select'
      );
    } else if (currentStep === 'SERVICE_SELECT') {
      // If user typed some text manually but didn't pick from the list visual elements, try to match it
      const matched = services.find(s => text.toLowerCase().includes(s.name.toLowerCase()));
      if (matched) {
        handleServiceConfirm([matched]);
      } else {
        addSystemMessage("Por favor, selecione os serviços desejados no menu acima para combinarmos os valores e durações corretamente.");
      }
    } else if (currentStep === 'SERVICE_CONFIRM') {
      const isPositive =
        optionValue === 'confirm_services' ||
        ['sim', 'correto', 'certo', 'ok', 'yes', 'confirmar'].some(t => text.toLowerCase().includes(t));
      if (isPositive) {
        setCurrentStep('BARBER_SELECT');
        addSystemMessage("Com qual profissional você prefere ser atendido?", [], 'barber-select');
      } else {
        // Redo service selection
        setSelectedServices([]);
        setCurrentStep('SERVICE_SELECT');
        addSystemMessage("Sem problemas, vamos escolher de novo. Por qual serviço você está procurando?", [], 'service-select');
      }
    } else if (currentStep === 'BARBER_SELECT') {
      // Handle user matching manually
      const matchedBarber = barbers.find(b => text.toLowerCase().includes(b.name.toLowerCase()));
      if (matchedBarber) {
        handleBarberSelect(matchedBarber);
      } else if (text.toLowerCase().includes('sem preferência') || text.toLowerCase().includes('qualquer') || text.toLowerCase().includes('primeiro')) {
        handleBarberSelect(null, true);
      } else {
        addSystemMessage("Por favor, escolha um dos profissionais listados acima ou selecione 'Sem preferência'.");
      }
    } else if (currentStep === 'DATETIME_SELECT' || currentStep === 'RESCHEDULE_DATETIME') {
      addSystemMessage("Para definir data e horário, por favor selecione um dos dias e horários disponíveis na ferramenta acima.");
    } else if (currentStep === 'RESCHEDULE_CONFIRM') {
      if (optionValue === 'choose_reschedule_time') {
        setCurrentStep('RESCHEDULE_DATETIME');
        addSystemMessage('Escolha o novo dia e horário:', [], 'datetime-select');
      } else {
        const isPositive =
          optionValue === 'confirm_reschedule' ||
          ['sim', 'confirmar', 'ok', 'confirmado'].some(t => text.toLowerCase().includes(t));
        if (isPositive) {
          completeReschedule();
        } else {
          setCurrentStep('RESCHEDULE_DATETIME');
          addSystemMessage('Escolha outro horário para remarcar.', [], 'datetime-select');
        }
      }
    } else if (currentStep === 'DATETIME_CONFIRM') {
      if (optionValue === 'choose_another_time') {
        setCurrentStep('DATETIME_SELECT');
        addSystemMessage('Vamos escolher outro horário.', [], 'datetime-select');
      } else {
        const isPositive =
          optionValue === 'confirm_datetime' ||
          ['sim', 'correto', 'ok', 'confirmar', 'confirmado'].some(t => text.toLowerCase().includes(t));
        if (isPositive) {
          setCurrentStep('PAYMENT_CHOICE');
          addSystemMessage('Deseja pagar antecipadamente por PIX?', [
            { label: '💳 Sim, pagar por PIX agora', value: 'pix_now' },
            { label: '💵 Pagar no local', value: 'pay_locally' }
          ]);
        } else {
          setCurrentStep('DATETIME_SELECT');
          addSystemMessage('Escolha outro dia/hora.', [], 'datetime-select');
        }
      }
    } else if (currentStep === 'PAYMENT_CHOICE') {
      const isPix =
        optionValue === 'pix_now' ||
        text.toLowerCase().includes('pix') ||
        (text.toLowerCase().includes('sim') && !text.toLowerCase().includes('local'));
      if (isPix) {
        setPaymentChoice('antecipado');
        setCurrentStep('PAYMENT_PIX');
        addSystemMessage(
          `Ótimo! Preparamos um PIX exclusivo para você no valor de R$ ${calculateTotalValue()}. Faça o escaneamento do QR Code abaixo ou utilize a Chave Copie-e-Cole para pagar com segurança.`,
          [],
          'pix-payment'
        );
      } else {
        setPaymentChoice('local');
        triggerFinalConfirmation('local', 'pendente');
      }
    } else if (currentStep === 'PAYMENT_PIX') {
      // User says they paid
      triggerFinalConfirmation('antecipado', 'confirmado');
    } else if (currentStep === 'CANCEL_COLLECT_INFO') {
      handleCancelLookup(text);
    } else if (currentStep === 'CANCEL_PIX_KEY') {
      const pixKey = text.trim();
      if (pixKey.length < 5) {
        addSystemMessage('Chave PIX muito curta. Informe CPF, e-mail, telefone (com DDD) ou chave aleatória.');
        return;
      }
      if (pendingCancelAppointment) {
        completeCancellation(pendingCancelAppointment, pixKey);
        setPendingCancelAppointment(null);
      }
    }
  };

  // Action helpers called by visual buttons inside components
  const handleServiceSelectToggle = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleServiceConfirm = (finalChosenList?: Service[]) => {
    const listToConfirm = finalChosenList || selectedServices;
    if (listToConfirm.length === 0) {
      addSystemMessage("Ops! Você precisa escolher pelo menos um serviço para continuar.");
      return;
    }
    setSelectedServices(listToConfirm);
    const names = listToConfirm.map(s => s.name).join(' + ');
    const priceSum = listToConfirm.reduce((sum, s) => sum + s.price, 0);
    const durationSum = listToConfirm.reduce((sum, s) => sum + s.duration, 0);

    addUserMessage(`Escolhi: ${names}`);
    setCurrentStep('SERVICE_CONFIRM');
    addSystemMessage(
      `Certo! Você escolheu: ${names}.\n\nValor total: R$ ${priceSum}\nTempo estimado: ${durationSum} min.\n\nIsso está certo?`,
      [
        { label: '✅ Sim, está correto!', value: 'confirm_services' },
        { label: '❌ Não, quero mudar os serviços', value: 'change_services' }
      ]
    );
  };

  const handleBarberSelect = (barber: Barber | null, anyBarber: boolean = false) => {
    setIsAnyBarber(anyBarber);
    setSelectedBarber(barber);

    const labelText = anyBarber ? "Sem preferência" : barber?.name || '';
    addUserMessage(`Profissional: ${labelText}`);

    if (anyBarber) {
      addSystemMessage("Sem problema, vou verificar o primeiro disponível para você!");
    } else {
      addSystemMessage(`Show de bola! O profissional ${barber?.name} é uma excelente escolha.`);
    }

    // Now transition to datetime
    setTimeout(() => {
      setCurrentStep('DATETIME_SELECT');
      addSystemMessage("Certo, e qual o melhor dia e horário para você ser atendido?", [], 'datetime-select');
    }, 1100);
  };

  const calculateTotalDuration = () => {
    return selectedServices.reduce((sum, s) => sum + s.duration, 0);
  };

  const calculateTotalValue = () => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  };

  const handleRescheduleDateTimeConfirm = (dateStr: string, timeStr: string, assignedBarber: Barber) => {
    if (!rescheduleTarget) return;
    const duration = rescheduleTarget.totalDuration;
    if (
      !isSlotAvailable(
        appointments,
        dateStr,
        timeStr,
        assignedBarber.id,
        duration,
        config.openingTime,
        config.closingTime,
        rescheduleTarget.id
      )
    ) {
      addSystemMessage(
        'Ops! Esse horário não está disponível. Escolha outro horário livre.',
        [],
        'datetime-select'
      );
      setCurrentStep('RESCHEDULE_DATETIME');
      return;
    }

    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
    setSelectedBarber(assignedBarber);

    addUserMessage(`Remarcar para ${formatSelectedDate(dateStr)} às ${timeStr}`);
    setCurrentStep('RESCHEDULE_CONFIRM');
    addSystemMessage(
      `Confirmar remarcação para ${formatSelectedDate(dateStr)} às ${timeStr} com ${assignedBarber.name}?`,
      [
        { label: '✅ Confirmar remarcação', value: 'confirm_reschedule' },
        { label: '📅 Escolher outro horário', value: 'choose_reschedule_time' }
      ]
    );
  };

  const handleDateTimeConfirm = (dateStr: string, timeStr: string, assignedBarber: Barber) => {
    const duration = calculateTotalDuration();
    if (
      !isSlotAvailable(
        appointments,
        dateStr,
        timeStr,
        assignedBarber.id,
        duration,
        config.openingTime,
        config.closingTime
      )
    ) {
      addSystemMessage(
        'Ops! Esse horário acabou de ser reservado ou não comporta a duração do serviço. Escolha outro horário disponível.',
        [],
        'datetime-select'
      );
      setCurrentStep('DATETIME_SELECT');
      return;
    }

    setSelectedDate(dateStr);
    setSelectedTime(timeStr);
    setSelectedBarber(assignedBarber); // Persist whichever barber is assigned (holds real barber if "any" was selected)

    addUserMessage(`Gostaria de agendar para o dia ${formatSelectedDate(dateStr)} às ${timeStr}`);
    
    setCurrentStep('DATETIME_CONFIRM');
    addSystemMessage(
      `Perfeito! Seu agendamento está marcado para ${formatSelectedDate(dateStr)}, às ${timeStr}, com o profissional ${assignedBarber.name}, para ${selectedServices.map(s => s.name).join(' + ')}.\n\nValor: R$ ${calculateTotalValue()}.\n\nConfirmamos essa data e horário?`,
      [
        { label: '👍 Confirmar Data & Horário', value: 'confirm_datetime' },
        { label: '📅 Escolher outro Dia/Hora', value: 'choose_another_time' }
      ]
    );
  };

  const triggerFinalConfirmation = (payType: 'antecipado' | 'local', payStatus: 'pendente' | 'pago' | 'confirmado') => {
    if (!selectedBarber) return;
    
    // Create new appointment in state
    const newApt: Appointment = {
      id: 'apt-user-' + Math.random().toString().substring(2, 8),
      customerName: clientName,
      customerEmail: currentUser?.email,
      services: selectedServices,
      barberId: selectedBarber.id,
      barberName: selectedBarber.name,
      date: selectedDate,
      time: selectedTime,
      totalValue: calculateTotalValue(),
      totalDuration: calculateTotalDuration(),
      paymentType: payType,
      paymentStatus: payStatus,
      createdAt: new Date().toISOString()
    };

    onAddAppointment(newApt);

    addUserMessage(payType === 'antecipado' ? "Pagamento antecipado selecionado" : "Prefiro pagar no local");

    setCurrentStep('FINAL_CONFIRMED');

    const paymentTextLabel = payType === 'antecipado' ? '💳 Antecipado (Enviado PIX)' : '💵 Presencial (No Local)';

    setTimeout(() => {
      if (payType === 'antecipado') {
        addSystemMessage("Ótimo! Confirmamos o seu pagamento PIX no nosso sistema. Seu agendamento está assegurado e garantido! Guarde o comprovante, combinado?");
      } else {
        addSystemMessage(`Tudo certo! Lembre-se de chegar no horário. Caso precise cancelar ou remarcar, avise com pelo menos ${config.cancelBufferHours} horas de antecedência, ok?`);
      }

      // Final ticket message block
      setTimeout(() => {
        const paymentTextLabel =
          payType === 'antecipado' ? '💳 Antecipado (Enviado PIX)' : '💵 Presencial (No Local)';
        const summaryText = buildCouponSummary(newApt);

        const ownerKey = getOwnerKey(currentUser?.email, clientName);
        const coupon = saveCoupon(
          {
            appointmentId: newApt.id,
            ownerKey,
            summaryText,
            paymentLabel: paymentTextLabel
          },
          selectedDate,
          selectedTime,
          newApt.totalDuration
        );

        addSystemMessage(summaryText, [], 'appointment-card', coupon.expiresAt);

        setTimeout(() => appendDashboardMenu(), 1500);
      }, 1200);
    }, 1000);
  };

  // Cancellation and lookup handler
  const handleCancelClick = () => {
    if (currentUser) {
      startCancelForUser(currentUser);
      return;
    }
    addUserMessage("Gostaria de cancelar um agendamento.");
    setCurrentStep('CANCEL_COLLECT_INFO');
    addSystemMessage(
      "Diga-me, por favor, qual é o Nome Completo que foi inserido no agendamento para eu buscá-lo na nossa agenda?",
    );
  };

  const handleCancelLookup = (nameInput: string) => {
    setCancelNameInput(nameInput);
    
    // Look up appointments
    // Simple filter matching names
    const records = appointments.filter(apt => 
      apt.customerName.toLowerCase().includes(nameInput.toLowerCase())
    );

    if (records.length === 0) {
      addSystemMessage(
        `Não encontrei nenhum agendamento ativo com o nome "${nameInput}".\n\nDeseja buscar novamente ou iniciar um novo agendamento?`,
        [
          { label: '🔍 Buscar outro nome', value: 'retry_search' },
          { label: '✂️ Fazer novo Agendamento', value: 'restart_booking' }
        ]
      );
    } else {
      setFoundCancelAppointments(records);
      setCurrentStep('CANCEL_SELECTION');
      addSystemMessage(
        `Esplêndido! Localizei o(s) seguinte(s) agendamento(s) para "${nameInput}". Veja na lista abaixo qual deseja cancelar:`,
        [],
        'cancel-select-widget' // renders special inline canceller
      );
    }
  };

  const initiateCancellation = (apt: Appointment) => {
    if (isPaidAntecipado(apt)) {
      setPendingCancelAppointment(apt);
      setCurrentStep('CANCEL_PIX_KEY');
      addUserMessage(`Cancelar agendamento do dia ${formatSelectedDate(apt.date)} às ${apt.time}`);
      addSystemMessage(
        `Este agendamento teve pagamento PIX antecipado de R$ ${apt.totalValue}.\n\n` +
          `Para que ${apt.barberName} possa fazer a devolução, informe sua chave PIX de recebimento (CPF, e-mail, telefone ou chave aleatória):`
      );
      return;
    }
    addUserMessage(`Cancelar agendamento do dia ${formatSelectedDate(apt.date)} às ${apt.time}`);
    completeCancellation(apt);
  };

  const completeCancellation = (apt: Appointment, refundPixKey?: string) => {
    removeCouponByAppointmentId(apt.id);
    onCancelAppointment(apt.id, refundPixKey);

    const paidAntecipado = isPaidAntecipado(apt);

    let cancelMsg =
      `✅ Seu agendamento de ${formatSelectedDate(apt.date)} às ${apt.time} com ${apt.barberName} foi CANCELADO.\n\n` +
      `📧 Enviamos confirmação para ${apt.customerEmail || currentUser?.email || 'seu e-mail'}.\n` +
      `📢 O profissional ${apt.barberName} foi notificado sobre o cancelamento.`;

    if (paidAntecipado && refundPixKey) {
      cancelMsg +=
        `\n\n💰 Devolução PIX: informamos ao barbeiro sua chave ${refundPixKey} para devolver R$ ${apt.totalValue}.`;
    } else if (paidAntecipado) {
      cancelMsg += `\n\n💰 O barbeiro recebeu alerta para devolver R$ ${apt.totalValue} via PIX.`;
    }

    const ownerKey = getOwnerKey(currentUser?.email || apt.customerEmail, apt.customerName);
    const receipt = saveCancellationReceipt({
      appointmentId: apt.id,
      ownerKey,
      summaryText: cancelMsg
    });

    addSystemMessage(cancelMsg, [], 'cancellation-card', receipt.expiresAt);

    setTimeout(() => {
      if (currentUser) appendDashboardMenu();
      else promptAuthForBooking();
    }, 1500);
  };

  const executeCancellation = initiateCancellation;

  // UI rendering of special widgets inside chat bubbles
  const renderSpecialWidget = (msg: ChatMessage) => {
    if (msg.customType === 'service-select') {
      return (
        <div className="mt-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 space-y-3">
          <p className="text-xs text-amber-500 font-medium font-display uppercase tracking-wider mb-2">Serviços Disponíveis</p>
          <div className="grid grid-cols-1 gap-2">
            {services.map(srv => {
              const checked = selectedServices.some(s => s.id === srv.id);
              return (
                <button
                  key={srv.id}
                  id={`service-btn-${srv.id}`}
                  onClick={() => handleServiceSelectToggle(srv)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    checked
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{srv.name}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                        {srv.duration} min
                      </span>
                    </div>
                    {srv.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{srv.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm font-mono text-amber-500">R$ {srv.price}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      checked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-700'
                    }`}>
                      {checked && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center bg-slate-950/40 p-2 rounded-lg">
            <div>
              <span className="text-xs text-slate-400">Selecionados: {selectedServices.length}</span>
              <div className="text-sm font-bold text-amber-500 font-mono">
                R$ {selectedServices.reduce((sum, s) => sum + s.price, 0)} • {selectedServices.reduce((sum, s) => sum + s.duration, 0)} min
              </div>
            </div>
            <button
              id="confirm-services-btn"
              onClick={() => handleServiceConfirm()}
              disabled={selectedServices.length === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold font-display uppercase tracking-wider transition-all ${
                selectedServices.length > 0
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-600 scale-100'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed scale-95'
              }`}
            >
              Confirmar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    if (msg.customType === 'barber-select') {
      return (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {barbers.map(barber => (
            <button
              key={barber.id}
              id={`barber-btn-${barber.id}`}
              onClick={() => handleBarberSelect(barber)}
              className="flex items-center gap-3 p-3 text-left rounded-xl border border-slate-800 bg-slate-950/30 hover:border-amber-500/50 hover:bg-slate-900/40 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-500 font-display text-sm group-hover:bg-amber-500 group-hover:text-amber-950 transition-all">
                {barber.avatar}
              </div>
              <div>
                <span className="font-bold text-sm block">{barber.name}</span>
                <span className="text-xs text-slate-400 block">{barber.specialty}</span>
                <span className="text-[10px] text-amber-500 font-mono">⭐ {barber.rating}</span>
              </div>
            </button>
          ))}
          <button
            id="barber-any-btn"
            onClick={() => handleBarberSelect(null, true)}
            className="flex items-center gap-3 p-3 text-left rounded-xl border border-slate-800 bg-slate-950/30 hover:border-amber-500/50 hover:bg-slate-900/40 transition-all cursor-pointer col-span-1 sm:col-span-2 justify-center font-display uppercase tracking-wider text-xs font-bold text-amber-500 py-4 border-dashed"
          >
            ✂️ Sem preferência (Primeiro disponível)
          </button>
        </div>
      );
    }

    if (msg.customType === 'datetime-select') {
      const dayCount = currentStep === 'RESCHEDULE_DATETIME' ? 7 : 5;
      const relativeDays = getRelativeDays(dayCount, 'chat');
      const tempSelectedDate = selectedDate || relativeDays[0].value;
      const totalDuration =
        currentStep === 'RESCHEDULE_DATETIME' && rescheduleTarget
          ? rescheduleTarget.totalDuration
          : calculateTotalDuration();
      const excludeId = currentStep === 'RESCHEDULE_DATETIME' ? rescheduleTarget?.id : undefined;

      const slotsWithAvailability = getSlotsAvailability(
        appointments,
        barbers,
        tempSelectedDate,
        totalDuration,
        config.openingTime,
        config.closingTime,
        selectedBarber,
        isAnyBarber,
        excludeId
      );

      const freeSlots = slotsWithAvailability.filter(s => s.isFree);

      return (
        <div className="mt-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 space-y-4">
          <div>
            <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-widest font-display">1. Selecione o Dia:</span>
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {relativeDays.map(day => (
                <button
                  key={day.value}
                  id={`day-select-${day.value}`}
                  onClick={() => setSelectedDate(day.value)}
                  className={`py-2 px-1 rounded-lg border text-center transition-all ${
                    tempSelectedDate === day.value
                      ? 'border-amber-500 bg-amber-500 text-slate-950 font-bold scale-105 shadow-md shadow-amber-500/20'
                      : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 text-xs'
                  }`}
                >
                  <span className="text-[10px] block uppercase opacity-80">{day.label.split(',')[0]}</span>
                  <span className="text-sm font-semibold block">{day.label.split(',')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-widest font-display">2. Horários Disponíveis:</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {freeSlots.length} livre{freeSlots.length !== 1 ? 's' : ''} • {totalDuration} min
              </span>
            </div>
            {freeSlots.length === 0 ? (
              <p className="text-xs text-slate-400 mt-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                Nenhum horário livre para este dia com {selectedBarber?.name ?? 'o profissional escolhido'}.
                {totalDuration > 30 && ' Serviços mais longos reduzem as opções no fim do expediente.'}
                {' '}Tente outro dia ou altere os serviços.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 mt-2 max-h-44 overflow-y-auto pr-1">
                {freeSlots.map(slot => (
                  <button
                    key={slot.time}
                    id={`time-select-${slot.time}`}
                    onClick={() => {
                      if (slot.assignedBarber) {
                        if (currentStep === 'RESCHEDULE_DATETIME') {
                          handleRescheduleDateTimeConfirm(tempSelectedDate, slot.time, slot.assignedBarber);
                        } else {
                          handleDateTimeConfirm(tempSelectedDate, slot.time, slot.assignedBarber);
                        }
                      }
                    }}
                    className="py-1.5 text-xs font-semibold rounded font-mono transition-all bg-slate-950 border border-slate-800 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500 cursor-pointer"
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (msg.customType === 'pix-payment') {
      const value = calculateTotalValue();
      const payloadString = `00020101021226380014br.gov.bcb.pix0116${config.pixKey}5204000053039865405${value.toFixed(2)}5802BR5915NavalhaEstilo6009SaoPaulo62070503***6304`;

      return (
        <div className="mt-3 p-4 bg-slate-950/80 rounded-2xl border border-amber-500/30 text-center space-y-3">
          <p className="text-xs font-semibold text-amber-500 font-display tracking-widest uppercase">PIX Copia e Cola / QR Code</p>
          
          <div className="flex justify-center py-2">
            {/* Visual simulation of a high-quality stylized QR Code */}
            <div className="w-32 h-32 bg-white p-2.5 rounded-lg flex flex-col justify-between items-center relative shadow-lg">
              {/* Corner markings for qr style */}
              <div className="w-full h-full flex flex-wrap gap-1 opacity-90 justify-center items-center">
                <div className="w-7 h-7 bg-slate-900 rounded-sm self-start justify-self-start border-4 border-slate-900" />
                <div className="w-12 h-6 bg-slate-900 rounded flex flex-wrap opacity-80" />
                <div className="w-7 h-7 bg-slate-900 rounded-sm self-start justify-self-end border-4 border-slate-900" />
                <div className="w-6 h-12 bg-slate-900 rounded opacity-75" />
                <div className="w-6 h-6 bg-amber-500 rounded p-1 flex items-center justify-center font-display font-bold text-[8px] text-white">N&E</div>
                <div className="w-10 h-10 bg-slate-900 rounded opacity-90" />
                <div className="w-7 h-7 bg-slate-900 rounded-sm self-end justify-self-start border-4 border-slate-900" />
                <div className="w-12 h-6 bg-slate-900 rounded flex flex-wrap" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 block font-sans">Valor a Pagar:</span>
            <span className="text-lg font-bold font-mono text-white">R$ {value.toFixed(2)}</span>
          </div>

          <button
            id="copy-pix-btn"
            onClick={() => {
              navigator.clipboard.writeText(payloadString);
              alert("Código PIX copiado com sucesso! Abra seu app do banco e escolha a opção PIX Copia e Cola.");
            }}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 text-xs font-medium font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            📋 Copiar Chave PIX
          </button>

          <button
            id="confirm-payment-btn"
            onClick={() => handleSend("Já efetuei o pagamento PIX")}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-display uppercase tracking-wider text-xs rounded-lg transition-all"
          >
            ✅ Confirmar Pagamento Realizado
          </button>
        </div>
      );
    }

    if (msg.customType === 'my-appointments-list') {
      return (
        <div className="mt-3 space-y-2">
          {displayAppointments.map(apt => {
            const coupon = getActiveCouponByAppointmentId(apt.id);
            return (
            <div key={apt.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold text-white">{formatSelectedDate(apt.date)} às {apt.time}</span>
              </div>
              <p className="text-amber-500 font-semibold">{apt.services.map(s => s.name).join(' + ')}</p>
              <p className="text-slate-400 text-[11px]">Profissional: {apt.barberName} • R$ {apt.totalValue}</p>
              {coupon && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-1.5 font-display">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Cupom de Confirmação</span>
                  </div>
                  <p className="text-[11px] text-slate-300 whitespace-pre-line leading-relaxed">{coupon.summaryText}</p>
                  <p className="text-[10px] text-amber-500/80 font-mono mt-1.5">
                    Válido até o dia do atendimento ({formatCouponExpiry(coupon.expiresAt)})
                  </p>
                </div>
              )}
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={() => startReschedule(apt)}
                  className="flex-1 py-1 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 text-amber-500 text-[10px] font-semibold rounded-lg transition-all"
                >
                  📅 Remarcar
                </button>
                <button
                  onClick={() => executeCancellation(apt)}
                  className="flex-1 py-1 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-950 text-red-400 text-[10px] font-semibold rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
            );
          })}
          <button
            onClick={() => currentUser && startBookingForUser(currentUser)}
            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg"
          >
            ✂️ Criar novo agendamento
          </button>
        </div>
      );
    }

    if (msg.customType === 'cancel-select-widget') {
      return (
        <div className="mt-3 space-y-2">
          {foundCancelAppointments.map(apt => (
            <div
              key={apt.id}
              className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col justify-between hover:border-red-500/50 transition-all"
            >
              <div className="text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-amber-500 font-mono">Agendamento #{apt.id}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded">
                    {formatSelectedDate(apt.date)} às {apt.time}
                  </span>
                </div>
                <p className="text-white font-semibold">
                  {apt.services.map(s => s.name).join(' + ')}
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Profissional: {apt.barberName} | Valor: R$ {apt.totalValue}
                </p>
              </div>
              <button
                id={`cancel-exec-btn-${apt.id}`}
                onClick={() => executeCancellation(apt)}
                className="mt-3 py-1.5 w-full bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-950 text-red-400 text-xs font-semibold rounded-lg transition-all"
              >
                🚨 Cancelar este Agendamento
              </button>
            </div>
          ))}
        </div>
      );
    }

    if (msg.customType === 'appointment-card') {
      return (
        <div className="mt-2.5 p-3 rounded-xl bg-slate-950/60 border border-amber-500/30 relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
            <Scissors className="w-16 h-16 stroke-[1.5]" />
          </div>
          <div className="flex items-center gap-2 mb-2 font-display">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Cupom de Confirmação</span>
          </div>
          <p className="text-xs text-slate-300">Apresente este cupom ao chegar na barbearia. Obrigado pela confiança!</p>
          {msg.expiresAt && (
            <p className="text-[10px] text-amber-500/80 font-mono mt-2">
              Válido até o dia do atendimento ({formatCouponExpiry(msg.expiresAt)})
            </p>
          )}
        </div>
      );
    }

    if (msg.customType === 'cancellation-card') {
      return (
        <div className="mt-2.5 p-3 rounded-xl bg-red-950/20 border border-red-500/30 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 font-display">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Comprovante de Cancelamento</span>
          </div>
          <p className="text-xs text-slate-300">Guarde esta confirmação. As notificações foram enviadas para você e para o barbeiro.</p>
          {msg.expiresAt && (
            <p className="text-[10px] text-red-400/80 font-mono mt-2">
              Visível até {formatCouponExpiry(msg.expiresAt)}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl shadow-black/20 relative">
      
      {/* Chat header */}
      <div className="px-4 py-3 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800/80 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-bold relative shadow-lg shadow-amber-500/20">
            <Scissors className="w-4 h-4" />
            {/* Online status indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-500 border-2 border-zinc-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm text-white font-display">Assistente Virtual</h2>
              <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded uppercase tracking-wider font-extrabold font-display">BarberAI</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {currentUser ? 'Online' : 'Aguardando login'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {currentStep !== 'USER_DASHBOARD' && !currentStep.startsWith('AUTH_') && (
            <button
              id="chat-nav-cancel-btn"
              onClick={handleCancelClick}
              className="text-[11px] font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/11 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <RefreshCw className="w-3 h-3" /> Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map(msg => {
            const isAss = msg.sender === 'assistant';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-2.5 ${isAss ? 'justify-start' : 'justify-end'}`}
              >
                {isAss && (
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-display font-semibold text-xs text-amber-500 shrink-0">
                    A
                  </div>
                )}
                
                <div className="max-w-[85%] space-y-1">
                  {/* Bubble body */}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed font-sans shadow-md ${
                    isAss
                      ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      : 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    {renderSpecialWidget(msg)}
                  </div>
                  
                  {/* Bubble Options */}
                  {isAss && msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          id={`chat-opt-btn-${oIdx}`}
                          onClick={() => handleSend(opt.label, opt.value)}
                          className="py-1.5 px-3 bg-zinc-800/60 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/40 rounded-full text-[11px] font-medium text-amber-500 hover:text-zinc-100 transition-all scale-100 active:scale-95 cursor-pointer"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className={`text-[10px] text-slate-500 block ${!isAss ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {!isAss && (
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-display font-semibold text-xs text-amber-500 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2.5 justify-start"
            >
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-amber-500">
                A
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tl-none text-xs flex gap-1 items-center self-center shadow-md">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <div className="p-3 bg-zinc-900/90 backdrop-blur-sm border-t border-zinc-800/80 shrink-0">
        {currentUser && (
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-800/60">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 font-display font-bold text-xs text-amber-500">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              id="chat-logout-btn"
              type="button"
              onClick={handleLogout}
              className="text-[10px] font-semibold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 px-2.5 py-2 rounded-xl border border-red-500/40 hover:border-red-500 transition-all flex items-center gap-1.5 shrink-0 shadow-sm shadow-red-500/10 hover:shadow-red-500/25 active:scale-95"
              title="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        )}
        <form
          id="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 items-center"
        >
          <input
            id="chat-msg-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              currentStep === 'CANCEL_PIX_KEY'
                ? 'Sua chave PIX (CPF, e-mail, telefone...)'
                : 'Digite sua resposta aqui ou use as opções...'
            }
            className="flex-1 px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl text-xs placeholder:text-slate-500 text-white outline-none transition-all"
          />

          <button
            id="chat-send-btn"
            type="submit"
            className="w-10 h-10 bg-amber-500 hover:bg-amber-600 active:scale-95 flex items-center justify-center text-slate-950 rounded-xl transition-all shrink-0 cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
          © {config.name} • Agendamentos Rápidos com Sincronização Inteligente
        </p>
      </div>
    </div>
  );
}
