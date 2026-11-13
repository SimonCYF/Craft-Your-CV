import type { Resume } from '../model/types';
import { NotAResumeError, readResumeFile } from '../model/normalize';
import { parseResumeText } from './importText';

/* Turns whatever the person uploads into a Resume the reviewers can read. Nothing is sent anywhere:
   PDF and Word readers load on demand and run in the browser. */

export interface Loaded { resume: Resume; /** 'exact' = a file made by this app; 'parsed' = read from text, best effort */ how: 'exact' | 'parsed'; chars: number }
export class UnreadableError extends Error {}

const ext = (f: File) => f.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';

async function pdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    const rows: { y: number; x: number; s: string }[] = [];
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue;
      rows.push({ y: Math.round(it.transform[5]), x: it.transform[4], s: it.str });
    }
    rows.sort((a, b) => b.y - a.y || a.x - b.x);
    let line: typeof rows = [];
    const flush = () => { if (line.length) out.push(line.sort((a, b) => a.x - b.x).map((r) => r.s).join(' ').replace(/\s+/g, ' ').trim()); line = []; };
    for (const r of rows) { if (line.length && Math.abs(line[0].y - r.y) > 3) flush(); line.push(r); }
    flush();
    out.push('');
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
  return { resume: parseResumeText(text), how: 'parsed', chars: text.length };
}

export const loadResumeText = (text: string): Loaded => ({ resume: parseResumeText(text), how: 'parsed', chars: text.length });
