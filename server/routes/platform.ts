import { Router } from 'express';
import { query } from '../db.js';
import { hashPassword } from '../auth.js';
import { requireAuth, requirePlatformAdmin, AuthRequest } from '../middleware.js';

const router = Router();

router.use(requireAuth, requirePlatformAdmin);

/** Listar todas as barbearias */
router.get('/shops', async (_req, res) => {
  const shops = await query`
    SELECT id, slug, name, tagline, phone, active, created_at
    FROM shops ORDER BY created_at DESC
  `;
  res.json(shops);
});

/** Criar barbearia */
router.post('/shops', async (req, res) => {
  try {
    const { slug, name, tagline, phone, pixKey, openingTime, closingTime, cancelBufferHours } =
      req.body as Record<string, string | number>;

    if (!slug || !name) {
      return res.status(400).json({ error: 'slug e name são obrigatórios' });
    }

    const rows = await query`
      INSERT INTO shops (slug, name, tagline, phone, pix_key, opening_time, closing_time, cancel_buffer_hours)
      VALUES (
        ${String(slug).toLowerCase().replace(/\s+/g, '-')},
        ${name},
        ${tagline || ''},
        ${phone || ''},
        ${pixKey || ''},
        ${openingTime || '09:00'},
        ${closingTime || '19:00'},
        ${Number(cancelBufferHours) || 2}
      )
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return res.status(409).json({ error: 'Slug já existe' });
    }
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar barbearia' });
  }
});

/** Adicionar membro (dono, gerente ou barbeiro) */
router.post('/shops/:shopId/members', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { email, name, password, role } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      role?: 'owner' | 'manager' | 'barber';
    };

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'email, name, password e role são obrigatórios' });
    }

    const normalized = email.trim().toLowerCase();
    let userId: string;

    const existing = await query<{ id: string }>`SELECT id FROM users WHERE email = ${normalized}`;
    if (existing.length > 0) {
      userId = existing[0].id;
    } else {
      const hash = await hashPassword(password);
      const created = await query<{ id: string }>`
        INSERT INTO users (email, password_hash, name) VALUES (${normalized}, ${hash}, ${name.trim()})
        RETURNING id
      `;
      userId = created[0].id;
    }

    await query`
      INSERT INTO shop_members (shop_id, user_id, role)
      VALUES (${shopId}, ${userId}, ${role})
      ON CONFLICT (shop_id, user_id) DO UPDATE SET role = ${role}
    `;

    res.status(201).json({ userId, email: normalized, role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao adicionar membro' });
  }
});

/** Listar membros de uma barbearia */
router.get('/shops/:shopId/members', async (req, res) => {
  const { shopId } = req.params;
  const members = await query`
    SELECT u.id, u.email, u.name, sm.role, sm.created_at
    FROM shop_members sm
    JOIN users u ON u.id = sm.user_id
    WHERE sm.shop_id = ${shopId}
    ORDER BY sm.created_at
  `;
  res.json(members);
});

export default router;
