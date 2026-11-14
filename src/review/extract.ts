import type { Resume } from '../model/types';
import { NotAResumeError, readResumeFile } from '../model/normalize';
import { headingOf, parseResumeText } from './importText';
import { aiParse, type AiResume } from './ai';
import { newId, normalize } from '../model/normalize';
import type { LinkItem, Section } from '../model/types';

/* Turns whatever the person uploads into a Resume the reviewers can read. PDF and Word files are opened in the browser;
   when the AI reader is configured their text is then sent to it to be sorted into sections, and if it is not (or fails)
   the local rule-based reader is used instead. */

export interface Loaded { resume: Resume; /** 'exact' = a file made by this app; 'parsed' = read from text, best effort */ how: 'exact' | 'parsed'; chars: number; /** true when the AI reader sorted the text into sections */ ai?: boolean }
export class UnreadableError extends Error {}

const ext = (f: File) => f.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';

interface PdfItem { x: number; x1: number; y: number; s: string }

/** Finds the vertical white gutters that separate side-by-side columns on a page. Returns their x positions, left to right. */
function gutters(items: PdfItem[]): number[] {
  if (items.length < 12) return [];
  const min = Math.min(...items.map((i) => i.x)), max = Math.max(...items.map((i) => i.x1));
  const W = Math.ceil(max - min);
  if (W < 200) return [];
  const cover = new Int16Array(W + 2);
  for (const it of items) for (let k = Math.max(0, Math.floor(it.x - min)); k <= Math.min(W, Math.ceil(it.x1 - min)); k++) cover[k]++;
  const stray = Math.floor(items.length * 0.05);   // a full-width heading or two may cross the gutter without hiding it
  let found: number[] = [];
  for (let k = Math.floor(W * 0.1); k < W * 0.9; k++) {
    if (cover[k] > stray) continue;
    let end = k;
    while (end < W && cover[end + 1] <= stray) end++;
    if (end - k + 1 >= 12) found.push(min + (k + end) / 2);
    k = end;
  }
  /* A sliver of stray text is not a column: drop the gutter beside any column with fewer than 5 items, until none is left */
  for (;;) {
    const sizes = new Array<number>(found.length + 1).fill(0);
    for (const it of items) sizes[found.filter((g) => g < (it.x + it.x1) / 2).length]++;
    const small = sizes.findIndex((n) => n < 5);
    if (small < 0 || !found.length) return found;
    found = found.filter((_, i) => i !== (small === 0 ? 0 : small - 1));
  }
}

/** Reads each column top to bottom before moving to the next, so a two-column resume does not come out as one tangled line.
    A sidebar often holds contact details above its first heading while the name sits in the main column, so the text above
    each column's first heading is gathered up front (as the top of the page), then the headed sections follow, main column first. */
function pageLines(items: PdfItem[]): string[] {
  const cuts = gutters(items);
  const cols: PdfItem[][] = Array.from({ length: cuts.length + 1 }, () => []);
  for (const it of items) cols[cuts.filter((g) => g < (it.x + it.x1) / 2).length].push(it);
  const lines = (col: PdfItem[]): string[] => {
    const out: string[] = [];
    let line: PdfItem[] = [];
    const flush = () => { if (line.length) out.push(line.sort((a, b) => a.x - b.x).map((r) => r.s).join(' ').replace(/\s+/g, ' ').trim()); line = []; };
    for (const r of [...col].sort((a, b) => b.y - a.y || a.x - b.x)) { if (line.length && Math.abs(line[0].y - r.y) > 3) flush(); line.push(r); }
    flush();
    return out;
  };
  const ordered = cols.filter((c) => c.length).sort((a, b) => Math.max(...b.map((i) => i.y)) - Math.max(...a.map((i) => i.y)));
  const tops: string[] = [], rests: string[] = [];
  for (const col of ordered) {
    const l = lines(col);
    const at = l.findIndex((x) => headingOf(x));
    const cut = ordered.length === 1 ? 0 : at < 0 ? l.length : at;   // one column: leave it exactly as read
    tops.push(...l.slice(0, cut));
    rests.push(...l.slice(cut), '');
  }
  return [...tops, '', ...rests];
}

async function pdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    const items: PdfItem[] = [];
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue;
      items.push({ y: Math.round(it.transform[5]), x: it.transform[4], x1: it.transform[4] + (it.width || 0), s: it.str });
    }
    out.push(...pageLines(items));
  }
  return out.join('\n');
}

async function docxText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
}

function htmlText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript').forEach((n) => n.remove());
  doc.querySelectorAll('br').forEach((n) => n.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,h1,h2,h3,h4,tr,section,article,header').forEach((n) => n.append('\n'));
  doc.querySelectorAll('li').forEach((n) => n.prepend('• '));
  return doc.body.textContent ?? '';
}

export async function loadResumeFile(file: File): Promise<Loaded> {
  const kind = ext(file);
  if (kind === 'json' || kind === 'html' || kind === 'htm') {
    try { return { resume: await readResumeFile(file), how: 'exact', chars: file.size }; } catch (e) { if (!(e instanceof NotAResumeError) || kind === 'json') throw e; }
  }
  let text: string;
  try {
    if (kind === 'pdf') text = await pdfText(file);
    else if (kind === 'docx') text = await docxText(file);
    else if (kind === 'html' || kind === 'htm') text = htmlText(await file.text());
    else text = await file.text();
  } catch { throw new UnreadableError('read'); }
  if (text.replace(/\s/g, '').length < 40) throw new UnreadableError(kind === 'pdf' ? 'scanned' : 'empty');
  const viaAi = await readWithAi(text);
  return { resume: viaAi ?? parseResumeText(text), how: 'parsed', chars: text.length, ai: !!viaAi };
}

const s = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const a = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const o = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** Asks the AI to sort the text into sections. Anything it returns is rebuilt field by field, so a malformed answer cannot break the app. */
async function readWithAi(text: string): Promise<Resume | null> {
  const raw: AiResume | null = await aiParse(text);
  if (!raw) return null;
  const sections: Section[] = [];
  for (const sec of a(raw.sections).map(o)) {
    const id = newId(), title = s(sec.title), note = '';
    if (sec.kind === 'text') {
      const body = s(sec.body);
      if (body) sections.push({ id, type: 'text', title, note, lead: '', body, facts: [] });
    } else if (sec.kind === 'timeline') {
      const items = a(sec.items).map(o).map((it) => ({ title: s(it.title), org: s(it.org), when: s(it.when), where: s(it.where), body: '', logo: '', bullets: a(it.bullets).map(s).filter(Boolean), points: [] }));
      if (items.length) sections.push({ id, type: 'timeline', title, note, items });
    } else if (sec.kind === 'tags') {
      const groups = a(sec.groups).map(o).map((g) => ({ name: s(g.name), items: a(g.items).map(s).filter(Boolean) })).filter((g) => g.items.length);
      if (groups.length) sections.push({ id, type: 'tags', title, note, groups });
    } else if (sec.kind === 'list') {
      const items = a(sec.items).map(o).map((it) => ({ name: s(it.name), url: '', meta: '', desc: s(it.desc) })).filter((it) => it.name || it.desc);
      if (items.length) sections.push({ id, type: 'links', title, note, items });
    }
  }
  if (!sections.length) return null;
  const links: LinkItem[] = a(raw.links).map(o).map((l) => ({ label: s(l.label) || 'Website', url: s(l.url) })).filter((l) => /^https?:\/\//i.test(l.url));
  const title = s(raw.title);
  return normalize({
    version: 2,
    profile: { fullName: s(raw.fullName), title, headline: title, summary: s(raw.summary), location: s(raw.location), email: s(raw.email), phone: s(raw.phone), photo: '', links, footerNote: '', qrUrl: '', qrLabel: '' },
    style: { template: 'classic', colors: undefined, scale: 'normal', lang: 'en', pages: 0, fit: 1 },
    sections,
  });
}

export const loadResumeText = (text: string): Loaded => ({ resume: parseResumeText(text), how: 'parsed', chars: text.length });
