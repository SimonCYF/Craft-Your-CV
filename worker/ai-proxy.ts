/* Runs beside the site on Cloudflare (Workers static assets) and keeps the Anthropic API key off the browser.
   Only /api/rewrite is handled here; every other request is served by the static site.
   Secret:  npx wrangler secret put ANTHROPIC_API_KEY   (or Settings > Variables and Secrets in the dashboard)
   Build the site with VITE_AI_ENDPOINT=/api/rewrite */

interface Env { ANTHROPIC_API_KEY: string; RATE_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> }; ASSETS: { fetch: (req: Request) => Promise<Response> } }

const MODEL = 'claude-haiku-5-5';
const MAX_LINES = 20;
const MAX_CHARS = 400;

const SYSTEM = `You rewrite weak resume bullet points into achievement-oriented statements.
Rules:
- Keep every fact the person gave. NEVER invent numbers, tools, employers, team sizes or outcomes.
- If a result or number is missing, put a short placeholder in square brackets, for example [number or %].
- Start with a strong past-tense action verb. Remove "responsible for", "helped with", "worked on" and filler.
- Vary the opening verbs across the lines. One line, under 28 words, no trailing full stop.
- Keep the language of the original line.
- If the line is already strong, return it unchanged.
Reply with ONLY a JSON array of strings, one rewrite per input line, in the same order.`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== '/api/rewrite') return env.ASSETS.fetch(req);
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

    if (req.method !== 'POST') return reply({ error: 'method' }, 405);
    const origin = req.headers.get('origin');
    if (origin && origin !== url.origin) return reply({ error: 'origin' }, 403);   // same-site calls only
    if (!env.ANTHROPIC_API_KEY) return reply({ error: 'not configured' }, 503);
    if (env.RATE_LIMITER) {   // per-visitor limit, so one person cannot run up the bill
      const { success } = await env.RATE_LIMITER.limit({ key: req.headers.get('cf-connecting-ip') ?? 'unknown' });
      if (!success) return reply({ error: 'rate limited' }, 429);
    }

    let input: { lines?: { text?: unknown; role?: unknown; issues?: unknown }[]; target?: unknown };
    try { input = await req.json(); } catch { return reply({ error: 'json' }, 400); }
    const lines = (input.lines ?? []).slice(0, MAX_LINES).map((l) => ({
      text: String(l.text ?? '').slice(0, MAX_CHARS),
      role: String(l.role ?? '').slice(0, 80),
      issues: Array.isArray(l.issues) ? l.issues.slice(0, 6).map((x) => String(x).slice(0, 40)) : [],
    })).filter((l) => l.text.trim());
    if (!lines.length) return reply({ error: 'empty' }, 400);
    const target = String(input.target ?? '').slice(0, 120);

    const prompt = `${target ? `Target role: ${target}\n` : ''}Lines to rewrite (JSON):\n${JSON.stringify(lines.map((l) => ({ role: l.role, line: l.text, problems: l.issues })))}`;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1800, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) return reply({ error: 'upstream' }, res.status === 429 ? 429 : 502);

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const raw = data.content?.find((c) => c.type === 'text')?.text ?? '';
    const json = raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
    try {
      const arr = JSON.parse(json) as unknown[];
      return reply({ rewrites: lines.map((_, i) => (typeof arr[i] === 'string' ? arr[i] : '')) });
    } catch { return reply({ error: 'parse' }, 502); }
  },
};
