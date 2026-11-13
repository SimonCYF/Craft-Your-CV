import type { Resume, TimelineItem } from '../model/types';
import { extractFacts, firstWord, wordCount } from './facts';
import { CLICHES, HAS_METRIC, RESULT_WORDS, WEAK_PHRASES } from './lexicon';
import { SYNONYMS, suggestRewrite } from './rewrite';
import type { Suggestion } from './types';

/* Finds the lines worth changing, says exactly what is wrong with each (and where in the line), and proposes a rewrite.
   Rewrites here are rule-based and never invent facts: anything unknown stays as a [placeholder] for the person to fill in. */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function suggest(resume: Resume, limit = 30): Suggestion[] {
  const f = extractFacts(resume);
  const openers = new Map<string, number>();
  const all = [...f.experience, ...f.other].flatMap((e) => e.bullets.map((text) => ({ text, where: [e.title, e.org].filter(Boolean).join(' at ') || 'Experience' })));
  for (const b of all) { const w = firstWord(b.text).toLowerCase(); if (w) openers.set(w, (openers.get(w) ?? 0) + 1); }

  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const b of all) {
    const text = b.text;
    if (seen.has(text)) continue;
    seen.add(text);
    const marks: Suggestion['marks'] = [];
    const issues: string[] = [];

    for (const w of WEAK_PHRASES) {
      const m = text.match(new RegExp(w.re.source, 'i'));
      if (m && m.index !== undefined) { marks.push({ start: m.index, end: m.index + m[0].length, label: w.label }); issues.push(w.label === 'cliché' ? 'Generic cliché' : 'Weak wording'); }
    }
    const cl = text.match(new RegExp(CLICHES.source, 'i'));
    if (cl && cl.index !== undefined && !marks.some((m) => m.start === cl.index)) { marks.push({ start: cl.index, end: cl.index + cl[0].length, label: 'cliché' }); issues.push('Generic cliché'); }

    const opener = firstWord(text);
    const repeated = (openers.get(opener.toLowerCase()) ?? 0) >= 3;
    if (repeated) { const at = text.indexOf(opener); marks.push({ start: at, end: at + opener.length, label: `“${opener}” starts ${openers.get(opener.toLowerCase())} bullets` }); issues.push('Repeated wording'); }

    const metric = HAS_METRIC.test(text);
    if (!metric) issues.push('No measurable result');
    if (!metric && !RESULT_WORDS.test(text)) issues.push('Duty, not achievement');
    const n = wordCount(text);
    if (n < 6) issues.push('Too short to be specific');
    if (n > 32) issues.push('Too long to skim');

    const real = issues.filter((i) => i !== 'No measurable result');
    if (!real.length && metric) continue;       // a quantified line with nothing else wrong is fine
    if (!issues.length) continue;

    let rewrite = suggestRewrite(text) ?? '';
    if (!rewrite || rewrite === text) {
      const syn = SYNONYMS[opener.toLowerCase()]?.[0];
      rewrite = repeated && syn ? `${cap(syn)}${text.slice(opener.length)}` : '';
    }
    marks.sort((a, c) => a.start - c.start);
    out.push({ id: text, original: text, where: b.where, marks: marks.filter((m, i) => i === 0 || m.start >= marks[i - 1].end), issues: [...new Set(issues)], rewrite });
  }
  return out.sort((a, c) => c.issues.length - a.issues.length).slice(0, limit);
}

/** Swaps one line of text for another wherever it appears in the resume. Returns a new resume; the old one is untouched. */
export function replaceLine(resume: Resume, from: string, to: string): Resume {
  const next = structuredClone(resume);
  const fix = (s: string) => (s.trim() === from ? s.replace(from, to) : s);
  const item = (it: TimelineItem) => {
    it.bullets = it.bullets.map(fix);
    it.body = it.body.includes('\n') ? it.body.split('\n').map((l) => { const m = l.match(/^(\s*[-•*▪●–]\s*)(.*)$/); return m ? (m[2].trim() === from ? m[1] + to : l) : fix(l); }).join('\n') : fix(it.body);
    for (const p of it.points) { p.desc = fix(p.desc); p.bullets = p.bullets.map(fix); }
  };
  for (const s of next.sections) if (s.type === 'timeline') s.items.forEach(item);
  return next;
}
