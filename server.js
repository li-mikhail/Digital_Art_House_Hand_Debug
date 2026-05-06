#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const allowedRotations = new Set([0, 90, 180, 270]);
let state = { rotation: 90, updatedAt: 0 };

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.riv': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function readOption(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const port = Number(readOption('port', process.env.PORT || 8085));
const host = readOption('host', process.env.HOST || '0.0.0.0');

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });

    req.on('error', reject);
  });
}

async function handleState(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET') {
    sendJson(res, 200, { ...state, _local: true });
    return;
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
      return;
    }

    const rotation = Number(body.rotation);
    if (!allowedRotations.has(rotation)) {
      sendJson(res, 400, { error: 'rotation must be 0, 90, 180 or 270' });
      return;
    }

    state = { rotation, updatedAt: Date.now() };
    sendJson(res, 200, { ...state, _local: true });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}

function resolveStaticPath(pathname) {
  let requested = pathname === '/' ? '/index.html' : pathname;

  try {
    requested = decodeURIComponent(requested);
  } catch {
    return null;
  }

  let filePath = normalize(join(rootDir, requested));
  if (relative(rootDir, filePath).startsWith('..')) return null;

  if (!existsSync(filePath) && !extname(filePath)) {
    const htmlPath = `${filePath}.html`;
    if (existsSync(htmlPath)) filePath = htmlPath;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
  return filePath;
}

function serveStatic(req, res, pathname) {
  const filePath = resolveStaticPath(pathname);

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const contentType = mimeTypes[extname(filePath)] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': contentType.startsWith('text/html') ? 'no-store' : 'public, max-age=3600',
  });
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/state') {
    await handleState(req, res);
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is busy. Try: npm start -- --port 8086`);
    process.exit(1);
  }

  throw err;
});

server.listen(port, host, () => {
  const displayHost = host === '0.0.0.0' || host === '::' ? 'localhost' : host;
  console.log(`Touch to Create is running`);
  console.log(`Display: http://${displayHost}:${port}/`);
  console.log(`Control: http://${displayHost}:${port}/control`);
  console.log(`Stop:    Ctrl+C`);
});
