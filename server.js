'use strict';

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = (process.env.NODE_ENV || 'development') === 'production';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'MAD-ADMIN-2026';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-session-secret';
const DATABASE_URL = process.env.DATABASE_URL;
const MOYASAR_PUBLISHABLE_KEY = process.env.MOYASAR_PUBLISHABLE_KEY || '';
const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || '';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
if (IS_PROD && (ADMIN_TOKEN === 'MAD-ADMIN-2026' || SESSION_SECRET === 'change-this-session-secret')) {
  console.error('Production requires secure ADMIN_TOKEN and SESSION_SECRET');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 8, idleTimeoutMillis: 30000 });
const now = () => new Date().toISOString();

app.disable('x-powered-by');
app.use(express.json({ limit: '6mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const parseCookies = req => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(v => {
  const i = v.indexOf('=');
  return [decodeURIComponent(v.slice(0, i).trim()), decodeURIComponent(v.slice(i + 1))];
}));
const hash = p => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(p, salt, 64).toString('hex')}`;
};
const verify = (p, stored) => {
  try {
    const [salt, key] = stored.split(':');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), crypto.scryptSync(p, salt, 64));
  } catch { return false; }
};
const sessionCookie = token => `mad_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${IS_PROD ? '; Secure' : ''}`;
const admin = req => req.headers['x-admin-token'] === ADMIN_TOKEN;

async function currentUser(req) {
  const token = parseCookies(req).mad_session;
  if (!token) return null;
  const { rows } = await pool.query(`SELECT u.id,u.name,u.email,u.phone FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>NOW()`, [token]);
  return rows[0] || null;
}
async function createSession(userId) {
  const raw = crypto.randomBytes(32).toString('hex');
  const token = crypto.createHmac('sha256', SESSION_SECRET).update(raw).digest('hex');
  await pool.query(`INSERT INTO sessions(token,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '7 days')`, [token, userId]);
  return token;
}
async function getSettings() {
  const { rows } = await pool.query('SELECT key,value FROM settings');
  return Object.fromEntries(rows.map(x => [x.key, x.value]));
}
async function audit(action, details = {}) {
  await pool.query('INSERT INTO audit_log(action,details,created_at) VALUES($1,$2,NOW())', [action, JSON.stringify(details)]);
}
async function listProducts(includeInactive = false) {
  const { rows } = await pool.query(`SELECT id,ar,en,category,price::float,old_price::float AS old,stock,rating::float,icon,image,active FROM products ${includeInactive ? '' : 'WHERE active=true'} ORDER BY id DESC`);
  return rows;
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, store: 'MAD', database: 'postgres', payment: MOYASAR_PUBLISHABLE_KEY && MOYASAR_SECRET_KEY ? 'configured' : 'awaiting_keys', time: now() });
  } catch { res.status(503).json({ ok: false }); }
});

app.get('/api/settings/public', async (_req, res) => {
  const x = await getSettings();
  res.json({
    store_name_ar: x.store_name_ar,
    store_name_en: x.store_name_en,
    currency: x.currency,
    support_email: x.support_email,
    support_phone: x.support_phone,
    shipping_fee: x.shipping_fee,
    free_shipping_threshold: x.free_shipping_threshold,
    maintenance_mode: x.maintenance_mode,
    payment_provider: 'moyasar',
    payment_ready: Boolean(MOYASAR_PUBLISHABLE_KEY && MOYASAR_SECRET_KEY),
    moyasar_publishable_key: MOYASAR_PUBLISHABLE_KEY || null
  });
});

app.get('/api/products', async (_req, res) => res.json(await listProducts(false)));

app.post('/api/auth/register', async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.password || b.password.length < 6) return res.status(400).json({ error: 'Invalid registration data' });
  try {
    const r = await pool.query(`INSERT INTO users(name,email,phone,password_hash,created_at) VALUES($1,$2,$3,$4,NOW()) RETURNING id`, [b.name.trim(), b.email.toLowerCase().trim(), b.phone || '', hash(b.password)]);
    const token = await createSession(r.rows[0].id);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.status(201).json({ ok: true, user: { id: r.rows[0].id, name: b.name, email: b.email } });
  } catch (e) {
    res.status(e.code === '23505' ? 409 : 400).json({ error: e.code === '23505' ? 'Email already exists' : 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const b = req.body || {};
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [(b.email || '').toLowerCase().trim()]);
  const u = rows[0];
  if (!u || !verify(b.password || '', u.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });
  const token = await createSession(u.id);
  res.setHeader('Set-Cookie', sessionCookie(token));
  res.json({ ok: true, user: { id: u.id, name: u.name, email: u.email, phone: u.phone } });
});

app.post('/api/auth/logout', async (req, res) => {
  const token = parseCookies(req).mad_session;
  if (token) await pool.query('DELETE FROM sessions WHERE token=$1', [token]);
  res.setHeader('Set-Cookie', 'mad_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', async (req, res) => {
  const u = await currentUser(req);
  return u ? res.json({ user: u }) : res.status(401).json({ error: 'Unauthorized' });
});
app.get('/api/me/orders', async (req, res) => {
  const u = await currentUser(req);
  if (!u) return res.status(401).json({ error: 'Unauthorized' });
  const { rows } = await pool.query('SELECT id,status,customer_json AS customer,items_json AS items,total::float,language,payment_method,payment_status,created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [u.id]);
  res.json(rows);
});

// Creates a pending electronic-payment order only. It is NOT accepted as a sale until /api/payments/verify succeeds.
app.post('/api/orders', async (req, res) => {
  const b = req.body || {};
  const u = await currentUser(req);
  if (!b.customer?.name || !b.customer?.phone || !b.customer?.city || !b.customer?.address || !Array.isArray(b.items) || !b.items.length) return res.status(400).json({ error: 'Missing order data' });
  if (!MOYASAR_PUBLISHABLE_KEY || !MOYASAR_SECRET_KEY) return res.status(503).json({ error: 'Electronic payment is not configured yet' });

  let total = 0;
  const items = [];
  for (const row of b.items) {
    const q = Math.max(1, Number(row.quantity) || 1);
    const p = (await pool.query('SELECT id,ar,en,price::float,stock FROM products WHERE id=$1 AND active=true', [Number(row.productId)])).rows[0];
    if (!p) return res.status(400).json({ error: 'Invalid product' });
    if (p.stock < q) return res.status(409).json({ error: `Insufficient stock for ${p.en}` });
    total += p.price * q;
    items.push({ productId: p.id, nameAr: p.ar, nameEn: p.en, price: p.price, quantity: q });
  }
  const id = `MAD-${Date.now().toString().slice(-8)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  await pool.query(`INSERT INTO orders(id,user_id,status,customer_json,items_json,total,language,payment_method,payment_status,created_at) VALUES($1,$2,'awaiting_payment',$3,$4,$5,$6,'moyasar','pending',NOW())`, [id, u?.id || null, JSON.stringify(b.customer), JSON.stringify(items), total, b.language || 'ar']);
  res.status(201).json({ ok: true, order: { id, total, status: 'awaiting_payment' }, payment: { provider: 'moyasar', publishableKey: MOYASAR_PUBLISHABLE_KEY } });
});

app.post('/api/payments/verify', async (req, res) => {
  const { paymentId, orderId } = req.body || {};
  if (!paymentId || !orderId) return res.status(400).json({ error: 'Missing payment verification data' });
  if (!MOYASAR_SECRET_KEY) return res.status(503).json({ error: 'Payment verification unavailable' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = (await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [orderId])).rows[0];
    if (!order) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Order not found' }); }
    if (order.payment_status === 'paid') { await client.query('COMMIT'); return res.json({ ok: true, order: { id: order.id, status: order.status, paymentStatus: 'paid' } }); }

    const auth = Buffer.from(`${MOYASAR_SECRET_KEY}:`).toString('base64');
    const paymentResponse = await fetch(`https://api.moyasar.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } });
    if (!paymentResponse.ok) { await client.query('ROLLBACK'); return res.status(502).json({ error: 'Could not verify payment' }); }
    const payment = await paymentResponse.json();
    const expectedAmount = Math.round(Number(order.total) * 100);
    const valid = payment.status === 'paid' && Number(payment.amount) === expectedAmount && payment.currency === 'SAR';
    if (!valid) {
      await client.query(`UPDATE orders SET payment_status='failed',status='payment_failed',payment_id=$2 WHERE id=$1`, [orderId, paymentId]);
      await client.query('COMMIT');
      return res.status(402).json({ error: 'Payment was not completed or did not match the order' });
    }

    const items = order.items_json;
    for (const item of items) {
      const result = await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2 AND stock >= $1 RETURNING id', [item.quantity, item.productId]);
      if (!result.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Stock changed before payment confirmation. Contact support with the payment ID.' });
      }
    }
    await client.query(`UPDATE orders SET payment_status='paid',status='new',payment_id=$2,paid_at=NOW() WHERE id=$1`, [orderId, paymentId]);
    await client.query('INSERT INTO audit_log(action,details,created_at) VALUES($1,$2,NOW())', ['payment.verified', JSON.stringify({ orderId, paymentId })]);
    await client.query('COMMIT');
    res.json({ ok: true, order: { id: orderId, status: 'new', paymentStatus: 'paid' } });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('payment verify error', e);
    res.status(500).json({ error: 'Payment verification failed' });
  } finally { client.release(); }
});

app.use('/api/admin', (req, res, next) => admin(req) ? next() : res.status(401).json({ error: 'Unauthorized' }));
app.get('/api/admin/settings', async (_req, res) => res.json(await getSettings()));
app.put('/api/admin/settings', async (req, res) => {
  const allowed = ['store_name_ar','store_name_en','currency','support_email','support_phone','shipping_fee','free_shipping_threshold','maintenance_mode'];
  const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
  for (const [k, v] of entries) await pool.query(`INSERT INTO settings(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`, [k, String(v)]);
  await audit('settings.updated', { keys: entries.map(([k]) => k) });
  res.json({ ok: true, settings: await getSettings() });
});
app.post('/api/admin/backup', async (_req, res) => res.status(501).json({ error: 'Use Neon point-in-time restore/backups for production database backups' }));
app.get('/api/admin/audit', async (_req, res) => res.json((await pool.query('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100')).rows));
app.get('/api/admin/products', async (_req, res) => res.json(await listProducts(true)));
app.get('/api/admin/orders', async (_req, res) => {
  const { rows } = await pool.query('SELECT id,user_id,status,customer_json AS customer,items_json AS items,total::float,language,payment_method,payment_status,payment_id,created_at,paid_at FROM orders ORDER BY created_at DESC');
  res.json(rows);
});
app.post('/api/admin/upload', async (req, res) => {
  const dataUrl = req.body?.dataUrl || '';
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 5_000_000) return res.status(400).json({ error: 'Invalid or oversized image' });
  res.status(201).json({ url: dataUrl });
});
app.post('/api/admin/products', async (req, res) => {
  const b = req.body || {};
  const r = await pool.query(`INSERT INTO products(ar,en,category,price,old_price,stock,rating,icon,image,active,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING id`, [b.ar,b.en,b.category,Number(b.price),b.old?Number(b.old):null,Number(b.stock||0),Number(b.rating||5),b.icon||'📦',b.image||'',b.active===false?false:true]);
  res.status(201).json({ id: r.rows[0].id });
});
app.put('/api/admin/products/:id', async (req, res) => {
  const b = req.body || {};
  await pool.query(`UPDATE products SET ar=$1,en=$2,category=$3,price=$4,old_price=$5,stock=$6,rating=$7,icon=$8,image=$9,active=$10 WHERE id=$11`, [b.ar,b.en,b.category,Number(b.price),b.old?Number(b.old):null,Number(b.stock||0),Number(b.rating||5),b.icon||'📦',b.image||'',b.active===false?false:true,Number(req.params.id)]);
  res.json({ ok: true });
});
app.delete('/api/admin/products/:id', async (req, res) => {
  await pool.query('UPDATE products SET active=false WHERE id=$1', [Number(req.params.id)]);
  res.json({ ok: true });
});
app.put('/api/admin/orders/:id', async (req, res) => {
  const allowed = ['new','processing','shipped','completed','cancelled','payment_failed','awaiting_payment'];
  if (!allowed.includes(req.body?.status)) return res.status(400).json({ error: 'Invalid status' });
  await pool.query('UPDATE orders SET status=$1 WHERE id=$2', [req.body.status, req.params.id]);
  res.json({ ok: true });
});

app.get('/payment-callback', (_req, res) => res.sendFile(path.join(ROOT, 'payment-callback.html')));
app.use(express.static(ROOT, { extensions: ['html'], maxAge: IS_PROD ? '1h' : 0, setHeaders: res => { res.setHeader('Cache-Control', 'no-cache'); } }));
app.use((_req, res) => res.status(404).send('Not found'));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

async function start() {
  await pool.query('SELECT 1');
  if (require.main === module) app.listen(PORT, '0.0.0.0', () => console.log(`MAD Store: http://localhost:${PORT}`));
}
start().catch(e => { console.error(e); process.exit(1); });

module.exports = app;
