import type { Resume, Section, TimelineItem } from '../model/types';
import { parseRange, type DateRange } from './dates';

/* Boils a resume down to the pieces the reviewers need. Everything the review says is derived from here. */

export interface Entry { title: string; org: string; when: string; where: string; bullets: string[]; text: string; range: DateRange; section: string }
export interface Facts {
  resume: Resume;
  summary: string;
  experience: Entry[];
  education: Entry[];
  other: Entry[];
  skills: string[];
  skillsSectionText: string;
  languages: string[];
  bullets: { text: string; entry: Entry }[];
  allText: string;
  words: number;
}

export type SectionKind = 'summary' | 'experience' | 'education' | 'skills' | 'languages' | 'projects' | 'certs' | 'references' | 'other';
export const kind = (s: Section): SectionKind => {
  const t = s.title.toLowerCase();
  if (/reference|referee/.test(t)) return 'references';
  if (/education|academic|qualification|school|university/.test(t)) return 'education';
  if (/experience|employment|work|career|internship|professional/.test(t) && s.type === 'timeline') return 'experience';
  if (/language/.test(t)) return 'languages';
  if (/skill|competenc|tools|technolog|expertise|stack/.test(t)) return 'skills';
  if (/project/.test(t)) return 'projects';
  if (/certif|licen/.test(t)) return 'certs';
  if (/about|summary|profile|objective/.test(t) && s.type === 'text') return 'summary';
  return 'other';
};

const lines = (s: string) => s.split(/\r?\n/).map((l) => l.replace(/^\s*[-•*▪●–]\s*/, '').trim()).filter(Boolean);
const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’+#.-]*/gu;
export const wordCount = (s: string) => (s.match(WORD) ?? []).length;
export const firstWord = (s: string) => s.trim().match(/^[\p{L}][\p{L}'’-]*/u)?.[0] ?? '';

function toEntry(it: TimelineItem, section: string): Entry {
  const bullets = [...it.bullets, ...(it.body.includes('\n') ? lines(it.body) : []), ...it.points.flatMap((p) => [p.desc, ...p.bullets])].map((b) => b.trim()).filter(Boolean);
  if (it.body && !it.body.includes('\n')) bullets.push(it.body.trim());
  const text = [it.title, it.org, it.where, ...bullets, ...it.points.flatMap((p) => [p.title, p.stack])].join('\n');
  return { title: it.title, org: it.org, when: it.when, where: it.where, bullets, text, range: parseRange(it.when), section };
}

export function extractFacts(resume: Resume): Facts {
  const p = resume.profile;
  const summaryParts = [p.summary];
  const experience: Entry[] = [], education: Entry[] = [], other: Entry[] = [];
  const skills: string[] = [], languages: string[] = [];
  let skillsSectionText = '';
  const chunks: string[] = [p.fullName, p.title, p.headline, p.summary, p.location, ...p.links.map((l) => l.label)];

  for (const s of resume.sections) {
    const k = kind(s);
    chunks.push(s.title);
    if (s.type === 'text') {
      if (k === 'summary') summaryParts.push(s.lead, s.body);
      chunks.push(s.lead, s.body, ...s.facts.map((f) => `${f.label} ${f.value}`));
    } else if (s.type === 'timeline') {
      const entries = s.items.map((i) => toEntry(i, s.title));
      (k === 'experience' ? experience : k === 'education' ? education : other).push(...entries);
      chunks.push(...entries.map((e) => e.text));
    } else if (s.type === 'tags') {
      const items = s.groups.flatMap((g) => g.items);
      if (k === 'languages') languages.push(...items); else skills.push(...items);
      skillsSectionText += s.groups.map((g) => `${g.name} ${g.items.join(' ')}`).join('\n') + '\n';
      chunks.push(...s.groups.map((g) => `${g.name}: ${g.items.join(', ')}`));
    } else if (s.type === 'levels') {
      const names = s.items.map((i) => i.name).filter(Boolean);
      if (k === 'languages') languages.push(...names); else skills.push(...names);
      skillsSectionText += names.join(' ') + '\n';
      chunks.push(...names);
    } else if (s.type === 'links') {
      const entries = s.items.map((i) => toEntry({ title: i.name, org: '', when: i.meta, where: '', body: i.desc, logo: '', bullets: [], points: [] }, s.title));
      other.push(...entries);
      chunks.push(...s.items.map((i) => `${i.name} ${i.meta} ${i.desc}`));
    }
  }
  const allText = chunks.filter(Boolean).join('\n');
  return {
    resume, summary: summaryParts.filter(Boolean).join(' ').trim(), experience, education, other,
    skills: [...new Set(skills.map((s) => s.trim()).filter(Boolean))], skillsSectionText, languages,
    bullets: experience.flatMap((e) => e.bullets.map((text) => ({ text, entry: e }))), allText, words: wordCount(allText),
  };
}
