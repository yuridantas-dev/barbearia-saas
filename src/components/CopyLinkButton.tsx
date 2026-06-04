import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyLinkButtonProps {
  url: string;
  fullUrl?: boolean;
  label?: string;
  className?: string;
}

export default function CopyLinkButton({ url, fullUrl = true, label, className = '' }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const text = fullUrl && url.startsWith('/') ? `${window.location.origin}${url}` : url;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-amber-500 hover:border-amber-500/40 transition-all text-xs ${className}`}
      title="Copiar link"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {label && <span>{copied ? 'Copiado!' : label}</span>}
    </button>
  );
}

export function FullLinkDisplay({ path, description }: { path: string; description?: string }) {
  const full = `${window.location.origin}${path}`;

  return (
    <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-2">
      {description && <p className="text-[11px] text-zinc-400">{description}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <code className="flex-1 min-w-0 text-[10px] font-mono text-zinc-300 bg-zinc-900 px-2 py-1.5 rounded truncate">
          {full}
        </code>
        <CopyLinkButton url={path} label="Copiar" />
      </div>
    </div>
  );
}
