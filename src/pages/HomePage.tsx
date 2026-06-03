import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors, MessageSquare, Shield, ExternalLink, Copy, Check } from 'lucide-react';
import { SHOPS, getAssistantUrl, getAdminUrl } from '../shops';

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);
  const fullUrl = `${window.location.origin}${url}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/50 text-slate-400 hover:text-amber-500 hover:border-amber-500/40 transition-all"
      title="Copiar link"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="px-4 py-6 border-b border-zinc-800/80">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Scissors className="w-6 h-6 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold font-display text-white tracking-tight">
            Barbearia SaaS
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Cada barbearia possui links únicos: assistente para clientes e admin para a equipe.
          </p>
          <Link to="/saas" className="text-xs text-violet-400 hover:underline inline-block">
            Painel SaaS (admin plataforma) →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
        {SHOPS.map(shop => {
          const assistantUrl = getAssistantUrl(shop.slug);
          const adminUrl = getAdminUrl(shop.slug);

          return (
            <div
              key={shop.slug}
              className="p-4 sm:p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl space-y-4 backdrop-blur-sm"
            >
              <div>
                <h2 className="text-lg font-bold text-white font-display">{shop.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{shop.tagline}</p>
                <p className="text-[10px] font-mono text-amber-500/70 mt-2">ID: {shop.slug}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-500">Cliente — Assistente IA</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Agendamento, login, cupons e cancelamento.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] font-mono text-slate-300 bg-slate-900 px-2 py-1.5 rounded truncate">
                      {assistantUrl}
                    </code>
                    <CopyLinkButton url={assistantUrl} />
                    <Link
                      to={assistantUrl}
                      className="p-1.5 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all"
                      title="Abrir assistente"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-400">Admin — Agenda & Config</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Quadro de horários, métricas e personalização.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] font-mono text-slate-300 bg-slate-900 px-2 py-1.5 rounded truncate">
                      {adminUrl}
                    </code>
                    <CopyLinkButton url={adminUrl} />
                    <Link
                      to={adminUrl}
                      className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-all"
                      title="Abrir admin"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
