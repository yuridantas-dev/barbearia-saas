import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import shopRoutes from './routes/shops.js';
import platformRoutes from './routes/platform.js';

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

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    database: Boolean(process.env.DATABASE_URL),
    time: new Date().toISOString()
  });
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
