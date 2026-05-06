// Tiny remote-control state endpoint backed by the Vercel Marketplace Redis
// integration (TCP Redis, accessed via node-redis).
//
// GET  /api/state                → returns the current display state
// POST /api/state  { rotation }  → updates state (and bumps updatedAt)
//
// The integration auto-injects an env var with the connection URL. We try a
// handful of possible names so this works regardless of the prefix the user
// chose when installing the integration.

import { createClient } from 'redis';

const KEY = 'display-state';
const DEFAULT_STATE = { rotation: 90, updatedAt: 0 };
const ALLOWED_ROTATIONS = new Set([0, 90, 180, 270]);

function getRedisUrl() {
  return (
    process.env.VK_REDIS_URL ||  // Vercel Marketplace Redis integration
    process.env.KV_URL ||
    process.env.KV_REDIS_URL ||
    process.env.REDIS_URL ||
    process.env.STORAGE_URL ||
    process.env.STORAGE_REDIS_URL ||
    null
  );
}

// Reuse the client across warm invocations of the same serverless instance.
let cachedClient = null;
async function getClient() {
  const url = getRedisUrl();
  if (!url) return null;
  if (cachedClient && cachedClient.isOpen) return cachedClient;
  const client = createClient({ url });
  client.on('error', (err) => console.error('Redis error', err));
  await client.connect();
  cachedClient = client;
  return cachedClient;
}

export default async function handler(req, res) {
  // CORS — allow control panel hosted on the same origin (and dev usage)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = getRedisUrl();
  if (!url) {
    if (req.method === 'GET') return res.status(200).json(DEFAULT_STATE);
    return res.status(503).json({
      error: 'Redis is not configured (no connection URL env var found).',
    });
  }

  let client;
  try {
    client = await getClient();
  } catch (err) {
    if (req.method === 'GET') {
      return res.status(200).json({ ...DEFAULT_STATE, _redisError: String(err) });
    }
    return res.status(500).json({ error: 'Could not connect to Redis: ' + String(err) });
  }

  if (req.method === 'GET') {
    try {
      const raw = await client.get(KEY);
      const state = raw ? JSON.parse(raw) : DEFAULT_STATE;
      return res.status(200).json(state);
    } catch (err) {
      return res.status(200).json({ ...DEFAULT_STATE, _redisError: String(err) });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const rotation = Number(body.rotation);
    if (!ALLOWED_ROTATIONS.has(rotation)) {
      return res.status(400).json({ error: 'rotation must be 0, 90, 180 or 270' });
    }
    const next = { rotation, updatedAt: Date.now() };
    try {
      await client.set(KEY, JSON.stringify(next));
      return res.status(200).json(next);
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
