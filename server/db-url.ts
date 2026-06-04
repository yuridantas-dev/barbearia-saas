/** Connection string válida para Neon (conexão direta, sem pooler). */
export function resolveDatabaseUrl(): string {
  const raw = (process.env.DATABASE_URL || '').trim();
  if (!raw) {
    throw new Error('DATABASE_URL não configurada');
  }
  if (!raw.startsWith('postgresql://') && !raw.startsWith('postgres://')) {
    throw new Error(
      'DATABASE_URL inválida no Render — cole a URL completa do Neon (começa com postgresql://), não um texto de exemplo.'
    );
  }
  return raw.replace('-pooler.', '.');
}
