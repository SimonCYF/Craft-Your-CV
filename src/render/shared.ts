import type { Colors, Resume } from '@/model/types';
import runtime from './runtime.js?raw';

/* Helpers every template uses. Templates are plain functions from a Resume to one HTML string,
   so the live preview and the downloaded file are always the same thing. */

export interface RenderOptions { preview?: boolean; /** leave the script out (thumbnails) */ still?: boolean }

export const esc = (s: string): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Only ordinary web, mail and phone addresses are allowed in links. Anything else becomes no link. */
export function safeUrl(u: string): string {
  const s = (u || '').trim();
  if (!s) return '';
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '';
  return 'https://' + s;
}

export const ext = (url: string): string => `href="${esc(url)}" target="_blank" rel="noopener"`;
export const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
export const has = (s: string): boolean => !!s && s.trim() !== '';
export const paras = (s: string, cls = ''): string =>
  s.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p${cls ? ` class="${cls}"` : ''}>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

/* ---------- Colour maths: everything follows from the three picked colours ---------- */
const INK = '#262626';
const WHITE = '#ffffff';
function rgb(hex: string): number[] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  const n = parseInt(m ? m[1] : '262626', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (c: number[]) => '#' + c.map((v) => ('0' + Math.round(v).toString(16)).slice(-2)).join('');
export const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
function lum(h: string): number {
  const c = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string): number { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
/** The text colour (dark or white) that reads best on a background. */
export const readable = (bg: string) => (contrast(bg, WHITE) >= contrast(bg, INK) ? WHITE : INK);

export function colourVars(c: Colors): string {
  const on = readable(c.main);
  const heading = contrast(c.main, WHITE) >= 4.5 ? c.main : INK;   /* the main colour when it is dark enough to be text on white */
  const vars: Record<string, string> = {
    '--block': c.main,
    '--on-block': on,
    '--block-hover': mix(c.main, on, 0.12),
    '--on-deep-muted': mix(on, c.main, 0.2),
    '--accent': c.accent,
    '--accent-hover': mix(c.accent, readable(c.accent) === WHITE ? INK : WHITE, 0.2),
    '--on-accent': readable(c.accent),
    '--sand': c.soft,
    '--on-sand': readable(c.soft),
    '--heading': heading,
  };
  return Object.entries(vars).map(([k, v]) => `${k}: ${v}`).join('; ');
}

function favicon(resume: Resume): string {
  const initials = resume.profile.fullName.split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase().replace(/[<&'"]/g, '');
  const { main, accent } = resume.style.colors;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='4' fill='${main}'/><text x='16' y='22' font-size='16' font-family='sans-serif' font-weight='700' text-anchor='middle' fill='${accent}'>${initials}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** Wraps a template's body in a complete page. The resume's data rides along so the file can be uploaded and edited again. */
export function page(resume: Resume, o: RenderOptions, parts: { fonts: string; css: string; body: string; bodyClass?: string }): string {
  const p = resume.profile;
  const title = [p.fullName || 'Resume', p.title].filter(Boolean).join(' – ');
  const data = JSON.stringify(resume, null, 1).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en" style="${colourVars(resume.style.colors)}"${o.preview ? ' class="is-preview"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(p.summary || title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(p.summary || title)}">
<meta name="theme-color" content="${resume.style.colors.main}">
<link rel="icon" href="${favicon(resume)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${parts.fonts}" rel="stylesheet">
<style>
${parts.css}
</style>
</head>
<body${parts.bodyClass ? ` class="${parts.bodyClass}"` : ''}>
${parts.body}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<!-- The resume's content. Upload this file to the resume builder to edit it again. -->
<script type="application/json" id="resume-data">
${data}
</script>
${o.still ? '' : `<script>\n${runtime}\n</script>`}
</body>
</html>
`;
}
