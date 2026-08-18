'use strict';

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';
let pool = null;
let readyPromise = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 8,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  }
  return pool;
}

async function initDatabase() {
  const db = getPool();
  if (!db) throw new Error('DATABASE_URL is required');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      ar TEXT NOT NULL,
      en TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
      old_price NUMERIC(12,2),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      rating NUMERIC(3,2) NOT NULL DEFAULT 5,
      icon TEXT NOT NULL DEFAULT '📦',
      image TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'awaiting_payment',
      customer_json JSONB NOT NULL,
      items_json JSONB NOT NULL,
      total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
      language TEXT NOT NULL DEFAULT 'ar',
      payment_method TEXT NOT NULL DEFAULT 'moyasar',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
    CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at DESC);
  `);

  const defaults = {
    store_name_ar: 'MAD',
    store_name_en: 'MAD',
    currency: 'SAR',
    support_email: '',
    support_phone: '',
    shipping_fee: '0',
    free_shipping_threshold: '0',
    maintenance_mode: 'false'
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.query(
      `INSERT INTO settings(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO NOTHING`,
      [key, value]
    );
  }
}

function ensureDatabase() {
  if (!readyPromise) {
    readyPromise = initDatabase().catch(err => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

module.exports = { getPool, ensureDatabase };
