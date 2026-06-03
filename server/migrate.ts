import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { hashPassword } from './auth.js';

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Divide o schema.sql respeitando blocos DO $$ ... END $$; */
function splitSqlStatements(raw: string): string[] {
  const lines = raw.split('\n').filter(line => !line.trim().startsWith('--'));
  const statements: string[] = [];
  let buffer = '';
  let inDoBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inDoBlock && /^DO\s+\$\$/.test(trimmed)) {
      inDoBlock = true;
    }

    buffer += `${line}\n`;

    if (inDoBlock) {
      if (/END\s+\$\$;/.test(trimmed)) {
        inDoBlock = false;
        statements.push(buffer.trim());
        buffer = '';
      }
      continue;
    }

    if (trimmed.endsWith(';')) {
      statements.push(buffer.trim());
      buffer = '';
    }
  }

  if (buffer.trim()) statements.push(buffer.trim());
  return statements.filter(Boolean);
}

/** Migrações DDL devem usar conexão direta (sem pooler). */
function getDirectDatabaseUrl(url: string): string {
  return url.replace('-pooler.', '.');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não definida no .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: getDirectDatabaseUrl(process.env.DATABASE_URL) });
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

  try {
    const statements = splitSqlStatements(schema);
    for (const stmt of statements) {
      await pool.query(stmt);
      const preview = stmt.split('\n')[0].replace(/\s+/g, ' ').slice(0, 55);
      console.log('✓', preview);
    }
    console.log('✓ Schema aplicado');

    const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'admin@barbearia.app';
    const adminPass = process.env.PLATFORM_ADMIN_PASSWORD || 'admin123456';
    const adminName = process.env.PLATFORM_ADMIN_NAME || 'Admin SaaS';

    const hash = await hashPassword(adminPass);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, is_platform_admin)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = $2,
         is_platform_admin = true,
         name = $3`,
      [adminEmail, hash, adminName]
    );
    console.log(`✓ Platform admin: ${adminEmail}`);

    const existing = await pool.query<{ c: number }>('SELECT COUNT(*)::int as c FROM shops');
    if (existing.rows[0].c === 0) {
      const shops = [
        { slug: 'navalha-estilo', name: 'Navalha & Estilo', tagline: 'Cortes modernos e barba na toalha quente' },
        { slug: 'barba-forte', name: 'Barba Forte', tagline: 'Especialistas em degradê e design de barba' },
        { slug: 'corte-classico', name: 'Corte Clássico', tagline: 'Tradição e elegância masculina' }
      ];

      for (const s of shops) {
        const inserted = await pool.query<{ id: string }>(
          `INSERT INTO shops (slug, name, tagline, phone, pix_key)
           VALUES ($1, $2, $3, '(11) 99999-8888', 'pix@demo.com')
           RETURNING id`,
          [s.slug, s.name, s.tagline]
        );
        const shopId = inserted.rows[0].id;

        const defaultServices = [
          ['Corte', 35, 30],
          ['Barba', 25, 20],
          ['Corte + Barba', 55, 50]
        ];
        for (const [name, price, duration] of defaultServices) {
          await pool.query(
            'INSERT INTO services (shop_id, name, price, duration) VALUES ($1, $2, $3, $4)',
            [shopId, name, price, duration]
          );
        }

        const defaultBarbers = [
          ['Lucas "Navalha"', 'Cabelo & Freestyle', 'LN', 4.9],
          ['Mateus Duarte', 'Especialista em Barba', 'MD', 4.8]
        ];
        for (const [name, specialty, avatar, rating] of defaultBarbers) {
          await pool.query(
            'INSERT INTO barbers (shop_id, name, specialty, avatar, rating) VALUES ($1, $2, $3, $4, $5)',
            [shopId, name, specialty, avatar, rating]
          );
        }
        console.log(`✓ Shop demo: ${s.slug}`);
      }
    }

    console.log('\nMigração concluída.');
  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
