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

/** What the AI reader hands back. Loose on purpose: parseWithAi in extract.ts checks and cleans every field. */
export interface AiResume { [key: string]: unknown }

/** Sends the text of an uploaded resume to be read into sections. Returns null if the AI cannot be used, so the caller falls back to the local reader. */
export async function aiParse(text: string, signal?: AbortSignal): Promise<AiResume | null> {
  if (!aiAvailable) return null;
  const url = ENDPOINT.replace(/\/[^/]*$/, '/parse');
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 24000) }), signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { resume?: unknown };
    return data.resume && typeof data.resume === 'object' ? (data.resume as AiResume) : null;
  } catch { return null; }
}
