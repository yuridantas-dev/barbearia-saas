import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import shopRoutes from './routes/shops.js';
import platformRoutes from './routes/platform.js';
import { query } from './db.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    name: 'Barbearia SaaS API',
    ok: true,
    health: '/api/health',
    hint: 'O app (React) fica na Vercel. Esta URL é só a API.'
  });
});

app.get('/api/health', async (_req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json({
      ok: true,
      database: false,
      error: 'DATABASE_URL não configurada no Render',
      time: new Date().toISOString()
    });
  }
  try {
    await query`SELECT 1 AS ok`;
    res.json({ ok: true, database: true, time: new Date().toISOString() });
  } catch (e) {
    console.error('[health]', e);
    res.json({
      ok: true,
      database: false,
      error: e instanceof Error ? e.message : 'Falha ao conectar no Neon',
      time: new Date().toISOString()
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/platform', platformRoutes);

app.listen(PORT, () => {
  console.log(`[api] http://localhost:${PORT}`);
  if (!process.env.DATABASE_URL) {
    console.warn('[api] Defina DATABASE_URL no .env (Neon)');
  }
});
