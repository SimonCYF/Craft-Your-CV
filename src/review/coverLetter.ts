import type { Resume } from '../model/types';
import { extractFacts, firstWord, wordCount } from './facts';
import { totalMonths } from './dates';
import { HAS_METRIC, PAST, STRONG_VERBS } from './lexicon';
import type { MatchReport } from './types';

/* Writes a first draft of a cover letter from the resume and a job advert. It is a template, not an AI:
   every claim comes from the resume, and nothing the resume does not show is promised. The person edits the result. */

export interface Letter {
  text: string;
  role: string;
  company: string;
  words: number;
  /** things to check before sending */
  notes: string[];
}

const PAST_WORDS = new Set(Object.values(PAST).map((v) => v.toLowerCase()));
const isActionStart = (w: string) => { const l = w.toLowerCase(); return STRONG_VERBS.has(l) || PAST_WORDS.has(l) || (l.length > 4 && l.endsWith('ed')); };
const lowerFirst = (s: string) => s.replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());
const article = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const trimEnd = (s: string) => s.trim().replace(/[.;:,]+$/, '');

/** Best guess at the employer's name in an advert. Returns '' when unsure, so the person fills it in. */
export function detectCompany(ad: string): string {
  const name = '([A-Z][\\w&.\'’-]*(?:\\s+(?:[A-Z][\\w&.\'’-]*|Sdn\\.?|Bhd\\.?|Berhad|Inc\\.?|Ltd\\.?|Pte\\.?|&|of|and)){0,4})';
  const tries = [
    /(?:^|\n)\s*(?:company|employer|organi[sz]ation|hiring company)\s*[:\-–]\s*(.+)/i,
    new RegExp(`\\bjoin(?:ing)?\\s+(?:the\\s+team\\s+at\\s+|us\\s+at\\s+)?${name}(?=[,.\\n]|\\s+as\\b|\\s+to\\b|\\s+and\\b)`),
    new RegExp(`(?:^|\\n)\\s*about\\s+(?:us\\s+[-–:]\\s*)?${name}\\s*(?:\\n|:)`, 'i'),
    new RegExp(`\\b(?:work|role|position|opportunity|opening)\\s+at\\s+${name}`),
    new RegExp(`\\b${name}\\s+is\\s+(?:a|an|the|looking|hiring|seeking)\\b`),
  ];
  for (const re of tries) {
    const m = ad.match(re);
    const c = m?.[1]?.trim().replace(/[.,;:]+$/, '');
    if (c && c.length >= 2 && c.length <= 60 && !/^(we|our|the|this|you|your|a|an|about|company|job|role)$/i.test(c)) return c;
  }
  return '';
}

export function generateCoverLetter(resume: Resume, ad: string, match: MatchReport | null, opts: { company?: string; manager?: string } = {}): Letter {
  const f = extractFacts(resume);
  const p = resume.profile;
  const role = trimEnd(match?.title || ad.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || p.title || 'advertised');
  const company = (opts.company ?? detectCompany(ad)).trim();
  const manager = (opts.manager ?? '').trim();
  const notes: string[] = [];

  const years = Math.floor(totalMonths(f.experience.map((e) => e.range)) / 12);
  const recency = (e: (typeof f.experience)[number]) => (e.range.current ? Infinity : (e.range.end ?? e.range.start ?? -Infinity));
  const latest = [...f.experience].filter((e) => e.title).sort((a, b) => recency(b) - recency(a))[0] ?? f.experience[0];
  const currentTitle = latest?.title || p.title;

  /* Opening */
  const who = currentTitle ? `${years >= 1 ? `${years}+ years of experience` : 'a solid foundation'} as ${article(currentTitle)} ${currentTitle}${latest?.org ? `, most recently at ${latest.org}` : ''}` : years >= 1 ? `${years}+ years of professional experience` : 'a strong foundation in this field';
  const opening = `I am writing to apply for the ${role} position${company ? ` at ${company}` : ''}. With ${who}, I am confident I can make a real contribution from the start.`;

  /* Evidence: the bullets that best fit the advert, otherwise the most quantified ones */
  const pool = match?.highlight.length
    ? match.highlight.map((h) => ({ text: h.text, org: h.where.split(' at ')[1] ?? '' }))
    : f.bullets.filter((b) => HAS_METRIC.test(b.text)).map((b) => ({ text: b.text, org: b.entry.org }));
  const proof = pool.filter((b) => isActionStart(firstWord(b.text))).slice(0, 2)
    .map((b) => `${b.org ? `At ${b.org}, I` : 'I'} ${lowerFirst(trimEnd(b.text))}.`);
  if (!proof.length) notes.push('No bullet in your resume was strong enough to quote. Add achievements that start with an action verb and include a result, then regenerate.');
  const evidence = proof.length ? `${proof.join(' ')}${match && match.highlight.length ? ' This is the kind of work your advert describes.' : ''}` : '';

  /* Skills: only terms the resume really contains */
  const matched = (match?.matched ?? []).filter((m) => m.kind === 'technical' || m.kind === 'tool').sort((a, b) => Number(b.required) - Number(a.required) || b.count - a.count).slice(0, 5).map((m) => m.term);
  const skills = matched.length ? matched : f.skills.slice(0, 5);
  const skillLine = skills.length ? (matched.length ? `My toolkit includes ${list(skills)}, which match the skills your advert asks for.` : `My strengths include ${list(skills)}.`) : '';

  /* Close */
  const closing = `I would welcome the chance to discuss how I can contribute${company ? ` to ${company}` : ' to your team'}. Thank you for your time and consideration.`;
  const contact = [p.email, p.phone, p.links.find((l) => /linkedin/i.test(l.label + l.url))?.url].filter(Boolean).join(' | ');
  const sign = ['Sincerely,', p.fullName || '[Your name]', contact].filter(Boolean).join('\n');

  const text = [manager ? `Dear ${manager},` : 'Dear Hiring Manager,', opening, evidence, skillLine, closing, sign].filter(Boolean).join('\n\n');

  /* Honest notes */
  if (!company) notes.push('The company name was not found in the advert. Type it in the box above so the letter is addressed properly.');
  if (!manager) notes.push('If the advert names a hiring manager, add their name. “Dear Hiring Manager” is the fallback.');
  if (!ad.trim()) notes.push('Paste the job advert in box 2 so the letter can quote the skills and experience that fit it.');
  const missing = (match?.missingTechnical ?? []).filter((m) => m.required).slice(0, 4).map((m) => m.term);
  if (missing.length) notes.push(`The advert requires ${list(missing)}, which your resume does not show. The letter does not claim them. If you have them, add them to your resume first. If not, consider one sentence on how quickly you learn new tools, backed by an example.`);
  if (match?.gaps.some((g) => /years of experience/i.test(g.title))) notes.push('You are below the years of experience the advert asks for. Lead with your strongest, most relevant achievement.');
  const w = wordCount(text);
  if (w > 380) notes.push(`The letter is ${w} words. Keep it to one page (about 250–350 words).`);
  notes.push('Read it aloud and change anything that does not sound like you. A letter that sounds personal beats a perfect template.');

  return { text, role, company, words: w, notes };
}
