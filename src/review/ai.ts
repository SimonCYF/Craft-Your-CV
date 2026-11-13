/* Optional AI rewrites. The browser never holds an API key: it calls a small proxy (see worker/ai-proxy.ts) that holds the
   key and talks to Claude Haiku. If no proxy address is configured, the app silently stays on its local rule-based rewrites. */

const ENDPOINT = (import.meta.env.VITE_AI_ENDPOINT as string | undefined)?.trim() || '';
export const aiAvailable = ENDPOINT !== '';

export interface AiLine { text: string; role: string; issues: string[] }

/** Sends only the chosen lines (nothing else from the resume) and returns one rewrite per line, in the same order. */
export async function aiRewrite(lines: AiLine[], target: string, signal?: AbortSignal): Promise<string[]> {
  if (!aiAvailable) throw new Error('AI is not configured');
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lines: lines.slice(0, 20), target }), signal });
  if (!res.ok) throw new Error(res.status === 429 ? 'busy' : 'failed');
  const data = (await res.json()) as { rewrites?: unknown };
  const out: unknown[] = Array.isArray(data.rewrites) ? data.rewrites : [];
  if (!out.length) throw new Error('failed');
  return lines.map((_, i) => (typeof out[i] === 'string' ? (out[i] as string).trim() : ''));
}
