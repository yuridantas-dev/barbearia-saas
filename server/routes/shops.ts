import { Router, Response, NextFunction } from 'express';
import { query } from '../db.js';
import { requireAuth, shopStaffOnly, ownerOrManager, AuthRequest } from '../middleware.js';

const router = Router();

async function getShopBySlug(slug: string) {
  const rows = await query<Record<string, unknown>>`
    SELECT * FROM shops WHERE slug = ${slug} AND active = true
  `;
  return rows[0] ?? null;
}

function mapConfig(shop: Record<string, unknown>) {
  return {
    name: shop.name,
    phone: shop.phone,
    pixKey: shop.pix_key,
    cancelBufferHours: shop.cancel_buffer_hours,
    openingTime: shop.opening_time,
    closingTime: shop.closing_time
  };
}

function mapAppointment(row: Record<string, unknown>) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    services: row.services_json,
    barberId: row.barber_id,
    barberName: row.barber_name,
    date: row.appointment_date,
    time: row.appointment_time,
    totalValue: Number(row.total_value),
    totalDuration: row.total_duration,
    paymentType: row.payment_type,
    paymentStatus: row.payment_status,
    createdAt: row.created_at
  };
}

router.get('/', async (_req, res) => {
  const shops = await query`
    SELECT slug, name, tagline FROM shops WHERE active = true ORDER BY name
  `;
  res.json(shops);
});

router.get('/:slug/public', async (req, res) => {
  const shop = await getShopBySlug(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'Barbearia não encontrada' });

  const services = await query`
    SELECT id, name, price, duration, description FROM services
    WHERE shop_id = ${shop.id} AND active = true ORDER BY name
  `;
  const barbers = await query`
    SELECT id, name, specialty, avatar, rating FROM barbers
    WHERE shop_id = ${shop.id} AND active = true ORDER BY name
  `;
  const appointments = await query`
    SELECT * FROM appointments WHERE shop_id = ${shop.id}
    ORDER BY appointment_date DESC, appointment_time DESC
  `;

  res.json({
    slug: shop.slug,
    name: shop.name,
    tagline: shop.tagline,
    config: mapConfig(shop),
    services: services.map(s => ({ ...s, price: Number(s.price) })),
    barbers: barbers.map(b => ({ ...b, rating: Number(b.rating) })),
    appointments: appointments.map(mapAppointment)
  });
});

/** Valida se o token (staff ou platform) tem acesso a esta barbearia */
router.get('/:slug/staff/session', requireAuth, shopStaffOnly(), async (req: AuthRequest, res) => {
  const rows = await query<{ id: string; name: string; email: string }>`
    SELECT id, name, email FROM users WHERE id = ${req.user!.userId}
  `;
  if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  const u = rows[0];
  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: req.shopMemberRole
  });
});

router.get('/:slug/appointments', requireAuth, shopStaffOnly(), async (req: AuthRequest, res) => {
  const shop = await getShopBySlug(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'Barbearia não encontrada' });

  const rows = await query`
    SELECT * FROM appointments WHERE shop_id = ${shop.id}
    ORDER BY appointment_date DESC, appointment_time DESC
  `;
  res.json(rows.map(mapAppointment));
});

router.get('/:slug/my-appointments', requireAuth, async (req: AuthRequest, res) => {
  const shop = await getShopBySlug(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'Barbearia não encontrada' });

  const rows = await query`
    SELECT * FROM appointments
    WHERE shop_id = ${shop.id}
      AND (customer_user_id = ${req.user!.userId} OR customer_email = ${req.user!.email})
    ORDER BY appointment_date, appointment_time
  `;
  res.json(rows.map(mapAppointment));
});

router.post('/:slug/appointments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const shop = await getShopBySlug(req.params.slug);
    if (!shop) return res.status(404).json({ error: 'Barbearia não encontrada' });

    const body = req.body as Record<string, unknown>;
    const rows = await query`
      INSERT INTO appointments (
        shop_id, customer_user_id, customer_name, customer_email,
        barber_id, barber_name, appointment_date, appointment_time,
        total_value, total_duration, payment_type, payment_status, services_json
      ) VALUES (
        ${shop.id}, ${req.user!.userId}, ${body.customerName}, ${req.user!.email},
        ${body.barberId}, ${body.barberName}, ${body.date}, ${body.time},
        ${body.totalValue}, ${body.totalDuration}, ${body.paymentType}, ${body.paymentStatus},
        ${JSON.stringify(body.services)}::jsonb
      )
      RETURNING *
    `;
    res.status(201).json(mapAppointment(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

router.patch('/:slug/appointments/:id', requireAuth, shopStaffOnly(), async (req: AuthRequest, res) => {
  try {
    const shop = await getShopBySlug(req.params.slug);
    if (!shop) return res.status(404).json({ error: 'Barbearia não encontrada' });

    const { date, time, barberId, barberName } = req.body as Record<string, string>;
    const rows = await query`
      UPDATE appointments SET
        appointment_date = COALESCE(${date ?? null}, appointment_date),
        appointment_time = COALESCE(${time ?? null}, appointment_time),
        barber_id = COALESCE(${barberId ?? null}::uuid, barber_id),
        barber_name = COALESCE(${barberName ?? null}, barber_name)
      WHERE id = ${req.params.id} AND shop_id = ${shop.id}
      RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(mapAppointment(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
});

router.delete('/:slug/appointments/:id', requireAuth, async (req: AuthRequest, res) => {
  const shop = await getShopBySlug(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'Barbearia não encontrada' });

  const apt = await query`
    SELECT * FROM appointments WHERE id = ${req.params.id} AND shop_id = ${shop.id}
  `;
  if (apt.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

  const row = apt[0];
  const isCustomer =
    row.customer_user_id === req.user!.userId || row.customer_email === req.user!.email;

  if (!isCustomer && !req.user!.isPlatformAdmin) {
    const membership = await query`
      SELECT 1 FROM shop_members sm WHERE sm.shop_id = ${shop.id} AND sm.user_id = ${req.user!.userId}
    `;
    if (membership.length === 0) {
      return res.status(403).json({ error: 'Sem permissão' });
    }
  }

  await query`DELETE FROM coupons WHERE appointment_id = ${req.params.id}`;
  await query`DELETE FROM appointments WHERE id = ${req.params.id}`;
  res.json({ ok: true, appointment: mapAppointment(row) });
});

router.put('/:slug/config', requireAuth, ownerOrManager, async (req: AuthRequest, res) => {
  try {
    const c = req.body as Record<string, unknown>;
    const rows = await query`
      UPDATE shops SET
        name = ${c.name}, phone = ${c.phone}, pix_key = ${c.pixKey},
        cancel_buffer_hours = ${c.cancelBufferHours},
        opening_time = ${c.openingTime}, closing_time = ${c.closingTime}
      WHERE slug = ${req.params.slug}
      RETURNING *
    `;
    res.json(mapConfig(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao salvar config' });
  }
});

router.put('/:slug/services', requireAuth, ownerOrManager, async (req: AuthRequest, res) => {
  const shop = await getShopBySlug(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'Barbearia não encontrada' });

  const services = req.body as Array<Record<string, unknown>>;
  await query`UPDATE services SET active = false WHERE shop_id = ${shop.id}`;

  for (const s of services) {
    const id = s.id as string;
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    if (isUuid) {
      await query`
        INSERT INTO services (id, shop_id, name, price, duration, description, active)
        VALUES (${id}, ${shop.id}, ${s.name}, ${s.price}, ${s.duration}, ${s.description || ''}, true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, price = EXCLUDED.price, duration = EXCLUDED.duration,
          description = EXCLUDED.description, active = true
      `;
    } else {
      await query`
        INSERT INTO services (shop_id, name, price, duration, description, active)
        VALUES (${shop.id}, ${s.name}, ${s.price}, ${s.duration}, ${s.description || ''}, true)
      `;
    }
  }

  const updated = await query`
    SELECT id, name, price, duration, description FROM services
    WHERE shop_id = ${shop.id} AND active = true
  `;
  res.json(updated.map(s => ({ ...s, price: Number(s.price) })));
});

router.put('/:slug/barbers', requireAuth, ownerOrManager, async (req: AuthRequest, res) => {
  const shop = await getShopBySlug(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'Barbearia não encontrada' });

  const barbers = req.body as Array<Record<string, unknown>>;
  await query`UPDATE barbers SET active = false WHERE shop_id = ${shop.id}`;

  for (const b of barbers) {
    const id = b.id as string;
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    if (isUuid) {
      await query`
        INSERT INTO barbers (id, shop_id, name, specialty, avatar, rating, active)
        VALUES (${id}, ${shop.id}, ${b.name}, ${b.specialty}, ${b.avatar}, ${b.rating ?? 5}, true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, specialty = EXCLUDED.specialty, avatar = EXCLUDED.avatar,
          rating = EXCLUDED.rating, active = true
      `;
    } else {
      await query`
        INSERT INTO barbers (shop_id, name, specialty, avatar, rating, active)
        VALUES (${shop.id}, ${b.name}, ${b.specialty}, ${b.avatar}, ${b.rating ?? 5}, true)
      `;
    }
  }

  const updated = await query`
    SELECT id, name, specialty, avatar, rating FROM barbers
    WHERE shop_id = ${shop.id} AND active = true
  `;
  res.json(updated.map(b => ({ ...b, rating: Number(b.rating) })));
});

router.get('/:slug/notifications', requireAuth, shopStaffOnly(), async (req: AuthRequest, res) => {
  const shop = await getShopBySlug(req.params.slug);
  if (!shop) return res.status(404).json({ error: 'Barbearia não encontrada' });

  const rows = await query`
    SELECT * FROM notifications WHERE shop_id = ${shop.id}
    ORDER BY created_at DESC LIMIT 50
  `;
  res.json(
    rows.map(n => ({
      id: n.id,
      type: n.type,
      recipientType: n.recipient_type,
      recipientId: n.recipient_id,
      title: n.title,
      message: n.message,
      appointmentId: n.appointment_id,
      read: n.read,
      createdAt: n.created_at
    }))
  );
});

router.patch('/:slug/notifications/:id/read', requireAuth, shopStaffOnly(), async (req, res) => {
  await query`UPDATE notifications SET read = true WHERE id = ${req.params.id}`;
  res.json({ ok: true });
});

export default router;
