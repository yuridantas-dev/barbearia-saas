import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Scissors, Shield, Sparkles } from 'lucide-react';
import { getShopBySlug, getAdminUrl } from '../shops';
import { useBarbeariaStore } from '../hooks/useBarbeariaStore';
import ChatAssistant from '../components/ChatAssistant';

function AssistantView({ slug }: { slug: string }) {
  const store = useBarbeariaStore(slug);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="px-4 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 shrink-0">
        <div className="max-w-2xl mx-auto flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold font-display text-white flex items-center gap-1.5 truncate">
                {store.config.name}
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </h1>
              <p className="text-[10px] text-slate-400 truncate">Assistente Virtual de Agendamentos</p>
            </div>
          </div>
          <Link
            to={getAdminUrl(slug)}
            className="shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-violet-400 hover:border-violet-500/30 flex items-center gap-1 transition-all"
            title="Painel administrativo"
          >
            <Shield className="w-3.5 h-3.5" /> Admin
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-4 flex flex-col min-h-0">
        <div className="flex-1 min-h-[520px] lg:min-h-0">
          {store.loading ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Carregando assistente...</div>
          ) : (
          <ChatAssistant
            useApi={store.useApi}
            config={store.config}
            services={store.services}
            barbers={store.barbers}
            appointments={store.appointments}
            onAddAppointment={store.handleAddAppointment}
            onUpdateAppointment={store.handleUpdateAppointment}
            onCancelAppointment={store.handleCancelAppointment}
          />
          )}
        </div>
      </main>

      <footer className="py-2 px-4 text-center text-[10px] text-slate-600 border-t border-slate-900">
        Link exclusivo: <span className="font-mono text-slate-500">/b/{slug}</span>
      </footer>
    </div>
  );
}

export default function AssistantPage() {
  const { slug } = useParams<{ slug: string }>();
  const shop = getShopBySlug(slug);

  if (!shop || !slug) {
    return <Navigate to="/" replace />;
  }

  return <AssistantView slug={slug} />;
}
