import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from './auth.js';
import { query } from './db.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
  shopMemberRole?: 'owner' | 'manager' | 'barber';
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) return res.status(401).json({ error: 'Token inválido ou expirado' });
  req.user = payload;
  next();
}

export function requirePlatformAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isPlatformAdmin) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador da plataforma' });
  }
  next();
}

export async function requireShopStaff(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  minRoles: Array<'owner' | 'manager' | 'barber'> = ['owner', 'manager', 'barber']
) {
  const slug = req.params.slug;
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

  if (req.user.isPlatformAdmin) {
    req.shopMemberRole = 'owner';
    return next();
  }

  const rows = await query<{ role: string }>`
    SELECT sm.role FROM shop_members sm
    JOIN shops s ON s.id = sm.shop_id
    WHERE s.slug = ${slug} AND sm.user_id = ${req.user.userId}
  `;

  if (rows.length === 0) {
    return res.status(403).json({ error: 'Sem permissão nesta barbearia' });
  }

  const role = rows[0].role as 'owner' | 'manager' | 'barber';
  if (!minRoles.includes(role)) {
    return res.status(403).json({ error: 'Permissão insuficiente' });
  }

  req.shopMemberRole = role;
  next();
}

export function shopStaffOnly(...minRoles: Array<'owner' | 'manager' | 'barber'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    void requireShopStaff(req, res, next, minRoles);
  };
}

export function ownerOrManager(req: AuthRequest, res: Response, next: NextFunction) {
  void requireShopStaff(req, res, next, ['owner', 'manager']);
}
