import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';
import ws from 'ws';
import { resolveDatabaseUrl } from './db-url.js';

neonConfig.webSocketConstructor = ws;

let _sql: NeonQueryFunction<boolean, boolean> | null = null;

function getSql(): NeonQueryFunction<boolean, boolean> {
  if (!_sql) {
    _sql = neon(resolveDatabaseUrl());
  }
  return _sql;
}

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL não definida — API não conectará ao Neon.');
}

export async function query<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const result = await getSql()(strings, ...values);
  return result as T[];
}
