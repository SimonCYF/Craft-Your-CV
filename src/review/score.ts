import type { Resume } from '../model/types';
import { extractFacts, firstWord, kind, wordCount, type Facts } from './facts';
import { monthIndex } from './dates';
import { CLICHES, HAS_METRIC, ODD_GLYPHS, PAST, RESULT_WORDS, STRONG_VERBS, WEAK_PHRASES } from './lexicon';
import { SYNONYMS, suggestRewrite } from './rewrite';
import type { CategoryScore, Example, MatchReport, Priority, ScoreReport } from './types';

/* Scores a resume the way a recruiter and an ATS would, and says why. Every check below is one line of the explanation. */

interface Check { w: number; got: number; ok: string; bad: string; fix?: string }

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const clip = (s: string, n = 110) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const label = (t: string, o: string) => [t, o].filter(Boolean).join(' at ') || 'Untitled entry';
const PAST_WORDS = new Set(Object.values(PAST).map((v) => v.toLowerCase()));
const isActionStart = (w: string) => { const l = w.toLowerCase(); return STRONG_VERBS.has(l) || PAST_WORDS.has(l) || (l.length > 4 && l.endsWith('ed')); };

function build(id: CategoryScore['id'], name: string, checks: Check[], examples: Example[] = [], extraFixes: string[] = []): CategoryScore {
  const total = checks.reduce((a, c) => a + c.w, 0) || 1;
  const score = Math.round((100 * checks.reduce((a, c) => a + c.w * clamp(c.got), 0)) / total);
  const total2 = total;
  const verdict = score >= 80 ? 'Strong' : score >= 60 ? 'Decent, with clear gaps' : score >= 40 ? 'Weak: worth fixing before you apply' : 'Needs a rewrite';
  return {
    id, label: name, weight: 0, score, verdict, examples,
    findings: checks.map((c) => ({ ok: c.got >= 0.8, text: c.got >= 0.8 ? c.ok : c.bad })),
    fixes: [...checks.filter((c) => c.got < 0.8 && c.fix).sort((a, b) => b.w * (1 - b.got) - a.w * (1 - a.got)).map((c) => c.fix!), ...extraFixes],
    fixItems: checks.filter((c) => c.got < 0.8 && c.fix).map((c) => ({ text: c.fix!, gain: (100 * c.w * (1 - clamp(c.got))) / total2 })).sort((a, b) => b.gain - a.gain),
  };
}

function contentScore(f: Facts): CategoryScore {
  const s = f.summary, words = wordCount(s), p = f.resume.profile;
  const roleWords = `${p.title} ${p.headline}`.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  const mentionsRole = roleWords.some((w) => s.toLowerCase().includes(w)) || /\b(engineer|developer|manager|analyst|designer|accountant|executive|officer|specialist|consultant|teacher|nurse|marketer|student|graduate|technician|administrator|coordinator)\b/i.test(s);
  const cliches = [...new Set((s.match(CLICHES) ?? []).map((x) => x.toLowerCase()))];
  const firstPerson = (s.match(/\b(I|my|me|I'm|I’m)\b/g) ?? []).length;
  const has = words > 0;
  const openers = new Map<string, number>();
  for (const b of f.bullets) { const w = firstWord(b.text).toLowerCase(); if (w) openers.set(w, (openers.get(w) ?? 0) + 1); }
  const repeated = [...openers].filter(([, n]) => n >= 3);
  const repeatedBullets = repeated.reduce((a, [, n]) => a + n, 0);
  const generic = f.bullets.filter((b) => WEAK_PHRASES.some((w) => w.re.test(b.text)) || new RegExp(CLICHES.source, 'i').test(b.text)).length;
  const nB = f.bullets.length;
  return build('content', 'Content Quality', [
    { w: 20, got: has ? 1 : 0, ok: 'There is a professional summary.', bad: 'There is no professional summary. Recruiters read it first and decide in seconds.', fix: 'Add a 2–3 sentence summary under your name: who you are, your strongest skills, and what you offer.' },
    { w: 20, got: !has ? 0 : words >= 30 && words <= 80 ? 1 : words >= 15 && words <= 110 ? 0.5 : 0.15, ok: `Length is right (${words} words).`, bad: `The summary is ${words} words. ${words < 30 ? 'Too short to say anything specific.' : 'Too long to be read.'}`, fix: 'Aim for 40–70 words, two or three sentences.' },
    { w: 20, got: has && mentionsRole ? 1 : 0, ok: 'It names your role or field.', bad: 'It never says what you do (your role or field).', fix: 'Open with your role and level, for example “Backend engineer with 5 years in fintech…”.' },
    { w: 15, got: has && (/\b\d+\+?\s*(years?|yrs?)\b/i.test(s) || HAS_METRIC.test(s)) ? 1 : 0, ok: 'It includes a number (years, scale or result).', bad: 'It has no numbers, so it could describe anyone.', fix: 'Add one hard fact: years of experience, team size, users served, or a headline result.' },
    { w: 15, got: has ? 1 - Math.min(1, cliches.length / 2) : 0, ok: 'No clichés.', bad: `Clichés that every resume uses: ${cliches.map((c) => `“${c}”`).join(', ')}.`, fix: 'Delete the buzzwords and replace each with proof: instead of “hard-working”, show what you delivered.' },
    { w: 10, got: has && firstPerson === 0 ? 1 : has ? 0.3 : 0, ok: 'Written without “I” and “my”.', bad: 'It uses “I” or “my”. Resume style drops first-person pronouns.', fix: 'Rewrite “I am a developer who…” as “Developer who…”.' },
    { w: 25, got: nB ? 1 - clamp(repeatedBullets / nB / 0.4) : 0.5, ok: 'Bullets start with a variety of verbs.', bad: `Repetitive wording: ${repeated.map(([w, n]) => `“${w}” opens ${n} bullets`).join(', ')}.`, fix: 'Vary your opening verbs. “Led”, “Built”, “Cut”, “Launched” and “Negotiated” say different things.' },
    { w: 25, got: nB ? 1 - clamp(generic / nB / 0.3) : 0.5, ok: 'Descriptions are specific, not generic.', bad: `${generic} bullet${generic === 1 ? '' : 's'} use generic wording (“responsible for”, “various”, clichés).`, fix: 'Replace generic phrases with what you actually did, for whom, and with what result.' },
  ], [...(has && s ? [{ quote: clip(s, 160), where: 'Summary' }] : []), ...repeated.slice(0, 2).map(([w, n]) => ({ quote: `“${w}” starts ${n} bullets`, where: 'Experience', rewrite: `Try: ${(SYNONYMS[w] ?? ['led', 'built', 'delivered']).slice(0, 3).join(', ')}` }))]);
}

function experienceScore(f: Facts, now: Date): CategoryScore {
  const E = f.experience, nowM = monthIndex(now);
  const nBul = f.bullets.length;
  const complete = E.length ? E.reduce((a, e) => a + (+!!e.title + +!!e.org + +(e.range.ok)) / 3, 0) / E.length : 0;
  const perRole = E.length ? E.reduce((a, e) => { const n = e.bullets.length; return a + (n >= 3 && n <= 6 ? 1 : n > 6 ? 0.7 : n === 2 ? 0.6 : n === 1 ? 0.3 : 0); }, 0) / E.length : 0;
  const good = f.bullets.filter((b) => { const n = wordCount(b.text); return n >= 8 && n <= 30; }).length;
  const verbs = f.bullets.filter((b) => isActionStart(firstWord(b.text))).length;
  const last = E.filter((e) => e.range.ok).map((e) => (e.range.current ? nowM : (e.range.end ?? e.range.start!))).sort((a, b) => b - a)[0];
  const recency = last === undefined ? 0.5 : nowM - last <= 12 ? 1 : nowM - last <= 24 ? 0.6 : 0.3;
  const thin = [...E].filter((e) => e.bullets.length < 3).slice(0, 3);
  return build('experience', 'Experience Quality', [
    { w: 20, got: E.length >= 2 ? 1 : E.length === 1 ? 0.6 : 0, ok: `${E.length} roles listed.`, bad: E.length ? 'Only one role is listed, so there is little history to judge.' : 'No work experience section was found.', fix: 'List every relevant role, internship, freelance job or substantial project. If you are early-career, show projects and volunteering under experience.' },
    { w: 20, got: complete, ok: 'Every role has a title, employer and dates.', bad: `Roles are missing a title, employer or readable dates (${Math.round(complete * 100)}% complete).`, fix: 'Give each role “Title, Company, Mon YYYY – Mon YYYY”.' },
    { w: 20, got: perRole, ok: 'Roles have 3–6 bullets each.', bad: 'Many roles have too few (or too many) bullets. Three to six is the sweet spot.', fix: 'Aim for 3–6 achievement bullets for recent roles and 1–2 for older ones.' },
    { w: 10, got: nBul ? good / nBul : 0, ok: 'Bullets are a readable length (8–30 words).', bad: 'Many bullets are too short to be meaningful or too long to skim.', fix: 'Write bullets of one to two lines: what you did, how, and the outcome.' },
    { w: 15, got: nBul ? verbs / nBul : 0, ok: 'Bullets open with action verbs.', bad: `Only ${nBul ? Math.round((100 * verbs) / nBul) : 0}% of bullets start with an action verb.`, fix: 'Start every bullet with a past-tense verb such as Led, Built, Reduced, Launched, Negotiated.' },
    { w: 15, got: recency, ok: 'Your history is current.', bad: last === undefined ? 'Dates could not be read, so recency is unknown.' : 'Your most recent role ended a while ago. Employers favour current experience.', fix: 'Add recent work, even freelance, volunteering or a project, and explain any gap.' },
  ], thin.map((e) => ({ quote: e.bullets.length ? `${e.bullets.length} bullet${e.bullets.length > 1 ? 's' : ''}: “${clip(e.bullets[0], 70)}”` : 'No bullets at all', where: label(e.title, e.org), rewrite: 'Add what you owned, the tools you used, and one result with a number.' })));
}

function impactScore(f: Facts): CategoryScore {
  const B = f.bullets, n = B.length;
  const quant = B.filter((b) => HAS_METRIC.test(b.text)).length;
  const result = B.filter((b) => RESULT_WORDS.test(b.text)).length;
  const weak = B.filter((b) => WEAK_PHRASES.some((w) => w.re.test(b.text))).length;
  const pct = (x: number) => (n ? Math.round((100 * x) / n) : 0);
  const worst = B.filter((b) => !HAS_METRIC.test(b.text) || WEAK_PHRASES.some((w) => w.re.test(b.text)))
    .sort((a, b) => Number(WEAK_PHRASES.some((w) => w.re.test(b.text))) - Number(WEAK_PHRASES.some((w) => w.re.test(a.text)))).slice(0, 4);
  return build('impact', 'Professional Impact', [
    { w: 50, got: n ? clamp(quant / n / 0.5) : 0, ok: `${pct(quant)}% of bullets contain a number.`, bad: n ? `Only ${pct(quant)}% of bullets contain a number. Strong resumes quantify at least half.` : 'There are no bullets to measure.', fix: 'Add a figure to each bullet: how many, how much, how fast, how often. Even estimates (“~30 users”, “weekly”) help.' },
    { w: 25, got: n ? clamp(result / n / 0.4) : 0, ok: 'Bullets say what changed (increased, reduced, saved…).', bad: `Only ${pct(result)}% of bullets describe a result. Most describe duties.`, fix: 'End bullets with the outcome: “…which cut processing time by 40%”.' },
    { w: 25, got: n ? 1 - clamp(weak / n / 0.3) : 0, ok: 'No weak phrases like “responsible for”.', bad: `${weak} bullet${weak === 1 ? '' : 's'} use weak phrases such as “responsible for” or “helped with”. These describe a job, not an achievement.`, fix: 'Replace “Responsible for X” with “Led / Ran / Built X, resulting in Y”.' },
  ], worst.map((b) => ({ quote: clip(b.text), where: label(b.entry.title, b.entry.org), rewrite: suggestRewrite(b.text) })), [
    'Questions that surface numbers: How many people, customers or accounts? What budget or revenue? How much faster or cheaper? What would have happened without you?',
  ]);
}

const FILLER = /^(microsoft word|ms word|word|internet|email|e-?mail|typing|computer literate|computer skills|windows|hardworking|hard-working|team player|good communication|punctual|multitasking|detail.?oriented|self.?motivated|fast learner)$/i;

function skillsScore(f: Facts, match?: MatchReport): CategoryScore {
  const skills = f.skills;
  const body = (f.summary + '\n' + f.experience.map((e) => e.text).join('\n') + '\n' + f.other.map((e) => e.text).join('\n')).toLowerCase();
  const evidenced = skills.filter((s) => body.includes(s.toLowerCase()));
  const filler = skills.filter((s) => FILLER.test(s.trim()));
  const lower = skills.map((s) => s.toLowerCase());
  const dupes = lower.length - new Set(lower).size;
  const groups = f.resume.sections.filter((s) => kind(s) === 'skills' && s.type === 'tags').flatMap((s) => (s.type === 'tags' ? s.groups : [])).filter((g) => g.items.length);
  const n = skills.length;
  const checks: Check[] = [
    { w: 25, got: n === 0 ? 0 : n < 5 ? 0.4 : n < 8 ? 0.8 : n <= 22 ? 1 : 0.6, ok: `${n} skills listed, a good range.`, bad: n === 0 ? 'There is no skills section.' : n < 8 ? `Only ${n} skills listed.` : `${n} skills is too many; the important ones get lost.`, fix: 'List 10–20 skills, prioritising those that appear in the jobs you want.' },
    { w: 10, got: groups.length >= 2 ? 1 : groups.length === 1 ? 0.5 : 0, ok: 'Skills are grouped by type.', bad: 'Skills are one flat list. Groups (Languages, Tools, Soft skills) are easier to scan.', fix: 'Split skills into 2–4 labelled groups.' },
    { w: 30, got: n ? clamp(evidenced.length / n / 0.5) : 0, ok: 'Most skills are proven in your experience.', bad: `Only ${evidenced.length} of ${n} skills appear anywhere in your experience or summary. Listed-but-unproven skills carry little weight.`, fix: 'Use each key skill inside a bullet: “Built dashboards in Power BI that…”.' },
    { w: 15, got: filler.length ? 0.3 : 1, ok: 'No filler skills.', bad: `Filler skills that add nothing: ${filler.map((x) => `“${x}”`).join(', ')}.`, fix: 'Remove basic or vague entries (Microsoft Word, Internet, Hard-working). Show soft skills in bullets instead.' },
    { w: 10, got: dupes ? 0.3 : 1, ok: 'No duplicates.', bad: `${dupes} duplicate skill${dupes > 1 ? 's' : ''}.`, fix: 'Remove repeated entries.' },
  ];
  const extra: string[] = [];
  if (match) checks.push({ w: 30, got: match.percent / 100, ok: `Matches ${match.percent}% of the job ad.`, bad: `Only ${match.percent}% of the job ad's skills and keywords appear on your resume.`, fix: 'Open “Job match” to see exactly which terms to add.' });
  else extra.push('Relevance depends on the role. Paste a job ad in “Job match” to measure how well your skills fit it.');
  return build('skills', 'Skills Relevance', checks, [], extra);
}

function atsScore(f: Facts): CategoryScore {
  const r = f.resume, p = r.profile;
  const kinds = new Set(r.sections.map(kind));
  const heads = ['experience', 'education', 'skills'].filter((k) => kinds.has(k as never)).length;
  const dated = [...f.experience, ...f.education].filter((e) => e.when.trim());
  const readable = dated.length ? dated.filter((e) => e.range.ok).length / dated.length : 0.5;
  const tpl = r.style.template === 'classic' ? 1 : r.style.template === 'bold' ? 0.85 : 0.5;
  const glyph = ODD_GLYPHS.test(f.allText);
  const w = f.words;
  const odd = r.sections.filter((s) => s.title.trim() && !/^(about|summary|profile|objective|experience|work experience|employment|education|skills|projects|certifications?|languages|achievements|awards|references|volunteering|interests|publications)/i.test(s.title.trim()));
  return build('ats', 'ATS Compatibility', [
    { w: 20, got: heads / 3, ok: 'Standard sections found (Experience, Education, Skills).', bad: `Missing standard section${heads === 2 ? '' : 's'} that ATS software searches for (Experience, Education, Skills).`, fix: 'Use the plain headings “Experience”, “Education” and “Skills”. Creative names like “My Journey” confuse parsers.' },
    { w: 10, got: odd.length ? 0.6 : 1, ok: 'Section headings are conventional.', bad: `Unusual headings: ${odd.slice(0, 3).map((s) => `“${s.title}”`).join(', ')}.`, fix: 'Rename them to common words an ATS recognises, or keep them for human readers only if the role is creative.' },
    { w: 15, got: (+!!p.email.trim() + +!!p.phone.trim()) / 2, ok: 'Email and phone are present as text.', bad: 'Email or phone is missing. ATS and recruiters need both.', fix: 'Add both to the contact block.' },
    { w: 20, got: readable, ok: 'All dates are in a readable format.', bad: 'Some dates cannot be parsed, so ATS may total your experience wrongly.', fix: 'Use “Mon YYYY – Mon YYYY” throughout.' },
    { w: 10, got: glyph ? 0.3 : 1, ok: 'Plain characters only.', bad: 'Decorative symbols or emoji are used; some ATS drop them.', fix: 'Use normal bullets and text.' },
    { w: 10, got: w >= 250 && w <= 900 ? 1 : w > 1000 ? 0.3 : 0.6, ok: `Length is parser-friendly (${w} words).`, bad: w < 250 ? 'Very little text for an ATS to match keywords against.' : 'Very long documents are sometimes truncated by an ATS.', fix: 'Aim for 400–800 words.' },
    { w: 15, got: tpl, ok: 'Single-column layout reads in the right order.', bad: r.style.template === 'sidebar' ? 'The Sidebar template is two columns; older ATS may read the columns out of order.' : 'Bold template headers are fine for humans but keep content in one flow for safety.', fix: 'For online applications use the Classic template, and save the PDF with selectable text (Save as PDF).' },
  ]);
}

function readabilityScore(f: Facts): CategoryScore {
  const r = f.resume, p = r.profile, E = f.experience;
  const nB = f.bullets.length;
  const avg = nB ? f.bullets.reduce((a, b) => a + wordCount(b.text), 0) / nB : 0;
  const long = f.bullets.filter((b) => wordCount(b.text) > 32);
  const w = f.words;
  const dense = [...E, ...f.education].filter((e) => !e.bullets.length && wordCount(e.text) > 60).length;
  const latest = E[0]?.bullets[0] ?? '';
  const order = r.sections.map(kind);
  const expAt = order.indexOf('experience'), eduAt = order.indexOf('education');
  const tooMany = E.filter((e) => e.bullets.length > 6).length;
  return build('readability', 'Recruiter Readability', [
    { w: 20, got: w >= 300 && w <= 750 ? 1 : w > 750 && w <= 1000 ? 0.6 : w >= 180 && w < 300 ? 0.6 : 0.25, ok: `Length suits a quick read (${w} words).`, bad: w < 300 ? `Only ${w} words: too thin for a recruiter to form a view.` : `${w} words is more than a recruiter will read.`, fix: 'Aim for 350–700 words: one page for under 10 years of experience, two at most.' },
    { w: 20, got: nB ? 1 - clamp((avg - 18) / 14) : 0.5, ok: `Bullets are short enough to skim (${Math.round(avg)} words on average).`, bad: `Bullets average ${Math.round(avg)} words and ${long.length} run past 32. Recruiters skim; long lines get skipped.`, fix: 'Split long bullets in two, or cut them to one line: action, scope, result.' },
    { w: 15, got: p.title.trim() || p.headline.trim() ? 1 : 0, ok: 'A job title sits under your name.', bad: 'There is no job title or headline under your name, so the first glance tells nothing.', fix: 'Add the role you want as a short title under your name, for example “Business Analyst”.' },
    { w: 15, got: E.length ? 1 - clamp(tooMany / E.length / 0.5) : 0.5, ok: 'No role has a wall of bullets.', bad: `${tooMany} role${tooMany === 1 ? ' has' : 's have'} more than six bullets, so the best ones are buried.`, fix: 'Keep your top 3–5 bullets per role. Cut the rest.' },
    { w: 10, got: dense ? 0.3 : 1, ok: 'Entries are broken into short points.', bad: `${dense} entr${dense === 1 ? 'y is a dense paragraph' : 'ies are dense paragraphs'} with no bullets.`, fix: 'Turn paragraphs into 2–4 bullet points.' },
    { w: 10, got: !latest ? 0.4 : HAS_METRIC.test(latest) ? 1 : 0.5, ok: 'Your first bullet carries a number.', bad: 'The first bullet of your latest role has no number, so the strongest line is not the first one read.', fix: 'Put your most measurable achievement first in each role.' },
    { w: 10, got: expAt < 0 ? 0.5 : eduAt < 0 || expAt < eduAt ? 1 : 0.5, ok: 'Experience comes before education.', bad: 'Education sits above experience. Unless you are a recent graduate, lead with experience.', fix: 'Move Experience above Education.' },
  ], long.slice(0, 3).map((b) => ({ quote: clip(b.text, 120), where: label(b.entry.title, b.entry.org), rewrite: `${wordCount(b.text)} words: split it into two bullets.` })));
}

function completenessScore(f: Facts): CategoryScore {
  const r = f.resume, p = r.profile;
  const kinds = new Set(r.sections.map(kind));
  const hasLink = p.links.some((l) => l.url.trim()) || /linkedin\.com|github\.com|behance|portfolio/i.test(f.allText);
  const yes = (b: boolean) => (b ? 1 : 0);
  return build('completeness', 'Resume Completeness', [
    { w: 10, got: yes(!!p.fullName.trim()), ok: 'Your name is there.', bad: 'Your name is missing.', fix: 'Add your full name at the top.' },
    { w: 15, got: yes(!!p.email.trim()), ok: 'Email is there.', bad: 'Email is missing.', fix: 'Add a professional email address.' },
    { w: 10, got: yes(!!p.phone.trim()), ok: 'Phone is there.', bad: 'Phone number is missing.', fix: 'Add a phone number recruiters can call.' },
    { w: 5, got: yes(!!p.location.trim()), ok: 'Location is there.', bad: 'No location. Recruiters filter by city.', fix: 'Add your city and country.' },
    { w: 10, got: yes(!!(p.title.trim() || p.headline.trim())), ok: 'A job title is there.', bad: 'No job title or headline.', fix: 'Add the role you are applying for under your name.' },
    { w: 10, got: yes(hasLink), ok: 'A LinkedIn, GitHub or portfolio link is there.', bad: 'No LinkedIn, GitHub or portfolio link.', fix: 'Add your LinkedIn or portfolio link so recruiters can verify your story.' },
    { w: 10, got: yes(wordCount(f.summary) > 0), ok: 'A summary is there.', bad: 'No professional summary.', fix: 'Add a 2–3 sentence summary.' },
    { w: 15, got: yes(f.experience.length > 0), ok: 'Work experience is there.', bad: 'No work experience section.', fix: 'Add your roles, internships, projects or volunteering under Experience.' },
    { w: 10, got: yes(f.education.length > 0 || kinds.has('education')), ok: 'Education is there.', bad: 'No education section.', fix: 'Add your highest qualification, even if still in progress.' },
    { w: 5, got: yes(f.skills.length > 0), ok: 'Skills are there.', bad: 'No skills section.', fix: 'Add a Skills section with 10–20 relevant skills.' },
  ]);
}

/** Share of the overall score each category carries. Sums to 100. */
export const WEIGHTS = { ats: 15, impact: 20, content: 15, experience: 20, skills: 10, readability: 10, completeness: 10 } as const;

export function scoreResume(resume: Resume, match?: MatchReport, now = new Date()): ScoreReport {
  const f = extractFacts(resume);
  const categories = [atsScore(f), impactScore(f), contentScore(f), experienceScore(f, now), skillsScore(f, match), readabilityScore(f), completenessScore(f)];
  const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  for (const c of categories) { c.weight = WEIGHTS[c.id]; c.fixItems = c.fixItems.map((x) => ({ ...x, gain: (x.gain * c.weight) / sum })); }
  const overall = Math.round(categories.reduce((a, c) => a + c.score * c.weight, 0) / sum);
  const priorities: Priority[] = categories.flatMap((c) => c.fixItems.slice(0, 2).map((x) => ({ text: x.text, category: c.label, gain: Math.round(x.gain * 10) / 10 })))
    .sort((a, b) => b.gain - a.gain).slice(0, 3);
  return { overall, categories, priorities };
}
