import React, { useState } from 'react';
import { requestPasswordReset, resetPasswordWithCode } from '../api/authApi';

interface ForgotPasswordFormProps {
  accountType: 'customer' | 'staff';
  onBack: () => void;
  onSuccess?: () => void;
  pinMode?: boolean;
}

export default function ForgotPasswordForm({
  accountType,
  onBack,
  onSuccess,
  pinMode = false
}: ForgotPasswordFormProps) {
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordLabel = pinMode ? 'Nova senha (4 dígitos)' : 'Nova senha';
  const passwordMin = pinMode ? 4 : 6;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const msg = await requestPasswordReset(email.trim().toLowerCase(), accountType);
      setMessage(msg);
      setStep('code');
    } catch (err) {
      setError((err as Error).message || 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('As senhas não coincidem');
      return;
    }
    if (pinMode && !/^\d{4}$/.test(password)) {
      setError('A senha deve ter 4 dígitos');
      return;
    }
    if (!pinMode && password.length < passwordMin) {
      setError(`A senha deve ter pelo menos ${passwordMin} caracteres`);
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithCode(email.trim().toLowerCase(), code, password, accountType);
      setStep('done');
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message || 'Código inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-emerald-400">Senha redefinida com sucesso!</p>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all"
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleReset} className="space-y-4">
        {message && <p className="text-xs text-zinc-400">{message}</p>}
        <input
          type="text"
          inputMode="numeric"
          placeholder="Código de 6 dígitos"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="app-input focus:border-violet-500"
          required
        />
        <input
          type={pinMode ? 'tel' : 'password'}
          inputMode={pinMode ? 'numeric' : undefined}
          placeholder={passwordLabel}
          value={password}
          onChange={e =>
            setPassword(pinMode ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value)
          }
          className="app-input focus:border-violet-500"
          required
        />
        <input
          type={pinMode ? 'tel' : 'password'}
          inputMode={pinMode ? 'numeric' : undefined}
          placeholder="Confirmar senha"
          value={confirm}
          onChange={e =>
            setConfirm(pinMode ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value)
          }
          className="app-input focus:border-violet-500"
          required
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>
        <button type="button" onClick={onBack} className="w-full text-xs text-zinc-500 hover:text-zinc-300">
          ← Voltar ao login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequest} className="space-y-4">
      <p className="text-xs text-zinc-400">
        Informe seu e-mail. Enviaremos um código de 6 dígitos para redefinir sua senha.
      </p>
      <input
        type="email"
        placeholder="E-mail cadastrado"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="app-input focus:border-violet-500"
        required
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar código'}
      </button>
      <button type="button" onClick={onBack} className="w-full text-xs text-zinc-500 hover:text-zinc-300">
        ← Voltar ao login
      </button>
    </form>
  );
}
