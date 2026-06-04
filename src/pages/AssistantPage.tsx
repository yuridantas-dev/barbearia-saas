import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Scissors, Sparkles } from 'lucide-react';
import { useBarbeariaStore } from '../hooks/useBarbeariaStore';
import { useAssistantViewport } from '../hooks/useAssistantViewport';
import ChatAssistant from '../components/ChatAssistant';

function AssistantView({ slug }: { slug: string }) {
  const store = useBarbeariaStore(slug);
  const keyboardInset = useAssistantViewport(`/b/${slug}`);

  if (store.shopNotFound && !store.loading) {
    return (
      <div className="min-h-dvh bg-zinc-950 flex items-center justify-center p-4 text-center">
        <p className="text-zinc-400">Barbearia não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col h-dvh max-h-dvh overflow-hidden bg-zinc-950 text-zinc-100 sm:relative sm:inset-auto sm:min-h-screen sm:h-auto sm:max-h-none sm:overflow-visible">
      {/* Cabeçalho da página — só em telas maiores (no celular o chat já tem o header) */}
      <header className="hidden sm:block px-4 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 shrink-0">
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
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 w-full sm:max-w-2xl sm:mx-auto sm:p-4">
        <div className="flex-1 flex flex-col min-h-0 sm:min-h-[520px] lg:min-h-0">
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
              keyboardInset={keyboardInset}
            />
          )}
        </div>
      </main>

      <footer className="hidden sm:block py-2 px-4 text-center text-[10px] text-slate-600 border-t border-slate-900 shrink-0">
        Link exclusivo: <span className="font-mono text-slate-500">/b/{slug}</span>
      </footer>
    </div>
  );
}

export default function AssistantPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <Navigate to="/saas" replace />;
  }

  return <AssistantView slug={slug} />;
}
