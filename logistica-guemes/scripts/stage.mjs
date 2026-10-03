#!/usr/bin/env node
// Arma la carpeta que se publica en Netlify: solo la app y el servidor del seguimiento, nada más.
// Uso: node scripts/stage.mjs <carpeta-de-salida>
// Un despliegue de Netlify es una foto completa del sitio: lo que no esté en esta carpeta no queda publicado.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || '');
if (!process.argv[2]) { console.error('Falta la carpeta de salida: node scripts/stage.mjs <carpeta>'); process.exit(2); }
if (out === ROOT || ROOT.startsWith(out + '/') || out === '/') { console.error('La carpeta de salida no puede ser el proyecto ni uno de sus padres.'); process.exit(2); }

const SITE = ['index.html', 'sw.js', 'icon.svg', 'manifest.webmanifest', '_headers', 'css', 'js'];
const ROOT_FILES = ['package.json', 'package-lock.json', '.nvmrc'];
const SERVER = [['netlify/functions', 'netlify/functions'], ['netlify/lib', 'netlify/lib']];

const TOML = `# Generado por scripts/stage.mjs: solo la carpeta site/ es pública; netlify/ y package.json no se publican.
[build]
  publish = "site"

[build.environment]
  NODE_VERSION = "22"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
`;

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'site'), { recursive: true });
for (const f of SITE) {
  if (!existsSync(join(ROOT, f))) { console.error(`Falta ${f}`); process.exit(1); }
  cpSync(join(ROOT, f), join(out, 'site', f), { recursive: true });
}
for (const [from, to] of SERVER) cpSync(join(ROOT, from), join(out, to), { recursive: true });
for (const f of ROOT_FILES) cpSync(join(ROOT, f), join(out, f));
writeFileSync(join(out, 'netlify.toml'), TOML);

// Comprobaciones: nada de pruebas, documentación ni dependencias instaladas en lo que se publica
const walk = dir => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const all = walk(out).map(p => relative(out, p));
const bad = all.filter(p => /(^|\/)(tests?|node_modules|\.git|\.netlify|scripts)(\/|$)|README|\.env|\.test\./i.test(p));
if (bad.length) { console.error('Archivos que no deberían publicarse:\n' + bad.join('\n')); process.exit(1); }
const pub = all.filter(p => p.startsWith('site/'));
if (!pub.includes('site/index.html') || !pub.includes('site/_headers')) { console.error('Falta index.html o _headers en site/'); process.exit(1); }
const fns = all.filter(p => p.startsWith('netlify/functions/'));
console.log(`Listo en ${out}\n  site/ (público): ${pub.length} archivos\n  funciones: ${fns.map(f => f.split('/').pop()).join(', ')}\n  package.json: @netlify/blobs ${JSON.parse(readFileSync(join(out, 'package.json'), 'utf8')).dependencies['@netlify/blobs']}`);
