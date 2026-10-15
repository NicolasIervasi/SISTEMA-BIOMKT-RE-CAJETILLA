#!/usr/bin/env node
// Servidor local para probar la app completa (con API) sin Netlify: sirve la carpeta y atiende /api/* con el mismo código
// que la función de Netlify, guardando en memoria. Al cortarlo con Ctrl+C se pierde todo lo guardado.
// Uso: node scripts/dev.mjs [puerto]        (ADMIN_CODE y ADMIN_SECRET se pueden pasar por entorno)
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { handleRequest } from '../netlify/lib/http.mjs';
import { memoryStore } from '../netlify/lib/stores.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8888);
const code = process.env.ADMIN_CODE || 'codigo-local-1234';
const secret = process.env.ADMIN_SECRET || randomBytes(32).toString('base64url');
const store = memoryStore();
const PUBLICO = ['index.html', 'sw.js', 'icon.svg', 'manifest.webmanifest', 'css/', 'js/'];
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const r = await handleRequest(new Request(url, {
        method: req.method,
        headers: req.headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Readable.toWeb(req),
        duplex: 'half'
      }), { code, secret, store });
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = resolve(ROOT, rel);
    if (!file.startsWith(ROOT + sep) || !PUBLICO.some(p => rel === p || (p.endsWith('/') && rel.startsWith(p)))) throw Object.assign(new Error(), { code: 'ENOENT' });
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TIPOS[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(e.code === 'ENOENT' ? 'No encontrado' : 'Error');
  }
}).listen(PORT, () => {
  console.log(`Red Empresas MDP en http://localhost:${PORT}\nCódigo del panel: ${code}\nLos datos viven en memoria: se borran al cortar el servidor.`);
});
