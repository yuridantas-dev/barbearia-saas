import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { hashPassword, verifyPassword, signToken } from '../auth.js';
import { requireAuth, AuthRequest } from '../middleware.js';
import { sendPasswordResetCode } from '../email.js';

const router = Router();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateResetCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashResetCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

const RESET_GENERIC_MSG =
  'Se este e-mail estiver cadastrado, enviamos um código de 6 dígitos. Verifique sua caixa de entrada.';

/** Solicitar código para redefinir senha (cliente ou staff) */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, accountType = 'customer' } = req.body as {
      email?: string;
      accountType?: 'customer' | 'staff';
    };

    if (!email?.trim()) {
      return res.status(400).json({ error: 'Informe seu e-mail' });
    }

    const normalized = normalizeEmail(email);
    const rows = await query<{ id: string; name: string; is_platform_admin: boolean }>`
      SELECT id, name, is_platform_admin FROM users WHERE email = ${normalized}
    `;

    if (rows.length > 0) {
      const user = rows[0];

      if (accountType === 'staff') {
        const hasStaffAccess =
          user.is_platform_admin ||
          (await query`SELECT 1 FROM shop_members WHERE user_id = ${user.id} LIMIT 1`).length > 0;
        if (!hasStaffAccess) {
          return res.json({ message: RESET_GENERIC_MSG });
        }
      }

      const code = generateResetCode();
      const tokenHash = hashResetCode(code);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await query`
        UPDATE password_reset_tokens SET used_at = now()
        WHERE user_id = ${user.id} AND used_at IS NULL
      `;

      await query`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${tokenHash}, ${expiresAt})
      `;

      await sendPasswordResetCode(normalized, code, user.name);
    }

    res.json({ message: RESET_GENERIC_MSG });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao solicitar redefinição de senha' });
  }
});

/** Redefinir senha com código */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, accountType = 'customer' } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
      accountType?: 'customer' | 'staff';
    };

    if (!email?.trim() || !code?.trim() || !newPassword) {
      return res.status(400).json({ error: 'E-mail, código e nova senha são obrigatórios' });
    }

    const normalized = normalizeEmail(email);
    const cleanCode = code.replace(/\D/g, '');

    if (accountType === 'customer') {
      if (!/^\d{4}$/.test(newPassword)) {
        return res.status(400).json({ error: 'A senha deve ter 4 dígitos' });
      }
    } else if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: 'Código inválido' });
    }

    const users = await query<{ id: string }>`
      SELECT id FROM users WHERE email = ${normalized}
    `;
    if (users.length === 0) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    const userId = users[0].id;
    const tokenHash = hashResetCode(cleanCode);

    const tokens = await query<{ id: string }>`
      SELECT id FROM password_reset_tokens
      WHERE user_id = ${userId}
        AND token_hash = ${tokenHash}
        AND used_at IS NULL
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    const passwordHash = await hashPassword(newPassword);
    await query`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
    await query`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${tokens[0].id}`;

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

/** Registro de cliente (assistente) */
router.post('/register-customer', async (req, res) => {
  try {
    const { name, email, pin } = req.body as { name?: string; email?: string; pin?: string };
    if (!name?.trim() || !email?.trim() || !pin) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'Senha deve ter 4 dígitos' });
    }

    const normalized = normalizeEmail(email);
    const existing = await query`SELECT id FROM users WHERE email = ${normalized}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const passwordHash = await hashPassword(pin);
    const rows = await query<{ id: string; email: string; name: string }>`
      INSERT INTO users (email, password_hash, name)
      VALUES (${normalized}, ${passwordHash}, ${name.trim()})
      RETURNING id, email, name
    `;

    const user = rows[0];
    const token = signToken({ userId: user.id, email: user.email, isPlatformAdmin: false });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao registrar' });
  }
});

/** Login cliente */
router.post('/login-customer', async (req, res) => {
  try {
    const { email, pin } = req.body as { email?: string; pin?: string };
    if (!email || !pin) return res.status(400).json({ error: 'E-mail e senha obrigatórios' });

    const normalized = normalizeEmail(email);
    const rows = await query<{ id: string; email: string; name: string; password_hash: string; is_platform_admin: boolean }>`
      SELECT id, email, name, password_hash, is_platform_admin FROM users WHERE email = ${normalized}
    `;
    if (rows.length === 0) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    const user = rows[0];
    const ok = await verifyPassword(pin, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    const token = signToken({
      userId: user.id,
      email: user.email,
      isPlatformAdmin: user.is_platform_admin
    });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error('[login-customer]', e);
    res.status(500).json({ error: dbErrorMessage(e) });
  }
});

function dbErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : '';
  if (msg.includes('does not exist') || msg.includes('relation')) {
    return 'Banco não migrado. No PC: npm run db:migrate (com DATABASE_URL do Neon no .env).';
  }
  if (msg.includes('DATABASE_URL') || msg.includes('not a valid URL') || msg.includes('inválida')) {
    return 'API sem DATABASE_URL válida no Render. Cole a URL postgresql:// do Neon (igual ao .env local).';
  }
  return 'Erro ao entrar';
}

/** Login staff (dono, gerente, barbeiro) ou platform admin */
router.post('/login-staff', async (req, res) => {
  try {
    const { email, password, shopSlug } = req.body as {
      email?: string;
      password?: string;
      shopSlug?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha obrigatórios' });
    }

    const normalized = normalizeEmail(email);
    const passwordClean = password.trim();
    const rows = await query<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
      is_platform_admin: boolean;
    }>`SELECT id, email, name, password_hash, is_platform_admin FROM users WHERE email = ${normalized}`;

    if (rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });
    const user = rows[0];
    const ok = await verifyPassword(passwordClean, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    if (user.is_platform_admin) {
      const token = signToken({
        userId: user.id,
        email: user.email,
        isPlatformAdmin: true
      });
      return res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email },
        role: 'platform_admin',
        shops: []
      });
    }

    if (!shopSlug) {
      return res.status(403).json({
        error: 'Esta conta não é administrador da plataforma. Use o e-mail cadastrado no painel SaaS.'
      });
    }

    const membership = await query<{ role: string; shop_id: string; shop_name: string; slug: string }>`
      SELECT sm.role, s.id as shop_id, s.name as shop_name, s.slug
      FROM shop_members sm
      JOIN shops s ON s.id = sm.shop_id
      WHERE sm.user_id = ${user.id} AND s.slug = ${shopSlug} AND s.active = true
    `;

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Você não tem acesso a esta barbearia' });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      isPlatformAdmin: false
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      role: membership[0].role,
      shop: { id: membership[0].shop_id, name: membership[0].shop_name, slug: membership[0].slug }
    });
  } catch (e) {
    console.error('[login-staff]', e);
    res.status(500).json({ error: dbErrorMessage(e) });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const rows = await query<{ id: string; email: string; name: string; is_platform_admin: boolean }>`
    SELECT id, email, name, is_platform_admin FROM users WHERE id = ${req.user!.userId}
  `;
  if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  const u = rows[0];
  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    isPlatformAdmin: u.is_platform_admin
  });
});

export default router;
