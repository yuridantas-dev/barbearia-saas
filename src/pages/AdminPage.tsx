import React, { useState, useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Scissors, MessageSquare, Sliders, Info, RefreshCw, Calendar, LogOut, Shield } from 'lucide-react';
import { getShopBySlug, getAssistantUrl } from '../shops';
import { useBarbeariaStore } from '../hooks/useBarbeariaStore';
import { loginStaff, logoutStaff, fetchMe } from '../api/authApi';
import { getToken } from '../api/client';
import ForgotPasswordForm from '../components/ForgotPasswordForm';
import AgendaPanel from '../components/AgendaPanel';
import SettingsPanel from '../components/SettingsPanel';

function StaffLogin({ slug, onSuccess }: { slug: string; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginStaff(email, password, slug);
      onSuccess();
    } catch (err) {
      setError((err as Error).message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-4">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 text-violet-400 mx-auto" />
          <h1 className="text-lg font-semibold font-display text-white">
            {showForgot ? 'Esqueci minha senha' : 'Acesso Admin'}
          </h1>
          <p className="text-xs text-zinc-400">Barbearia: <span className="text-violet-400 font-mono">{slug}</span></p>
        </div>

        {showForgot ? (
          <ForgotPasswordForm
            accountType="staff"
            onBack={() => setShowForgot(false)}
            onSuccess={() => setShowForgot(false)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white outline-none focus:border-violet-500"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white outline-none focus:border-violet-500"
          required
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <button
          type="button"
          onClick={() => setShowForgot(true)}
          className="w-full text-xs text-zinc-400 hover:text-violet-400 transition-colors"
        >
          Esqueci minha senha
        </button>
        <Link to="/" className="block text-center text-xs text-zinc-500 hover:text-zinc-300">
          ← Voltar
        </Link>
          </form>
        )}
      </div>
    </div>
  );
}

function AdminView({ slug }: { slug: string }) {
  const store = useBarbeariaStore(slug, { admin: true });
  const [activeTab, setActiveTab] = useState<'agenda' | 'settings'>('agenda');
  const [staffUser, setStaffUser] = useState<{ name: string; email: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const requiresStaffAuth =
    store.useApi || Boolean(import.meta.env.VITE_API_URL);

  useEffect(() => {
    if (!requiresStaffAuth) {
      setAuthChecked(true);
      return;
    }

    const staffToken = getToken('staff');
    const platformToken = getToken('platform');

    if (staffToken || platformToken) {
      fetchMe(platformToken ? 'platform' : 'staff').then(u => {
        if (u) setStaffUser(u);
        setAuthChecked(true);
      });
    } else {
      setStaffUser(null);
      setAuthChecked(true);
    }
  }, [requiresStaffAuth]);

  if (store.loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        Carregando...
      </div>
    );
  }

  if (requiresStaffAuth && authChecked && !staffUser) {
    return <StaffLogin slug={slug} onSuccess={() => window.location.reload()} />;
  }

  const handleLogout = () => {
    logoutStaff();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="px-4 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold font-display text-white">
                {store.config.name} — Admin
              </h1>
              <p className="text-[10px] text-slate-400">
                {staffUser ? `${staffUser.name} • ${staffUser.email}` : 'Modo local'}
                {store.useApi && ' • Neon'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap justify-center">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'agenda'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950/40 text-slate-400 border border-slate-900 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Agenda
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950/40 text-slate-400 border border-slate-900 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Configurações
            </button>
            <Link
              to={getAssistantUrl(slug)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-950/50 text-slate-400 hover:text-amber-500 flex items-center gap-1.5 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Assistente
            </Link>
            {store.useApi && staffUser && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-1 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair
              </button>
            )}
            {!store.useApi && (
              <button
                onClick={store.handleResetDemoData}
                className="p-1.5 bg-slate-950/40 text-slate-500 hover:text-amber-500 rounded-lg border border-slate-900 transition-all"
                title="Redefinir dados de teste"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 flex flex-col min-h-0 overflow-hidden">
        {store.apiError && (
          <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            {store.apiError}
          </div>
        )}
        {activeTab === 'agenda' ? (
          <div className="flex-1 min-h-[600px] lg:min-h-0">
            <AgendaPanel
              config={store.config}
              barbers={store.barbers}
              appointments={store.appointments}
              notifications={store.notifications}
              onCancelAppointment={store.handleCancelAppointment}
              onMarkNotificationRead={store.markNotificationRead}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-white font-display">Painel de Customização</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Alterações aqui refletem imediatamente no assistente em{' '}
                  <Link to={getAssistantUrl(slug)} className="text-amber-500 hover:underline font-mono">
                    /b/{slug}
                  </Link>
                  .
                </p>
              </div>
              <SettingsPanel
                config={store.config}
                onUpdateConfig={store.setConfig}
                services={store.services}
                onUpdateServices={store.setServices}
                barbers={store.barbers}
                onUpdateBarbers={store.setBarbers}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="py-2 px-4 text-center text-[10px] text-slate-600 border-t border-slate-900">
        Link exclusivo admin: <span className="font-mono text-slate-500">/admin/{slug}</span>
      </footer>
    </div>
  );
}

export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const shop = getShopBySlug(slug);

  if (!shop || !slug) {
    return <Navigate to="/" replace />;
  }

  return <AdminView slug={slug} />;
}
