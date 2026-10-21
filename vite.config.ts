import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import https from 'node:https';
import { normalizeServer } from './src/shared/server.ts';

// Nur Anfangswert des SPA-Eingabefelds, kein Proxy-Ziel.
const defaultServer = normalizeServer(process.env.SVWS_TARGET || 'https://127.0.0.1:8443');
function svwsProxy(): Plugin {
  return {
    name: 'svws-proxy',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/svws/')) return next();
        if (req.method !== 'GET') { res.writeHead(405).end(); return; }
        let base: string;
        try {
          const header = req.headers['x-svws-server'];
          if (typeof header !== 'string' || !header.trim()) {
            res.writeHead(400).end('SVWS-Serveradresse fehlt.'); return;
          }
          base = normalizeServer(header);
        } catch { res.writeHead(400).end('Ungültige SVWS-Serveradresse.'); return; }
        const path = req.url.slice('/svws'.length);
        const url = new URL(path, base);
        if (url.origin !== base) { res.writeHead(400).end(); return; }
        const upstream = https.get(url, {
          rejectUnauthorized: process.env.SVWS_VERIFY_TLS === 'true',
          headers: { Accept: 'application/json', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) }
        }, response => {
          res.writeHead(response.statusCode ?? 502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.on('error', () => res.destroy());
          response.pipe(res);
        });
        upstream.setTimeout(30000, () => upstream.destroy(new Error('Timeout')));
        upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('SVWS nicht erreichbar.'); });
        res.on('close', () => upstream.destroy());
      });
    }
  };
}
export default defineConfig({
  plugins: [svelte(), svwsProxy()],
  define: { __SVWS_TARGET__: JSON.stringify(defaultServer) },
  server: { host: '127.0.0.1' }
});
