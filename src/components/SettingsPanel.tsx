import React, { useState } from 'react';
import { Settings, Plus, Trash2, Edit3, Check, RefreshCw, Scissors, Landmark, HelpCircle, Save } from 'lucide-react';
import { Service, Barber, BarbeariaConfig } from '../types';

interface SettingsPanelProps {
  config: BarbeariaConfig;
  onUpdateConfig: (config: BarbeariaConfig) => void;
  services: Service[];
  onUpdateServices: (services: Service[]) => void;
  barbers: Barber[];
  onUpdateBarbers: (barbers: Barber[]) => void;
}

export default function SettingsPanel({
  config,
  onUpdateConfig,
  services,
  onUpdateServices,
  barbers,
  onUpdateBarbers
}: SettingsPanelProps) {
  // Service editing state
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvPrice, setNewSrvPrice] = useState(30);
  const [newSrvDuration, setNewSrvDuration] = useState(30);
  const [newSrvDesc, setNewSrvDesc] = useState('');

  // Barber editing state
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberSpecialty, setNewBarberSpecialty] = useState('');
  const [newBarberAvatar, setNewBarberAvatar] = useState('');

  // General config state
  const [tempConfig, setTempConfig] = useState<BarbeariaConfig>({ ...config });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(tempConfig);
    alert('Configurações gerais atualizadas com sucesso!');
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrvName.trim()) return;

    const newService: Service = {
      id: 'srv-' + Math.random().toString().substr(2, 6),
      name: newSrvName,
      price: Number(newSrvPrice),
      duration: Number(newSrvDuration),
      description: newSrvDesc
    };

    onUpdateServices([...services, newService]);
    setNewSrvName('');
    setNewSrvDesc('');
    alert(`Serviço "${newService.name}" adicionado com sucesso!`);
  };

  const handleRemoveService = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover o serviço "${name}"?`)) {
      onUpdateServices(services.filter(s => s.id !== id));
    }
  };

  const handleAddBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarberName.trim()) return;

    // Build initials for avatar
    const initials = newBarberName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const newBarberObj: Barber = {
      id: 'barber-' + Math.random().toString().substr(2, 6),
      name: newBarberName,
      specialty: newBarberSpecialty || 'Especialista',
      avatar: newBarberAvatar || initials,
      rating: 5.0
    };

    onUpdateBarbers([...barbers, newBarberObj]);
    setNewBarberName('');
    setNewBarberSpecialty('');
    setNewBarberAvatar('');
    alert(`Profissional "${newBarberObj.name}" cadastrado!`);
  };

  const handleRemoveBarber = (id: string, name: string) => {
    if (confirm(`Tem certeza que desativará o profissional "${name}" da agenda?`)) {
      onUpdateBarbers(barbers.filter(b => b.id !== id));
    }
  };

  return (
    <div className="space-y-6 container mx-auto">
      
      {/* SECTION 1: Configuração Geral */}
      <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Landmark className="w-4 h-4 text-amber-500" />
          <h4 className="font-bold text-xs font-display text-white uppercase tracking-wider">Configurações Gerais da Barbearia</h4>
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Nome Comercial</label>
            <input
              id="settings-name-input"
              type="text"
              value={tempConfig.name}
              onChange={e => setTempConfig({ ...tempConfig, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg text-xs outline-none text-white transition-all"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Chave PIX de Recebimento</label>
            <input
              id="settings-pix-input"
              type="text"
              value={tempConfig.pixKey}
              onChange={e => setTempConfig({ ...tempConfig, pixKey: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg text-xs outline-none text-white transition-all"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">WhatsApp para Lembretes/Atendimento</label>
            <input
              id="settings-phone-input"
              type="text"
              value={tempConfig.phone}
              onChange={e => setTempConfig({ ...tempConfig, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg text-xs outline-none text-white transition-all"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Janela Segura de Cancelamento (Horas)</label>
            <input
              id="settings-cancel-input"
              type="number"
              value={tempConfig.cancelBufferHours}
              onChange={e => setTempConfig({ ...tempConfig, cancelBufferHours: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg text-xs outline-none text-white transition-all"
              required
              min={1}
            />
          </div>

          <div className="md:col-span-2 pt-2 flex justify-end">
            <button
              id="save-config-btn"
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold font-display uppercase tracking-wider text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Salvar Configurações Gerais
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: CADASTRO DE SERVIÇOS */}
      <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Scissors className="w-4 h-4 text-amber-500" />
          <h4 className="font-bold text-xs font-display text-white uppercase tracking-wider">Gerenciador de Serviços Disponíveis</h4>
        </div>

        {/* Existing services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {services.map(srv => (
            <div key={srv.id} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-white block">{srv.name}</span>
                <span className="text-[10px] text-amber-500 font-mono font-medium">R$ {srv.price} • {srv.duration} min</span>
              </div>
              <button
                id={`srv-delete-btn-${srv.id}`}
                onClick={() => handleRemoveService(srv.id, srv.name)}
                className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-all cursor-pointer"
                title="Deletar serviço"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new service Form */}
        <form onSubmit={handleAddService} className="pt-4 border-t border-slate-800/60 space-y-3">
          <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-widest block font-display">Cadastrar Novo Serviço</span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <input
                id="srv-name-in"
                type="text"
                placeholder="Ex: Alinhamento Platinado"
                value={newSrvName}
                onChange={e => setNewSrvName(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <input
                id="srv-price-in"
                type="number"
                placeholder="Preço (R$)"
                value={newSrvPrice}
                onChange={e => setNewSrvPrice(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg outline-none focus:border-amber-500"
                required
                min={0}
              />
            </div>
            <div>
              <input
                id="srv-dur-in"
                type="number"
                placeholder="Duração (min)"
                value={newSrvDuration}
                onChange={e => setNewSrvDuration(Number(e.target.value))}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg outline-none focus:border-amber-500"
                required
                min={5}
                step={5}
              />
            </div>
            <div>
              <button
                id="srv-submit-btn"
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-500 font-bold font-display uppercase tracking-wider text-[10px] rounded-lg border border-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Registrar Serviço
              </button>
            </div>
          </div>
          <input
            id="srv-desc-in"
            type="text"
            placeholder="Breve descrição opcional do serviço..."
            value={newSrvDesc}
            onChange={e => setNewSrvDesc(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg outline-none focus:border-amber-500"
          />
        </form>
      </div>

      {/* SECTION 3: PROFISSIONAIS */}
      <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Settings className="w-4 h-4 text-amber-500" />
          <h4 className="font-bold text-xs font-display text-white uppercase tracking-wider">Gestão do Corpo de Profissionais</h4>
        </div>

        {/* Existing barbers grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {barbers.map(barber => (
            <div key={barber.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-center font-bold text-amber-500 flex items-center justify-center">
                  {barber.avatar}
                </div>
                <div>
                  <span className="font-bold text-white block">{barber.name}</span>
                  <span className="text-[10px] text-slate-400 block">{barber.specialty}</span>
                </div>
              </div>
              <button
                id={`barber-delete-btn-${barber.id}`}
                onClick={() => handleRemoveBarber(barber.id, barber.name)}
                className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-all cursor-pointer"
                title="Remover Profissional"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Cadastrar novo barbeiro form */}
        <form onSubmit={handleAddBarber} className="pt-4 border-t border-slate-800/60 space-y-2">
          <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-widest block font-display">Cadastrar Novo Profissional</span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="md:col-span-2">
              <input
                id="barber-name-in"
                type="text"
                placeholder="Nome Completo do Barbeiro"
                value={newBarberName}
                onChange={e => setNewBarberName(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <input
                id="barber-spec-in"
                type="text"
                placeholder="Especialidade (ex: Degradê)"
                value={newBarberSpecialty}
                onChange={e => setNewBarberSpecialty(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <button
                id="barber-submit-btn"
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-500 font-bold font-display uppercase tracking-wider text-[10px] rounded-lg border border-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Registrar Barbeiro
              </button>
            </div>
          </div>
        </form>
      </div>

    </div>
  );
}
