import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { hashPassword, verifyPassword } from './auth.js';

neonConfig.webSocketConstructor = ws;

const url = (process.env.DATABASE_URL || '').replace('-pooler.', '.');
if (!url) {
  console.error('DATABASE_URL não definida');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

const admins = await pool.query(
  'SELECT email, name, is_platform_admin FROM users WHERE is_platform_admin = true'
);
console.log('Admins da plataforma no banco:', admins.rows);

const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL || 'admin@barbearia.app').trim().toLowerCase();
const adminPass = process.env.PLATFORM_ADMIN_PASSWORD || 'admin123456';

const user = await pool.query<{ email: string; password_hash: string; is_platform_admin: boolean }>(
  'SELECT email, password_hash, is_platform_admin FROM users WHERE email = $1',
  [adminEmail]
);

if (user.rows.length === 0) {
  console.log(`\n❌ Usuário ${adminEmail} NÃO existe. Rode: npm run db:migrate`);
} else {
  const ok = await verifyPassword(adminPass, user.rows[0].password_hash);
  console.log(`\nUsuário ${adminEmail}:`, user.rows[0].is_platform_admin ? 'é admin' : 'NÃO é admin');
  console.log(`Senha do .env bate?`, ok ? '✓ SIM' : '✗ NÃO — rode npm run db:migrate ou db:reset-admin');
}

await pool.end();
