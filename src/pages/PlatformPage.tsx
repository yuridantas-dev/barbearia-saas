import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Plus, Users, LogOut, Store, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { apiFetch, getToken } from '../api/client';
import { loginStaff, logoutPlatform, fetchMe } from '../api/authApi';
import { getAdminUrl } from '../shops';
import ForgotPasswordForm from '../components/ForgotPasswordForm';
import { FullLinkDisplay } from '../components/CopyLinkButton';

interface ShopRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  active: boolean;
}

interface MemberRow {
  id: string;
  email: string;
  name: string;
  role: string;
}

const emptyMemberForm = {
  shopId: '',
  email: '',
  name: '',
  password: '',
  role: 'owner' as 'owner' | 'manager' | 'barber'
};

export default function PlatformPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [membersByShop, setMembersByShop] = useState<Record<string, MemberRow[]>>({});
  const [expandedShop, setExpandedShop] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  const [newShop, setNewShop] = useState({ slug: '', name: '', tagline: '' });
  const [memberForm, setMemberForm] = useState(emptyMemberForm);

  useEffect(() => {
    (async () => {
      if (!getToken('platform')) {
        setChecking(false);
        return;
      }
      const me = await fetchMe('platform');
      if (me) {
        setAuthed(true);
        await loadShops();
      }
      setChecking(false);
    })();
  }, []);

  const loadShops = async () => {
    const data = await apiFetch<ShopRow[]>('/platform/shops', {}, 'platform');
    setShops(data);
  };

  const loadMembers = async (shopId: string) => {
    const data = await apiFetch<MemberRow[]>(`/platform/shops/${shopId}/members`, {}, 'platform');
    setMembersByShop(prev => ({ ...prev, [shopId]: data }));
  };

  const toggleShop = async (shopId: string) => {
    if (expandedShop === shopId) {
      setExpandedShop(null);
      return;
    }
    setExpandedShop(shopId);
    setMemberForm({ ...emptyMemberForm, shopId });
    if (!membersByShop[shopId]) await loadMembers(shopId);
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
    setError('');
    try {
      await apiFetch('/platform/shops', { method: 'POST', body: JSON.stringify(newShop) }, 'platform');
      setNewShop({ slug: '', name: '', tagline: '' });
      await loadShops();
    } catch (err) {
      setError((err as Error).message || 'Erro ao criar barbearia');
    }
  };

  const handleAddMember = async (e: React.FormEvent, shopId: string) => {
    e.preventDefault();
    setError('');
    setMemberSuccess('');
    const payload = { ...memberForm, shopId };
    try {
      await apiFetch(`/platform/shops/${shopId}/members`, { method: 'POST', body: JSON.stringify(payload) }, 'platform');
      setMemberSuccess(`Acesso criado para ${memberForm.email}. Envie o link do admin ao dono.`);
      await loadMembers(shopId);
      setMemberForm({ ...emptyMemberForm, shopId });
    } catch (err) {
      setError((err as Error).message || 'Erro ao adicionar membro');
    }
  };

  if (checking) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Carregando...</div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <Shield className="w-10 h-10 text-violet-400 mx-auto" />
          <div className="text-center space-y-1">
            <h1 className="text-lg font-semibold text-white font-display">
              {showForgot ? 'Esqueci minha senha' : 'Barbearia SaaS'}
            </h1>
            <p className="text-xs text-zinc-500">Painel do dono da plataforma</p>
          </div>

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
                placeholder="E-mail"
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
                Entrar no painel SaaS
              </button>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="w-full text-xs text-zinc-400 hover:text-violet-400"
              >
                Esqueci minha senha
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-xl font-semibold font-display text-white">Painel SaaS</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Crie barbearias e cadastre donos. Cada dono acessa o admin da loja e copia o link do assistente para clientes.
            </p>
          </div>
          <button onClick={handleLogout} className="text-xs text-red-400 flex items-center gap-1 hover:text-red-300 shrink-0">
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
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
              required
            />
            <input
              placeholder="Nome da barbearia"
              value={newShop.name}
              onChange={e => setNewShop(p => ({ ...p, name: e.target.value }))}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
              required
            />
            <input
              placeholder="Descrição curta"
              value={newShop.tagline}
              onChange={e => setNewShop(p => ({ ...p, tagline: e.target.value }))}
              className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
            />
          </div>
          {error && !expandedShop && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold">
            Criar barbearia
          </button>
        </form>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
            <Store className="w-4 h-4" /> Barbearias ({shops.length})
          </h2>

          {shops.length === 0 && (
            <p className="text-sm text-zinc-500 p-4 border border-dashed border-zinc-800 rounded-xl text-center">
              Nenhuma barbearia ainda. Crie a primeira acima.
            </p>
          )}

          {shops.map(shop => {
            const expanded = expandedShop === shop.id;
            const adminPath = getAdminUrl(shop.slug);
            const members = membersByShop[shop.id] || [];
            const formOpen = memberForm.shopId === shop.id;

            return (
              <div key={shop.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleShop(shop.id)}
                  className="w-full p-4 flex justify-between items-center gap-3 text-left hover:bg-zinc-800/30 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-white">{shop.name}</h3>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{shop.slug}</p>
                    {shop.tagline && <p className="text-xs text-zinc-400 mt-1">{shop.tagline}</p>}
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                </button>

                {expanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-zinc-800/80 pt-4">
                    <div>
                      <p className="text-[11px] font-semibold text-violet-400 mb-2">Link do painel admin (envie ao dono)</p>
                      <FullLinkDisplay
                        path={adminPath}
                        description="O dono entra com o e-mail e senha cadastrados abaixo."
                      />
                      <Link
                        to={adminPath}
                        target="_blank"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-violet-400 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Abrir painel admin
                      </Link>
                    </div>

                    {members.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-zinc-400 mb-2">Equipe cadastrada</p>
                        <ul className="space-y-1">
                          {members.map(m => (
                            <li key={m.id} className="text-xs text-zinc-300 flex justify-between gap-2 py-1.5 px-2 bg-zinc-950 rounded-lg">
                              <span>{m.name} — {m.email}</span>
                              <span className="text-zinc-500 capitalize">{m.role}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <form
                      onSubmit={e => handleAddMember(e, shop.id)}
                      className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-2"
                    >
                      <h3 className="text-xs font-semibold text-amber-500 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Cadastrar dono / equipe
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          placeholder="Nome completo"
                          value={formOpen ? memberForm.name : ''}
                          onFocus={() => setMemberForm(p => ({ ...emptyMemberForm, shopId: shop.id, email: p.shopId === shop.id ? p.email : '', name: p.shopId === shop.id ? p.name : '', password: p.shopId === shop.id ? p.password : '', role: p.shopId === shop.id ? p.role : 'owner' }))}
                          onChange={e => setMemberForm(p => ({ ...p, shopId: shop.id, name: e.target.value }))}
                          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                          required
                        />
                        <input
                          type="email"
                          placeholder="E-mail de login"
                          value={formOpen ? memberForm.email : ''}
                          onChange={e => setMemberForm(p => ({ ...p, shopId: shop.id, email: e.target.value }))}
                          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                          required
                        />
                        <input
                          type="password"
                          placeholder="Senha inicial"
                          value={formOpen ? memberForm.password : ''}
                          onChange={e => setMemberForm(p => ({ ...p, shopId: shop.id, password: e.target.value }))}
                          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                          required
                        />
                        <select
                          value={formOpen ? memberForm.role : 'owner'}
                          onChange={e => setMemberForm(p => ({ ...p, shopId: shop.id, role: e.target.value as typeof memberForm.role }))}
                          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                        >
                          <option value="owner">Dono</option>
                          <option value="manager">Gerente</option>
                          <option value="barber">Barbeiro</option>
                        </select>
                      </div>
                      {memberSuccess && formOpen && <p className="text-xs text-emerald-400">{memberSuccess}</p>}
                      {error && formOpen && <p className="text-xs text-red-400">{error}</p>}
                      <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold">
                        Criar acesso
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
