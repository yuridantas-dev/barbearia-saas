import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, Trash2, BarChart3, ListOrdered, Bell, AlertTriangle } from 'lucide-react';
import { Barber, Appointment, BarbeariaConfig, AppNotification } from '../types';
import { getRelativeDateStr, getRelativeDays, generateTimeSlots, timeToMinutes, minutesToTime } from '../data';

interface AgendaPanelProps {
  config: BarbeariaConfig;
  barbers: Barber[];
  appointments: Appointment[];
  notifications: AppNotification[];
  onCancelAppointment: (id: string) => void;
  onMarkNotificationRead: (id: string) => void;
}

export default function AgendaPanel({
  config,
  barbers,
  appointments,
  notifications,
  onCancelAppointment,
  onMarkNotificationRead
}: AgendaPanelProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => getRelativeDateStr(0));
  const [activeTab, setActiveTab] = useState<'grid' | 'list' | 'stats'>('grid');
  const [selectedAptDetails, setSelectedAptDetails] = useState<Appointment | null>(null);

  // Filter appointments for the selected date
  const filteredAppointments = appointments.filter(apt => apt.date === selectedDate);

  const relativeDays = getRelativeDays(5, 'agenda');

  const barberNotifications = notifications.filter(n => n.recipientType === 'barber');
  const unreadCount = barberNotifications.filter(n => !n.read).length;

  const getDayLabel = (dateStr: string) => {
    const matched = relativeDays.find(d => d.value === dateStr);
    if (matched) return matched.label;
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  // Stats computation
  const totalBookings = appointments.length;
  const totalRevenue = appointments.reduce((sum, apt) => sum + apt.totalValue, 0);
  const totalWorkedMinutes = appointments.reduce((sum, apt) => sum + apt.totalDuration, 0);
  const unpaidBookings = appointments.filter(apt => apt.paymentStatus === 'pendente').length;

  const revenuePerBarber = barbers.map(barber => {
    const total = appointments
      .filter(apt => apt.barberId === barber.id)
      .reduce((sum, apt) => sum + apt.totalValue, 0);
    return { name: barber.name, total };
  });

  const workloadPerBarber = barbers.map(barber => {
    const totalHours = appointments
      .filter(apt => apt.barberId === barber.id)
      .reduce((sum, apt) => sum + (apt.totalDuration / 60), 0);
    return { name: barber.name, totalHours };
  });

  // Calculate layout coordinates for a grid cell
  const timeSlots = generateTimeSlots(config.openingTime, config.closingTime);

  const getAppointmentForSlot = (barberId: string, time: string): Appointment | undefined => {
    const slotStart = timeToMinutes(time);
    return filteredAppointments.find(apt => {
      if (apt.barberId !== barberId) return false;
      const aptStart = timeToMinutes(apt.time);
      const aptEnd = aptStart + apt.totalDuration;
      return slotStart >= aptStart && slotStart < aptEnd;
    });
  };

  const handleCancel = (id: string) => {
    if (confirm("Tem certeza que deseja cancelar esta reserva? Essa ação liberará o horário imediatamente.")) {
      onCancelAppointment(id);
      setSelectedAptDetails(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl shadow-black/20">
      
      {/* Panel Nav Controls */}
      <div className="px-4 py-3.5 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800/80 flex flex-wrap gap-2 justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm font-display text-white">Quadro de Horários Live</h3>
        </div>

        {/* Tab view selector */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            id="tab-grid"
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Agenda
          </button>
          <button
            id="tab-list"
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'list'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" /> Lista ({appointments.length})
          </button>
          <button
            id="tab-stats"
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Métricas
          </button>
        </div>
      </div>

      {/* Barber notifications */}
      {barberNotifications.length > 0 && (
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 shrink-0 max-h-36 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 font-display">
              Alertas para barbeiros {unreadCount > 0 && `(${unreadCount} novo${unreadCount > 1 ? 's' : ''})`}
            </span>
          </div>
          <div className="space-y-1.5">
            {barberNotifications.slice(0, 5).map(notif => (
              <div
                key={notif.id}
                onClick={() => onMarkNotificationRead(notif.id)}
                className={`p-2 rounded-lg border text-[10px] cursor-pointer transition-all ${
                  notif.type === 'refund_required'
                    ? 'bg-red-950/30 border-red-500/40'
                    : notif.read
                      ? 'bg-slate-900/40 border-slate-800 opacity-60'
                      : 'bg-amber-500/5 border-amber-500/30'
                }`}
              >
                <div className="flex items-start gap-1.5">
                  {notif.type === 'refund_required' ? (
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <Bell className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-white block">{notif.title}</span>
                    <span className="text-slate-400 leading-relaxed">{notif.message}</span>
                    <span className="text-slate-600 font-mono block mt-0.5">
                      {new Date(notif.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date selector header for Grid & List */}
      {activeTab !== 'stats' && (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex gap-2 overflow-x-auto shrink-0 select-none">
          {relativeDays.map(day => (
            <button
              key={day.value}
              id={`panel-day-btn-${day.value}`}
              onClick={() => setSelectedDate(day.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedDate === day.value
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                  : 'border-transparent bg-slate-950/20 text-slate-400 hover:bg-slate-950/40 hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> {day.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Body viewports */}
      <div className="flex-1 overflow-auto p-4 content-start">
        
        {/* GRID VIEW */}
        {activeTab === 'grid' && (
          <div className="w-full min-w-[550px]">
            {/* Table headers: Professionals names */}
            <div className="grid grid-cols-[80px_1fr_1fr_1fr] border-b border-slate-800 pb-2">
              <div className="text-[10px] font-bold text-slate-500 font-display uppercase self-center">Horário</div>
              {barbers.map(barber => (
                <div key={barber.id} className="text-center">
                  <span className="text-xs font-bold text-white block">{barber.name}</span>
                  <span className="text-[9px] text-amber-500 font-medium font-display uppercase tracking-wider">{barber.specialty}</span>
                </div>
              ))}
            </div>

            {/* Time lines */}
            <div className="divide-y divide-slate-800/60 mt-1">
              {timeSlots.map(time => (
                <div key={time} className="grid grid-cols-[80px_1fr_1fr_1fr] py-2 items-center">
                  {/* Row indicator */}
                  <div className="text-xs font-mono text-slate-400 font-medium">{time}</div>

                  {/* Professional slot blocks */}
                  {barbers.map(barber => {
                    const apt = getAppointmentForSlot(barber.id, time);

                    if (apt) {
                      // Check if this time matches the exact START time of the appointment
                      const isStartOfApt = apt.time === time;
                      
                      // Render styled ticket card ONLY at its start slot to avoid duplicate visual spam
                      if (isStartOfApt) {
                        const isPaid = apt.paymentStatus === 'pago' || apt.paymentStatus === 'confirmado';
                        const endTime = minutesToTime(timeToMinutes(apt.time) + apt.totalDuration);

                        return (
                          <div
                            key={barber.id}
                            className={`mx-1 p-2 rounded-lg border text-left cursor-pointer hover:scale-[1.01] transition-all relative ${
                              isPaid
                                ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                            }`}
                            onClick={() => setSelectedAptDetails(apt)}
                          >
                            <span className="text-[10px] font-bold tracking-tight text-white block truncate">
                              👤 {apt.customerName}
                            </span>
                            <span className="text-[9px] text-amber-500 font-medium mt-0.5 block truncate">
                              ✂️ {apt.services.map(s => s.name).join(' + ')}
                            </span>
                            <div className="flex items-center gap-1 mt-1 justify-between">
                              <span className="text-[9px] font-mono text-slate-400 bg-slate-950/60 px-1 py-0.2 rounded">
                                ⏱️ {apt.time}–{endTime}
                              </span>
                              <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1 py-0.2 rounded ${
                                isPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {isPaid ? 'Pago' : 'No Local'}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const isPaid = apt.paymentStatus === 'pago' || apt.paymentStatus === 'confirmado';
                      return (
                        <div
                          key={barber.id}
                          className={`mx-1 min-h-8 rounded border cursor-pointer transition-all ${
                            isPaid
                              ? 'bg-amber-950/25 border-amber-500/30 hover:border-amber-500/50'
                              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                          }`}
                          onClick={() => setSelectedAptDetails(apt)}
                          title={`${apt.customerName} — em atendimento`}
                        />
                      );
                    }

                    // Slot is free
                    return (
                      <div
                        key={barber.id}
                        className="mx-1 py-1 px-2 min-h-8 border border-transparent border-dashed hover:border-slate-800 hover:bg-slate-900/14 text-center rounded transition-all text-[10px] text-slate-600 font-mono font-medium"
                      >
                        Livre
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-3 font-display">
              Agendamentos Ativos do Dia ({filteredAppointments.length})
            </h4>

            {filteredAppointments.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/30 border border-slate-800 rounded-xl space-y-2">
                <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">Nenhum agendamento marcado para esta data.</p>
                <p className="text-xs text-slate-500">Agende um horário interagindo com a Assistente Virtual!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAppointments.map(apt => {
                  const isPaid = apt.paymentStatus === 'pago' || apt.paymentStatus === 'confirmado';
                  return (
                    <div
                      key={apt.id}
                      className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-start gap-2 relative group hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1.5 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{apt.customerName}</span>
                          <span className="text-[9px] font-mono bg-slate-900 text-amber-500 px-1.5 py-0.5 rounded">
                            ID: {apt.id}
                          </span>
                        </div>
                        
                        <div className="text-xs text-slate-300">
                          <span className="font-semibold block text-amber-500">{apt.services.map(s => s.name).join(' + ')}</span>
                          <span className="text-slate-400 block text-[11px] mt-0.5">💇‍♂️ Barbear: {apt.barberName}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="bg-slate-900 text-slate-300 px-1.5 py-0.2 rounded font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" /> {apt.time} ({apt.totalDuration} min)
                          </span>
                          <span className="font-bold font-mono text-amber-400">
                            R$ {apt.totalValue}
                          </span>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                            isPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {isPaid ? 'PIX Pago' : 'No Local'}
                          </span>
                        </div>
                      </div>

                      <button
                        id={`list-cancel-btn-${apt.id}`}
                        onClick={() => handleCancel(apt.id)}
                        className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all cursor-pointer select-none"
                        title="Cancelar Agendamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* METRICS VIEW */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-widest font-display mb-3">
              Métricas e Analytics de Agendamentos
            </h4>

            {/* Quick dashboard cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Faturamento Estimado</span>
                <span className="text-lg font-bold font-mono text-emerald-400 block">R$ {totalRevenue}</span>
                <span className="text-[9px] text-slate-500 block">Soma de todos os agendamentos</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total de Reservas</span>
                <span className="text-lg font-bold font-mono text-amber-400 block">{totalBookings}</span>
                <span className="text-[9px] text-slate-500 block">Geral em todas as datas</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Horas de Atendimento</span>
                <span className="text-lg font-bold font-mono text-cyan-400 block">{(totalWorkedMinutes / 60).toFixed(1)} h</span>
                <span className="text-[9px] text-slate-500 block">Total de trabalho alocado</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Pagos Antecipados</span>
                <span className="text-lg font-bold font-mono text-purple-400 block">
                  {appointments.filter(a => a.paymentStatus === 'pago' || a.paymentStatus === 'confirmado').length}
                </span>
                <span className="text-[9px] text-slate-500 block">Garantia com Pix aprovado</span>
              </div>
            </div>

            {/* Workload per Barber charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold font-display text-white mb-2 uppercase tracking-wide">Faturamento Estimado por Profissional</h5>
                <div className="space-y-2">
                  {revenuePerBarber.map((rb, idx) => {
                    const pct = totalRevenue > 0 ? (rb.total / totalRevenue) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-semibold">{rb.name}</span>
                          <span className="text-amber-400 font-bold font-mono">R$ {rb.total} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 rounded-sm overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-sm" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <h5 className="text-xs font-bold font-display text-white mb-2 uppercase tracking-wide font-display">Carga de Trabalho Alocada</h5>
                <div className="space-y-2">
                  {workloadPerBarber.map((wb, idx) => {
                    const totalHours = workloadPerBarber.reduce((sum, item) => sum + item.totalHours, 0);
                    const pct = totalHours > 0 ? (wb.totalHours / totalHours) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-semibold">{wb.name}</span>
                          <span className="text-cyan-400 font-bold font-mono">{wb.totalHours.toFixed(1)} hrs ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 rounded-sm overflow-hidden">
                          <div className="h-full bg-cyan-400 rounded-sm" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Helpful instructions card */}
            <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-xs leading-relaxed text-amber-500/80">
              💡 <strong>Como funciona a agenda real?</strong> O Assistente Virtual duns canais de conversação nunca inventa horários. Ele consulta este exato banco de dados. Ao agendar, os horários ocupados são eliminados dinamicamente das listagens de opções futuras, mantendo as agendas de todos os profissionais 100% integradas.
            </div>
          </div>
        )}
      </div>

      {/* Appointment Detail Popup Overlay */}
      <AnimatePresence>
        {selectedAptDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedAptDetails(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 block font-display">Tíquete de Reserva</span>
                  <h4 className="font-bold text-sm text-white mt-1">Detalhes do Agendamento</h4>
                </div>
                <button
                  id="modal-close-btn"
                  onClick={() => setSelectedAptDetails(null)}
                  className="text-xs font-bold text-slate-500 hover:text-white px-2 py-1 rounded bg-slate-950"
                >
                  X
                </button>
              </div>

              <div className="divide-y divide-slate-800 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Cliente</span>
                  <span className="font-bold text-white">{selectedAptDetails.customerName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Profissional</span>
                  <span className="font-bold text-white">{selectedAptDetails.barberName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Data e Hora</span>
                  <span className="font-bold text-white">{getDayLabel(selectedAptDetails.date)} às {selectedAptDetails.time}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Serviço(s)</span>
                  <span className="font-bold text-amber-500 text-right">{selectedAptDetails.services.map(s => s.name).join(' + ')}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Tempo Total</span>
                  <span className="font-bold text-white font-mono">{selectedAptDetails.totalDuration} min</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Valor Total</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">R$ {selectedAptDetails.totalValue}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Pagamento</span>
                  <span className={`font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded ${
                    selectedAptDetails.paymentStatus === 'pago' || selectedAptDetails.paymentStatus === 'confirmado'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {selectedAptDetails.paymentType === 'antecipado' ? '💳 Pix Aprovado' : '💵 Pagar no Local'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  id="modal-cancel-btn"
                  onClick={() => handleCancel(selectedAptDetails.id)}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 font-semibold text-xs text-white rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Cancelar esta Reserva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
