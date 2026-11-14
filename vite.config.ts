import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import worker from './worker/ai-proxy';

/* In development there is no Cloudflare Worker, so this runs the very same worker code inside the dev server.
   Put  ANTHROPIC_API_KEY=sk-ant-...  in a file named .env.local (it is git-ignored) to turn the AI features on locally. */
function aiDevProxy(key: string): Plugin {
  return {
    name: 'ai-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = Buffer.concat(chunks);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
        const request = new Request(`http://${req.headers.host}/api${req.url}`, { method: req.method, headers, body: body.length && req.method !== 'GET' ? body : undefined });
        const out = await worker.fetch(request, { ANTHROPIC_API_KEY: key, ASSETS: { fetch: async () => new Response('', { status: 404 }) } });
        res.statusCode = out.status;
        out.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await out.arrayBuffer()));
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), aiDevProxy(loadEnv(mode, import.meta.dirname, '').ANTHROPIC_API_KEY ?? '')],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
}));
