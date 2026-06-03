import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<boolean, boolean> | null = null;

function getSql(): NeonQueryFunction<boolean, boolean> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não configurada');
    }
    _sql = neon(process.env.DATABASE_URL);
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
