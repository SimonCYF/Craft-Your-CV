import type { Colors, Fact, LinkItem, ListItem, Point, Resume, Section, SectionType, TagGroup, TemplateId, TimelineItem } from './types';

/* Turns anything we might be handed (an uploaded file, an old save, a preset) into a valid Resume.
   Unknown fields are dropped and missing ones filled in, so the rest of the app never has to check. */

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
const HEX = /^#[0-9a-f]{6}$/i;

export const newId = (): string => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));

export const DEFAULT_COLORS: Colors = { main: '#262626', accent: '#f2d11a', soft: '#f5f5dc' };
export const TEMPLATE_IDS: TemplateId[] = ['bold', 'classic', 'sidebar'];

function colors(v: unknown): Colors {
  const c = obj(v);
  return {
    main: HEX.test(c.main) ? c.main : DEFAULT_COLORS.main,
    accent: HEX.test(c.accent) ? c.accent : DEFAULT_COLORS.accent,
    soft: HEX.test(c.soft) ? c.soft : DEFAULT_COLORS.soft,
  };
}

/** Photos may only be embedded images or ordinary web/relative addresses, never scripts. */
function photo(v: unknown): string {
  const s = str(v).trim();
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return '';
}

const links = (v: unknown): LinkItem[] => arr(v).map((l) => ({ label: str(obj(l).label), url: str(obj(l).url) }));
const facts = (v: unknown): Fact[] => arr(v).map((f) => ({ label: str(obj(f).label), value: str(obj(f).value) }));
const points = (v: unknown): Point[] => arr(v).map((p) => ({ title: str(obj(p).title), desc: str(obj(p).desc), stack: str(obj(p).stack) }));
const timeline = (v: unknown): TimelineItem[] =>
  arr(v).map((t) => ({ title: str(obj(t).title), org: str(obj(t).org), when: str(obj(t).when), where: str(obj(t).where), body: str(obj(t).body), points: points(obj(t).points) }));
const groups = (v: unknown): TagGroup[] => arr(v).map((g) => ({ name: str(obj(g).name), items: arr(obj(g).items).map(str).filter(Boolean) }));
const list = (v: unknown): ListItem[] => arr(v).map((i) => ({ name: str(obj(i).name), url: str(obj(i).url), meta: str(obj(i).meta), desc: str(obj(i).desc) }));

function section(v: unknown): Section | null {
  const s = obj(v);
  const base = { id: str(s.id) || newId(), title: str(s.title), note: str(s.note) };
  switch (s.type as SectionType) {
    case 'text': return { ...base, type: 'text', lead: str(s.lead), body: str(s.body), facts: facts(s.facts) };
    case 'timeline': return { ...base, type: 'timeline', items: timeline(s.items) };
    case 'tags': return { ...base, type: 'tags', groups: groups(s.groups) };
    case 'links': return { ...base, type: 'links', items: list(s.items) };
    default: return null;
  }
}

/** Files made by the first single-file editor (fixed sections, no version number). */
function fromV1(d: Record<string, any>): Resume {
  const old: Record<string, Colors> = {
    mint: { main: '#16302b', accent: '#7fe0b0', soft: '#e9f3ec' },
    sky: { main: '#14213d', accent: '#8ecbff', soft: '#e9f0f6' },
    coral: { main: '#3b1f2b', accent: '#ff9f80', soft: '#f7ece6' },
  };
  const sections: Section[] = [];
  if (d.aboutLead || d.aboutBody || arr(d.facts).length) {
    sections.push({ id: newId(), type: 'text', title: 'About', note: '', lead: str(d.aboutLead), body: str(d.aboutBody), facts: facts(d.facts) });
  }
  if (arr(d.jobs).length) {
    sections.push({ id: newId(), type: 'timeline', title: 'Experience', note: str(d.experienceNote),
      items: arr(d.jobs).map((j) => ({ title: str(j.title), org: str(j.org), when: str(j.when), where: str(j.where), body: '', points: points(j.projects) })) });
  }
  if (arr(d.skills).length) {
    sections.push({ id: newId(), type: 'tags', title: 'Skills', note: str(d.skillsNote),
      groups: arr(d.skills).map((g) => ({ name: str(g.group), items: arr(g.items).map(str).filter(Boolean) })) });
  }
  if (arr(d.projects).length) {
    sections.push({ id: newId(), type: 'links', title: 'Projects', note: str(d.projectsNote),
      items: arr(d.projects).map((p) => ({ name: str(p.title), url: str(p.url), meta: str(p.stack), desc: str(p.desc) })) });
  }
  if (arr(d.education).length) {
    sections.push({ id: newId(), type: 'timeline', title: 'Education', note: '',
      items: arr(d.education).map((e) => ({ title: str(e.degree), org: str(e.school), when: str(e.when), where: '', body: str(e.note), points: [] })) });
  }
  if (arr(d.certs).length) {
    sections.push({ id: newId(), type: 'links', title: 'Certifications', note: '',
      items: arr(d.certs).map((c) => ({ name: str(c.name), url: str(c.url), meta: str(c.meta), desc: '' })) });
  }
  return {
    version: 2,
    profile: {
      fullName: str(d.fullName), title: str(d.shortTitle), headline: str(d.role), summary: str(d.tagline), location: str(d.location),
      email: str(d.email), phone: '', photo: photo(d.photo), links: links(d.links), footerNote: str(d.footerNote),
    },
    style: { template: 'bold', colors: colors(d.colors ?? old[str(d.theme)]) },
    sections,
  };
}

export class NotAResumeError extends Error {}

export function normalize(raw: unknown): Resume {
  const d = obj(raw);
  if (d.version === 2 && d.profile) {
    const p = obj(d.profile);
    const st = obj(d.style);
    return {
      version: 2,
      profile: {
        fullName: str(p.fullName), title: str(p.title), headline: str(p.headline), summary: str(p.summary), location: str(p.location),
        email: str(p.email), phone: str(p.phone), photo: photo(p.photo), links: links(p.links), footerNote: str(p.footerNote),
      },
      style: { template: TEMPLATE_IDS.includes(st.template) ? st.template : 'bold', colors: colors(st.colors) },
      sections: arr(d.sections).map(section).filter((s): s is Section => s !== null),
    };
  }
  if ('fullName' in d && ('jobs' in d || 'skills' in d || 'certs' in d)) return fromV1(d);
  throw new NotAResumeError('No resume content found');
}

/** Reads a file the person picked: an HTML page this app (or the earlier editor) exported, or a .json backup. */
export async function readResumeFile(file: File): Promise<Resume> {
  const text = await file.text();
  let json = text;
  if (!/^\s*\{/.test(text)) {
    /* Only the data block is read. The uploaded page itself is never run or inserted anywhere. */
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const block = doc.querySelector('script#resume-data');
    if (!block?.textContent) throw new NotAResumeError('No data block');
    json = block.textContent;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new NotAResumeError('Data block is not readable'); }
  return normalize(parsed);
}

export function blankSection(type: SectionType, title: string): Section {
  const base = { id: newId(), title, note: '' };
  if (type === 'text') return { ...base, type, lead: '', body: '', facts: [] };
  if (type === 'timeline') return { ...base, type, items: [{ title: '', org: '', when: '', where: '', body: '', points: [] }] };
  if (type === 'tags') return { ...base, type, groups: [{ name: '', items: [] }] };
  return { ...base, type: 'links', items: [{ name: '', url: '', meta: '', desc: '' }] };
}
