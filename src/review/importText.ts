import { newId, normalize } from '../model/normalize';
import type { LinkItem, ListItem, Resume, Section, TagGroup, TimelineItem } from '../model/types';

/* Best-effort reader for a resume that arrived as plain text (pasted, or pulled out of a PDF or Word file).
   It will not be perfect on unusual layouts, which is why the person can open the result in the editor and correct it. */

type Part = 'summary' | 'experience' | 'education' | 'skills' | 'languages' | 'projects' | 'certs' | 'awards' | 'references' | 'other';

const HEADINGS: [RegExp, Part, string][] = [
  [/^(?:professional |career |personal )?(?:summary|profile|objective|statement)$|^about(?: me)?$|^career objective$/, 'summary', 'About'],
  [/^(?:work |professional |relevant )?experience$|^(?:employment|work|career) history$|^employment$|^work$|^professional background$/, 'experience', 'Experience'],
  [/^education(?: (?:and|&) (?:training|qualifications?))?$|^academic (?:background|qualifications?)$|^qualifications?$/, 'education', 'Education'],
  [/^(?:technical |core |key |professional )?skills(?: (?:and|&) .+)?$|^core competenc(?:ies|y)$|^technologies$|^tools(?: (?:and|&) technologies)?$|^expertise$/, 'skills', 'Skills'],
  [/^languages?$/, 'languages', 'Languages'],
  [/^(?:personal |key |selected )?projects?$/, 'projects', 'Projects'],
  [/^certifications?(?: (?:and|&) licen[cs]es)?$|^licen[cs]es$|^courses$|^training$/, 'certs', 'Certifications'],
  [/^(?:awards?|achievements?|honou?rs|accomplishments)(?: (?:and|&) .+)?$/, 'awards', 'Achievements'],
  [/^references?$|^referees$/, 'references', 'References'],
  [/^(?:volunteer(?:ing)?|volunteer experience|activities|co-?curricular(?: activities)?|extra-?curricular(?: activities)?|interests|hobbies|publications|leadership)$/, 'other', ''],
];

const MON = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s*,?\\s*\\d{4}';
const ONE = `(?:${MON}|\\d{1,2}[/.]\\d{4}|\\d{4}[-/]\\d{1,2}|(?:19|20)\\d{2})`;
const RANGE = new RegExp(`(${ONE})\\s*(?:[-–—]|\\bto\\b|\\buntil\\b)\\s*(present|current|now|ongoing|${ONE})`, 'i');
const BULLET = /^\s*[•\-*▪●◦–·➢►>✓]\s+/;
const DEGREE = /\b(bachelor|master|ph\.?d|diploma|b\.?sc|m\.?sc|b\.?eng|mba|b\.?a\b|certificate|degree|spm|stpm|a-?levels?|foundation)\b/i;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const wc = (s: string) => s.split(/\s+/).filter(Boolean).length;

function headingOf(line: string): { part: Part; title: string } | null {
  const raw = line.trim().replace(/[:：]+$/, '');
  if (!raw || raw.length > 40 || /[.,;]$/.test(raw) || BULLET.test(line)) return null;
  const key = raw.toLowerCase().replace(/\s+/g, ' ');
  for (const [re, part, title] of HEADINGS) if (re.test(key)) return { part, title: title || raw.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/(\w)(\w*)/g, (_, a, b) => a + b.toLowerCase()) };
  return null;
}

function timeline(lines: string[]): TimelineItem[] {
  const items: (TimelineItem & { loose: string[] })[] = [];
  let cur: (TimelineItem & { loose: string[] }) | null = null;
  let pending: string[] = [];          // short lines seen before any date: probably a title or employer
  const fresh = () => ({ title: '', org: '', when: '', where: '', body: '', logo: '', bullets: [] as string[], points: [], loose: [] as string[] });
  const isShort = (l: string) => wc(l) <= 9 && !/[.!?]$/.test(l.trim()) && !BULLET.test(l);

  for (const line of lines) {
    if (!line.trim()) continue;
    const m = BULLET.test(line) ? null : line.match(RANGE);
    if (m) {
      const prev = cur;
      cur = fresh();
      const rest = clean(m ? line.replace(m[0], ' ').replace(/^[\s|,·–—()-]+|[\s|,·–—()-]+$/g, '') : line);
      cur.when = m ? clean(m[0]) : '';
      let head = rest ? [rest] : [];
      if (!rest) {
        const back: string[] = [];
        if (prev) { while (back.length < 2 && prev.loose.length && isShort(prev.loose[prev.loose.length - 1])) { back.unshift(prev.loose.pop()!); prev.bullets.pop(); } }
        if (!back.length) while (back.length < 2 && pending.length) back.unshift(pending.pop()!);
        head = back;
      }
      const parts = head.flatMap((h) => h.split(/\s*[|•·]\s*|\s+[–—]\s+|\s+-\s+|\s+@\s+|\s+at\s+/i)).map(clean).filter(Boolean);
      cur.title = parts[0] ?? '';
      cur.org = parts[1] ?? '';
      cur.where = parts[2] ?? '';
      if (!cur.org && /,/.test(cur.title)) { const [a, ...b] = cur.title.split(/,\s*/); if (wc(a) <= 5 && b.length === 1 && wc(b[0]) <= 6) { cur.title = a; cur.org = b[0]; } }
      if (prev) { prev.body = prev.loose.join(' '); items.push(prev); }
      pending = [];
      continue;
    }
    if (!cur) { pending.push(clean(line)); if (pending.length > 3) pending.shift(); continue; }
    if (BULLET.test(line)) { cur.bullets.push(clean(line.replace(BULLET, ''))); cur.loose = []; continue; }
    const text = clean(line);
    const last = cur.bullets[cur.bullets.length - 1];
    if (last && /^[a-z(]/.test(text) && !/[.!?]$/.test(last)) cur.bullets[cur.bullets.length - 1] = `${last} ${text}`;   // wrapped line
    else if (!cur.bullets.length && !cur.org && isShort(text)) cur.org = text;
    else if (cur.bullets.length || wc(text) > 9) { cur.bullets.push(text); cur.loose.push(text); }
    else cur.loose.push(text);
  }
  if (cur) { cur.body = cur.loose.join(' '); items.push(cur); }
  else if (pending.length) { const [title = '', org = ''] = pending.slice(-2).reverse().length > 1 ? pending.slice(0, 2) : pending; items.push({ ...fresh(), title, org }); }
  return items.map(({ loose: _l, ...rest }) => ({ ...rest, body: rest.bullets.length ? '' : rest.body }));
}

function tags(lines: string[]): TagGroup[] {
  const groups: TagGroup[] = [];
  const loose: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(BULLET, '').trim();
    if (!line) continue;
    const m = line.match(/^([^:]{2,30}):\s*(.+)$/);
    const split = (s: string) => s.split(/\s*[,;•|·]\s*|\s{3,}/).map(clean).filter(Boolean);
    if (m) groups.push({ name: clean(m[1]), items: split(m[2]) }); else loose.push(...split(line));
  }
  if (loose.length) groups.push({ name: '', items: loose });
  return groups;
}

function list(lines: string[]): ListItem[] {
  const items: ListItem[] = [];
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const text = clean(raw.replace(BULLET, ''));
    const url = text.match(/https?:\/\/\S+/)?.[0] ?? '';
    const body = clean(text.replace(url, ''));
    if (BULLET.test(raw) || !items.length || wc(body) <= 10) {
      const [name, ...rest] = body.split(/\s+[–—-]\s+|:\s+/);
      items.push({ name: name.slice(0, 120), url, meta: '', desc: rest.join(' – ') });
    } else items[items.length - 1].desc = clean(`${items[items.length - 1].desc} ${body}`);
  }
  return items;
}

export function parseResumeText(text: string): Resume {
  const all = text.replace(/\r\n?/g, '\n').replace(/ /g, ' ').split('\n').map((l) => l.replace(/\s+$/, ''));
  const firstHead = all.findIndex((l) => headingOf(l));
  const headLines = (firstHead < 0 ? all.slice(0, 8) : all.slice(0, firstHead)).map((l) => l.trim()).filter(Boolean);

  const joined = headLines.join('\n');
  const email = joined.match(/[^\s@|,;]+@[^\s@|,;]+\.[^\s@|,;]{2,}/)?.[0] ?? text.match(/[^\s@|,;]+@[^\s@|,;]+\.[^\s@|,;]{2,}/)?.[0] ?? '';
  const phone = (joined.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g) ?? []).map(clean).find((p) => { const d = p.replace(/\D/g, ''); return d.length >= 8 && d.length <= 15 && !/^(19|20)\d{2}\D*(19|20)\d{2}$/.test(p); }) ?? '';
  const links: LinkItem[] = [];
  for (const u of text.match(/(?:https?:\/\/|www\.)\S+|(?:linkedin\.com|github\.com)\/\S+/gi) ?? []) {
    const url = u.replace(/[),.;]+$/, '');
    const full = /^https?:/i.test(url) ? url : 'https://' + url;
    if (links.some((l) => l.url === full)) continue;
    links.push({ label: /linkedin/i.test(url) ? 'LinkedIn' : /github/i.test(url) ? 'GitHub' : 'Website', url: full });
  }
  const isContact = (l: string) => /@|https?:|www\.|linkedin|github|^\+?[\d\s().-]{8,}$/i.test(l) || l === phone;
  const plain = headLines.filter((l) => !isContact(l) && !RANGE.test(l));
  const fullName = plain.find((l) => wc(l) <= 5 && !/\d/.test(l)) ?? '';
  const rest = plain.filter((l) => l !== fullName);
  const location = rest.find((l) => /,/.test(l) && wc(l) <= 6 && !/\d/.test(l)) ?? '';
  const title = rest.find((l) => l !== location && wc(l) <= 10 && !/[.]$/.test(l)) ?? '';

  /* Split the rest into sections by heading */
  const buckets: { part: Part; title: string; lines: string[] }[] = [];
  if (firstHead < 0) buckets.push({ part: 'other', title: 'Resume text', lines: all.slice(headLines.length ? 8 : 0) });
  for (const l of firstHead < 0 ? [] : all.slice(firstHead)) {
    const h = headingOf(l);
    if (h) buckets.push({ ...h, lines: [] }); else if (buckets.length) buckets[buckets.length - 1].lines.push(l);
  }

  const sections: Section[] = [];
  const extra = rest.filter((l) => l !== location && l !== title && !isContact(l));
  if (extra.length) {
    const facts = extra.map((l) => { const m = l.match(/^([^:]{2,30}):\s*(.+)$/); return m ? { label: clean(m[1]), value: clean(m[2]) } : { label: '', value: clean(l) }; });
    sections.push({ id: newId(), type: 'text', title: 'Personal details', note: '', lead: '', body: '', facts });
  }
  for (const b of buckets) {
    const id = newId(), note = '';
    const body = b.lines.filter((l) => l.trim());
    if (!body.length) continue;
    if (b.part === 'summary' || b.part === 'references' || (b.part === 'other' && b.title === 'Resume text')) sections.push({ id, type: 'text', title: b.title, note, lead: '', body: body.map((l) => clean(l.replace(BULLET, ''))).join(b.part === 'summary' ? ' ' : '\n'), facts: [] });
    else if (b.part === 'experience' || b.part === 'education' || b.part === 'other') sections.push({ id, type: 'timeline', title: b.title, note, items: timeline(b.lines) });
    else if (b.part === 'skills' || b.part === 'languages') sections.push({ id, type: 'tags', title: b.title, note, groups: tags(body) });
    else sections.push({ id, type: 'links', title: b.title, note, items: list(body) });
  }

  return normalize({
    version: 2,
    profile: { fullName, title, headline: title, summary: '', location, email, phone, photo: '', links, footerNote: '', qrUrl: '', qrLabel: '' },
    style: { template: 'classic', colors: undefined, scale: 'normal', lang: 'en' },
    sections,
  });
}
