import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { hashPassword } from './auth.js';

neonConfig.webSocketConstructor = ws;

const url = (process.env.DATABASE_URL || '').replace('-pooler.', '.');
if (!url) {
  console.error('DATABASE_URL não definida no .env');
  process.exit(1);
}

const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL || 'admin@barbearia.app').trim().toLowerCase();
const adminPass = process.env.PLATFORM_ADMIN_PASSWORD || 'admin123456';
const adminName = process.env.PLATFORM_ADMIN_NAME || 'Admin SaaS';

const pool = new Pool({ connectionString: url });

try {
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
  console.log(`✓ Admin SaaS atualizado: ${adminEmail}`);
  console.log(`  Senha: (a definida em PLATFORM_ADMIN_PASSWORD no .env)`);
} finally {
  await pool.end();
}
