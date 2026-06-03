import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Shield, Plus, Users, LogOut } from 'lucide-react';
import { apiFetch, getToken } from '../api/client';
import { loginStaff, logoutPlatform, fetchMe } from '../api/authApi';
import { getAdminUrl, getAssistantUrl } from '../shops';
import ForgotPasswordForm from '../components/ForgotPasswordForm';

interface ShopRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  active: boolean;
}

export default function PlatformPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [error, setError] = useState('');

  const [newShop, setNewShop] = useState({ slug: '', name: '', tagline: '' });
  const [memberForm, setMemberForm] = useState({
    shopId: '',
    email: '',
    name: '',
    password: '',
    role: 'owner' as 'owner' | 'manager' | 'barber'
  });

  useEffect(() => {
    (async () => {
      if (!getToken('platform')) {
        setChecking(false);
        return;
      }
      const me = await fetchMe('platform');
      if (me) {
        setAuthed(true);
        loadShops();
      }
      setChecking(false);
    })();
  }, []);

  const loadShops = async () => {
    const data = await apiFetch<ShopRow[]>('/platform/shops', {}, 'platform');
    setShops(data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await loginStaff(email, password, '');
      setAuthed(true);
      await loadShops();
    } catch {
      setError('Credenciais inválidas');
    }
  };

  const handleLogout = () => {
    logoutPlatform();
    setAuthed(false);
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/platform/shops', { method: 'POST', body: JSON.stringify(newShop) }, 'platform');
    setNewShop({ slug: '', name: '', tagline: '' });
    await loadShops();
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch(
      `/platform/shops/${memberForm.shopId}/members`,
      { method: 'POST', body: JSON.stringify(memberForm) },
      'platform'
    );
    alert('Membro adicionado!');
  };

  if (checking) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Carregando...</div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <Shield className="w-10 h-10 text-violet-400 mx-auto" />
          <h1 className="text-lg font-semibold text-white text-center font-display">
            {showForgot ? 'Esqueci minha senha' : 'Painel SaaS'}
          </h1>

          {showForgot ? (
            <ForgotPasswordForm
              accountType="staff"
              onBack={() => setShowForgot(false)}
              onSuccess={() => setShowForgot(false)}
            />
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="E-mail admin"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white"
            required
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm">
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="w-full text-xs text-zinc-400 hover:text-violet-400"
          >
            Esqueci minha senha
          </button>
          <Link to="/" className="block text-center text-xs text-zinc-500">← Início</Link>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold font-display">Painel SaaS — Barbearias</h1>
          <button onClick={handleLogout} className="text-xs text-red-400 flex items-center gap-1 hover:text-red-300">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>

        <form onSubmit={handleCreateShop} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
          <h2 className="text-sm font-semibold text-violet-400 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova barbearia
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              placeholder="slug (ex: minha-barbearia)"
              value={newShop.slug}
              onChange={e => setNewShop(p => ({ ...p, slug: e.target.value }))}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm"
              required
            />
            <input
              placeholder="Nome"
              value={newShop.name}
              onChange={e => setNewShop(p => ({ ...p, name: e.target.value }))}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm"
              required
            />
            <input
              placeholder="Tagline"
              value={newShop.tagline}
              onChange={e => setNewShop(p => ({ ...p, tagline: e.target.value }))}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold">
            Criar barbearia
          </button>
        </form>

        <div className="space-y-3">
          {shops.map(shop => (
            <div key={shop.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">{shop.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">{shop.slug}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <Link to={getAssistantUrl(shop.slug)} className="text-amber-500 hover:underline">Assistente</Link>
                  <Link to={getAdminUrl(shop.slug)} className="text-violet-400 hover:underline">Admin</Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddMember} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
          <h2 className="text-sm font-semibold text-amber-500 flex items-center gap-2">
            <Users className="w-4 h-4" /> Adicionar dono / barbeiro
          </h2>
          <select
            value={memberForm.shopId}
            onChange={e => setMemberForm(p => ({ ...p, shopId: e.target.value }))}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm"
            required
          >
            <option value="">Selecione a barbearia</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              placeholder="Nome"
              value={memberForm.name}
              onChange={e => setMemberForm(p => ({ ...p, name: e.target.value }))}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm"
              required
            />
            <input
              type="email"
              placeholder="E-mail"
              value={memberForm.email}
              onChange={e => setMemberForm(p => ({ ...p, email: e.target.value }))}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm"
              required
            />
            <input
              type="password"
              placeholder="Senha inicial"
              value={memberForm.password}
              onChange={e => setMemberForm(p => ({ ...p, password: e.target.value }))}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm"
              required
            />
            <select
              value={memberForm.role}
              onChange={e => setMemberForm(p => ({ ...p, role: e.target.value as typeof memberForm.role }))}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm"
            >
              <option value="owner">Dono</option>
              <option value="manager">Gerente</option>
              <option value="barber">Barbeiro</option>
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold">
            Adicionar membro
          </button>
        </form>
      </div>
    </div>
  );
}
