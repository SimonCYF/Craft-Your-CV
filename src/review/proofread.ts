import type { Resume } from '../model/types';
import { extractFacts, firstWord, wordCount, type Entry, type Facts } from './facts';
import { fmtMonth, monthIndex } from './dates';
import { BRAND_CASE, MISSPELLINGS, ODD_GLYPHS, PERSONAL_INFO, WEAK_PHRASES } from './lexicon';
import { SYNONYMS, isPresentVerb, suggestRewrite } from './rewrite';
import type { Issue, ProofCategory, Severity } from './types';

/* A rule-based proofreader. It runs in the browser, on the resume only, and explains every flag. */

interface Field { where: string; text: string; bullet?: boolean }

const label = (e: Entry) => [e.title, e.org].filter(Boolean).join(' at ') || 'Untitled entry';
const clip = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const stripLinks = (s: string) => s.replace(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g, ' ');

function fields(f: Facts): Field[] {
  const p = f.resume.profile;
  const out: Field[] = [{ where: 'Headline', text: p.headline }, { where: 'Summary', text: f.summary }];
  for (const e of [...f.experience, ...f.education, ...f.other]) {
    for (const b of e.bullets) out.push({ where: label(e), text: b, bullet: true });
  }
  return out.filter((x) => x.text.trim());
}

export function proofread(resume: Resume, now = new Date()): Issue[] {
  const f = extractFacts(resume);
  const issues: Issue[] = [];
  const add = (category: ProofCategory, severity: Severity, message: string, extra: Partial<Issue> = {}) => issues.push({ category, severity, message, ...extra });
  const fs = fields(f);
  const nowM = monthIndex(now);

  /* ── Spelling and grammar ── */
  const seen = new Set<string>();
  for (const fld of fs) {
    const text = stripLinks(fld.text);
    for (const [re, fix] of MISSPELLINGS) {
      for (const m of text.matchAll(re)) {
        const key = m[0].toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        add('Spelling and grammar', 'warn', `Possible misspelling: “${m[0]}”.`, { where: fld.where, quote: clip(fld.text), fix: `Did you mean “${fix}”? Run your browser spell-check as well.` });
      }
    }
    for (const m of text.matchAll(/\b([A-Za-z][A-Za-z.+#]*)\b/g)) {
      const correct = BRAND_CASE[m[1].toLowerCase()];
      if (!correct || m[1] === correct || m[1].toLowerCase() === 'sap') continue;
      if (m[1] === m[1].toUpperCase() && m[1] === correct.toUpperCase()) continue;   // "ISO"-style acronyms are fine
      const key = 'case:' + m[1];
      if (seen.has(key)) continue;
      seen.add(key);
      add('Spelling and grammar', 'warn', `“${m[1]}” is usually written “${correct}”.`, { where: fld.where, quote: clip(fld.text), fix: `Change it to “${correct}”. Recruiters and ATS search for the standard spelling.` });
    }
    const dup = text.match(/\b([A-Za-z]{2,})\s+\1\b/i);
    if (dup && !/^(had|that|is|very)$/i.test(dup[1])) add('Spelling and grammar', 'warn', `Repeated word: “${dup[0]}”.`, { where: fld.where, quote: clip(fld.text), fix: 'Delete the extra word.' });
    if (/(^|[\s(])i(?=[\s,'’])/.test(text)) add('Spelling and grammar', 'warn', 'The pronoun “I” is written in lower case.', { where: fld.where, quote: clip(fld.text), fix: 'Capitalise it, or better, drop first-person pronouns from resume lines.' });
    if (/\s{2,}\S/.test(fld.text.trim())) add('Formatting', 'tip', 'Double spaces between words.', { where: fld.where, quote: clip(fld.text), fix: 'Use a single space.' });
    if (/\s[,.;:!?](?=\s|$)/.test(text)) add('Spelling and grammar', 'tip', 'A space before a punctuation mark.', { where: fld.where, quote: clip(fld.text), fix: 'Remove the space before the punctuation.' });
    if (/\b[a-z]{3,}[.,][A-Z][a-z]{2,}\b/.test(text) && !/\b(?:node|vue|next|chart|three|d3)\.[a-z]/i.test(text)) add('Spelling and grammar', 'tip', 'Missing space after a full stop or comma.', { where: fld.where, quote: clip(fld.text), fix: 'Add a space after the punctuation.' });
    if (fld.bullet) {
      const w = firstWord(fld.text);
      if (w.length > 2 && w === w.toLowerCase() && !BRAND_CASE[w.toLowerCase()] && /^[a-z]/.test(w)) {
        add('Spelling and grammar', 'tip', 'A bullet starts with a lower-case letter.', { where: fld.where, quote: clip(fld.text), fix: 'Start every bullet with a capital letter.' });
      }
    }
  }
  /* Tense: past roles use past tense; a current role may use present. */
  for (const e of f.experience) {
    if (!e.range.ok || !e.bullets.length) continue;
    const present = e.bullets.filter((b) => isPresentVerb(firstWord(b)));
    const past = e.bullets.length - present.length;
    if (!e.range.current && present.length) {
      add('Spelling and grammar', 'warn', `${present.length} bullet${present.length > 1 ? 's' : ''} in a finished role ${present.length > 1 ? 'use' : 'uses'} present tense (“${firstWord(present[0])}…”).`, { where: label(e), quote: clip(present[0]), fix: 'Describe finished roles in past tense: “Manage” → “Managed”, “Lead” → “Led”.' });
    } else if (e.range.current && present.length && past > 0) {
      add('Spelling and grammar', 'tip', 'Present and past tense are mixed in your current role.', { where: label(e), quote: clip(present[0]), fix: 'Use present tense for what you still do, and past tense for finished achievements, but keep each group together.' });
    }
  }

  /* ── Dates ── */
  const dated = [...f.experience, ...f.education];
  const formats = new Set<string>(), seps = new Set<string>();
  for (const e of dated) {
    const r = e.range, isExp = f.experience.includes(e);
    if (!e.when.trim()) {
      if (isExp) add('Dates', 'error', 'This job has no dates.', { where: label(e), fix: 'Add a start and end date, for example “Mar 2021 – Present”. Recruiters and ATS rely on them to total your experience.' });
      continue;
    }
    if (!r.ok) { add('Dates', 'warn', `The dates “${e.when}” could not be read.`, { where: label(e), fix: 'Write them as “Mon YYYY – Mon YYYY”, for example “Jan 2020 – Mar 2022”.' }); continue; }
    if (r.formats[0]) formats.add(r.formats[0]);
    if (r.separator) seps.add(r.separator);
    if (!r.current && r.end !== null && r.end < r.start!) add('Dates', 'error', 'The end date is before the start date.', { where: label(e), quote: e.when, fix: 'Swap or correct the dates.' });
    if (isExp && r.start! > nowM + 1) add('Dates', 'error', 'This job starts in the future.', { where: label(e), quote: e.when, fix: 'Check the year. If it is a confirmed future role, label it “Starting …”.' });
    if (!isExp && r.start! > nowM + 1) add('Dates', 'tip', 'This education entry is in the future.', { where: label(e), quote: e.when, fix: 'Write “Expected Mon YYYY” so it is clear it is not finished.' });
    if (!r.current && r.end !== null && r.end - r.start! > 12 * 40) add('Dates', 'warn', 'This entry spans more than 40 years.', { where: label(e), quote: e.when, fix: 'Check for a typo in the year.' });
  }
  if (formats.size > 1) add('Dates', 'warn', `Dates are written ${formats.size} different ways: ${[...formats].join(', ')}.`, { fix: 'Pick one format for every entry, for example “Jan 2020 – Mar 2022”.' });
  if (seps.size > 1) add('Formatting', 'tip', `Date ranges use different separators (${[...seps].map((s) => `“${s}”`).join(', ')}).`, { fix: 'Use the same dash between every pair of dates.' });
  const startsOf = f.experience.filter((e) => e.range.ok).map((e) => e.range.start!);
  if (startsOf.length > 2) {
    const asc = startsOf.every((s, i) => i === 0 || s >= startsOf[i - 1]), desc = startsOf.every((s, i) => i === 0 || s <= startsOf[i - 1]);
    if (asc && !desc) add('Dates', 'warn', 'Jobs are listed oldest first.', { fix: 'Put your most recent job at the top. Recruiters read the first lines most closely.' });
    else if (!asc && !desc) add('Dates', 'warn', 'Jobs are not in date order.', { fix: 'List them in reverse chronological order, most recent first.' });
  }
  const ranged = f.experience.filter((e) => e.range.ok);
  for (let i = 0; i < ranged.length; i++) for (let j = i + 1; j < ranged.length; j++) {
    const a = ranged[i].range, b = ranged[j].range;
    const aEnd = a.current ? nowM : (a.end ?? a.start!), bEnd = b.current ? nowM : (b.end ?? b.start!);
    const overlap = Math.min(aEnd, bEnd) - Math.max(a.start!, b.start!) + 1;
    if (overlap > 6 && ranged[i].org.toLowerCase() !== ranged[j].org.toLowerCase()) {
      add('Dates', 'tip', `“${label(ranged[i])}” and “${label(ranged[j])}” overlap by ${overlap} months.`, { fix: 'If one was part-time, freelance or a promotion within the same company, say so in the title, otherwise a recruiter may think it is a mistake.' });
    }
  }

  /* ── Employment gaps ── */
  const studies = f.education.filter((e) => e.range.ok);
  const covered = (from: number, to: number) => studies.some((e) => e.range.start! <= from && (e.range.current ? nowM : (e.range.end ?? e.range.start!)) >= to);
  const spans = ranged.map((e) => ({ s: e.range.start!, e: e.range.current ? nowM : (e.range.end ?? e.range.start!) })).sort((a, b) => a.s - b.s);
  let reach = -1;
  for (const sp of spans) {
    if (reach >= 0 && sp.s - reach - 1 >= 3 && !covered(reach + 1, sp.s - 1)) {
      const gap = sp.s - reach - 1;
      add('Employment gaps', gap >= 6 ? 'warn' : 'tip', `A ${gap}-month gap between ${fmtMonth(reach)} and ${fmtMonth(sp.s)}.`, {
        fix: gap >= 6 ? 'Recruiters will ask. Add a one-line entry such as “Career break: full-time study / caring for family / freelance projects”, and list anything you learned or built.' : 'Short gaps are normal; if you did something useful, a single line is enough.',
      });
    }
    reach = Math.max(reach, sp.e);
  }
  const latest = ranged.some((e) => e.range.current) ? nowM : reach;
  if (spans.length && latest >= 0 && nowM - latest >= 6 && !ranged.some((e) => e.range.current)) {
    add('Employment gaps', 'warn', `Your latest job ended ${fmtMonth(latest)}, ${nowM - latest} months ago.`, { fix: 'Explain what you have done since (freelance, study, a career break) or add “Present” if you are still in that role.' });
  }

  /* ── Repeated verbs ── */
  const counts = new Map<string, number>();
  for (const b of f.bullets) { const w = firstWord(b.text).toLowerCase(); if (w) counts.set(w, (counts.get(w) ?? 0) + 1); }
  for (const [w, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    if (n < 3) break;
    const alt = SYNONYMS[w] ?? SYNONYMS[w.replace(/(ed|d)$/, '') + 'ed'];
    add('Repeated verbs', n >= 5 ? 'warn' : 'tip', `“${w[0].toUpperCase() + w.slice(1)}” starts ${n} bullets.`, { fix: alt ? `Vary it: ${alt.join(', ')}.` : 'Replace some with a different strong verb: led, built, improved, launched, reduced.' });
  }
  for (const e of f.experience) {
    const local = new Map<string, number>();
    for (const b of e.bullets) { const w = firstWord(b).toLowerCase(); if (w) local.set(w, (local.get(w) ?? 0) + 1); }
    for (const [w, n] of local) if (n >= 2 && (counts.get(w) ?? 0) < 3) add('Repeated verbs', 'tip', `Two bullets in one role both start with “${w[0].toUpperCase() + w.slice(1)}”.`, { where: label(e), fix: 'Change the opening verb of one of them.' });
  }

  /* ── Weak descriptions ── */
  for (const e of f.experience) {
    if (!e.bullets.length) add('Weak descriptions', 'warn', 'This job has a title but no description.', { where: label(e), fix: 'Add 3–5 bullets: what you did, how, and the result.' });
    else if (e.bullets.length === 1) add('Weak descriptions', 'tip', 'Only one bullet for this job.', { where: label(e), fix: 'Add two or three more achievements, unless the role was very short.' });
  }
  let weakShown = 0;
  const shorts: typeof f.bullets = [];
  for (const b of f.bullets) {
    const hit = WEAK_PHRASES.find((w) => w.re.test(b.text));
    if (hit && weakShown < 8) {
      weakShown++;
      add('Weak descriptions', 'warn', `Weak wording: “${hit.label}”.`, { where: label(b.entry), quote: clip(b.text, 120), fix: suggestRewrite(b.text) ? `Try: “${suggestRewrite(b.text)}”` : 'Start with a strong action verb and say what changed because of you.' });
    } else if (!hit && wordCount(b.text) < 5) shorts.push(b);
  }
  if (shorts.length) add('Weak descriptions', 'tip', shorts.length === 1 ? 'This bullet is too short to say anything.' : `${shorts.length} bullets are under five words.`, { where: label(shorts[0].entry), quote: shorts.map((s) => s.text).slice(0, 3).join(' / '), fix: 'Say what you did, with what, and what happened as a result.' });
  if (f.summary && wordCount(f.summary) < 12) add('Weak descriptions', 'warn', 'The summary is only a few words.', { quote: clip(f.summary), fix: 'Write 2–3 sentences: your role, years of experience, strongest skills, and what you want next.' });
  if (!f.summary) add('Weak descriptions', 'warn', 'There is no professional summary.', { fix: 'Add a 2–3 sentence summary at the top. It is the first thing a recruiter reads.' });

  /* ── Length ── */
  const pages = f.words / 500;
  if (f.words > 1000) add('Length', 'error', `${f.words} words is about ${pages.toFixed(1)} pages. That is too long.`, { fix: 'Aim for 450–700 words (one to two pages). Cut old jobs, repeated duties and anything not relevant to the role.' });
  else if (f.words > 750) add('Length', 'warn', `${f.words} words is about ${pages.toFixed(1)} pages.`, { fix: 'Trim to two pages at most: shorten older roles and merge similar bullets.' });
  else if (f.words < 150) add('Length', 'tip', `Only ${f.words} words. The resume looks thin.`, { fix: 'Add achievements, skills and projects so a recruiter has enough to judge you.' });
  if (wordCount(f.summary) > 90) add('Length', 'tip', `The summary is ${wordCount(f.summary)} words.`, { fix: 'Keep it to 40–70 words, three sentences at most.' });
  const longBullets = f.bullets.filter((b) => wordCount(b.text) > 32);
  if (longBullets.length) add('Length', 'tip', `${longBullets.length} bullet${longBullets.length > 1 ? 's are' : ' is'} over 32 words.`, { quote: clip(longBullets[0].text, 120), where: label(longBullets[0].entry), fix: 'Split it in two or cut it to one line. Ideal bullets are 12–25 words.' });
  for (const e of f.experience) if (e.bullets.length > 7) add('Length', 'tip', `${e.bullets.length} bullets in one job.`, { where: label(e), fix: 'Keep the best 4–6. More than that is rarely read.' });
  const old = f.experience.filter((e) => e.range.ok && !e.range.current && nowM - (e.range.end ?? e.range.start!) > 15 * 12);
  if (old.length) add('Length', 'tip', `${old.length} job${old.length > 1 ? 's' : ''} ended more than 15 years ago.`, { where: label(old[0]), fix: 'Shrink old roles to a single line, or remove them unless they are directly relevant.' });
  if (f.experience.length > 8) add('Length', 'tip', `${f.experience.length} jobs listed.`, { fix: 'Keep the most relevant 5–6 and combine short or unrelated roles.' });
  if (f.skills.length > 25) add('Length', 'tip', `${f.skills.length} skills listed.`, { fix: 'Keep the 12–20 most relevant to the jobs you apply for. A long list dilutes the important ones.' });

  /* ── Personal information ── */
  const lines = [...new Set(f.allText.split('\n'))];
  for (const rule of PERSONAL_INFO) {
    const line = lines.find((l) => rule.re.test(l));
    if (line) add('Personal information', rule.severity, `${rule.label} is on the resume.`, { quote: clip(line), fix: `${rule.why} Remove it.` });
  }
  const p = resume.profile;
  if (p.photo) add('Personal information', 'tip', 'A photo is included.', { fix: 'Photos are common in Malaysia and much of Asia, but expected to be left off in the US, UK, Canada and Australia, and most ATS ignore them. Remove it for applications there.' });
  if (/\d/.test(p.location) && p.location.length > 25) add('Personal information', 'tip', 'The location looks like a full street address.', { quote: p.location, fix: 'Use “City, Country” only.' });

  /* ── Contact details ── */
  if (!p.fullName.trim()) add('Contact details', 'error', 'Your name is missing.', { fix: 'Add your full name at the top.' });
  if (!p.email.trim()) add('Contact details', 'error', 'No email address.', { fix: 'Add a professional email, ideally firstname.lastname@…' });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email.trim())) add('Contact details', 'error', `“${p.email}” does not look like a valid email address.`, { fix: 'Check for a missing @ or domain.' });
  else {
    const local = p.email.split('@')[0];
    if (/(\d{4,}|cute|sexy|baby|princess|lover|hottie|boss|gamer|420|69)/i.test(local)) add('Contact details', 'tip', 'The email address looks informal.', { quote: p.email, fix: 'Use a simple address based on your name.' });
  }
  if (!p.phone.trim()) add('Contact details', 'warn', 'No phone number.', { fix: 'Many recruiters phone first. Add a mobile number with country code.' });
  else if (!/^\+?[\d\s().-]{8,20}$/.test(p.phone.trim()) || p.phone.replace(/\D/g, '').length < 8) add('Contact details', 'warn', `The phone number “${p.phone}” looks incomplete.`, { fix: 'Include the country code, for example +60 12-345 6789.' });
  if (!p.location.trim()) add('Contact details', 'tip', 'No location.', { fix: 'Add “City, Country”. Employers filter by location and willingness to relocate.' });
  const hasLinkedIn = p.links.some((l) => /linkedin/i.test(l.label + l.url)) || /linkedin\.com/i.test(p.qrUrl);
  if (!hasLinkedIn) add('Contact details', 'warn', 'No LinkedIn profile.', { fix: 'Add your LinkedIn address under “Links”. Recruiters check it almost every time.' });
  if (/\b(software|developer|engineer|programmer|data|devops|web|full.?stack|front.?end|back.?end)\b/i.test(`${p.title} ${p.headline}`) && !p.links.some((l) => /github|gitlab|portfolio|bitbucket/i.test(l.label + l.url))) {
    add('Contact details', 'tip', 'No GitHub or portfolio link.', { fix: 'For technical roles, a link to real work is stronger than any bullet.' });
  }
  for (const l of p.links) {
    if (l.label && !l.url) add('Contact details', 'warn', `The link “${l.label}” has no web address.`, { fix: 'Add the full address, starting with https://' });
    else if (l.url && !/^https?:\/\//i.test(l.url)) add('Contact details', 'warn', `The link “${l.label || l.url}” does not start with https://`, { quote: l.url, fix: 'Without it the link may not be clickable in the downloaded file.' });
  }

  /* ── Formatting ── */
  const ends = f.bullets.map((b) => /[.!?]$/.test(b.text.trim()));
  const withDot = ends.filter(Boolean).length;
  if (ends.length > 3 && withDot > 0 && withDot < ends.length && Math.min(withDot, ends.length - withDot) / ends.length >= 0.15) {
    add('Formatting', 'warn', `${withDot} of ${ends.length} bullets end with a full stop and the rest do not.`, { fix: 'Choose one style. Most resumes leave the full stop off.' });
  }
  const places = [p.location, ...[...f.experience, ...f.education].map((e) => e.where)].filter((x) => x.trim());
  if (places.length > 2 && places.some((x) => x.includes(',')) && places.some((x) => !x.includes(','))) {
    add('Formatting', 'tip', 'Locations are written in different styles (some with country, some without).', { quote: places.find((x) => !x.includes(',')), fix: 'Use “City, Country” everywhere, or “City” everywhere.' });
  }
  const titles = f.experience.map((e) => e.title).filter((t) => t.length > 3);
  if (titles.length > 2 && titles.some((t) => t === t.toUpperCase()) && titles.some((t) => t !== t.toUpperCase())) add('Formatting', 'tip', 'Some job titles are in capitals and others are not.', { quote: titles.find((t) => t === t.toUpperCase()), fix: 'Use the same capitalisation for every job title.' });
  const shouty = fs.find((x) => x.text.length > 24 && (x.text.match(/[A-Z]/g)?.length ?? 0) / Math.max(1, x.text.match(/[A-Za-z]/g)?.length ?? 1) > 0.7);
  if (shouty) add('Formatting', 'tip', 'A line is written in all capitals.', { where: shouty.where, quote: clip(shouty.text), fix: 'Use normal sentence case. Capitals are harder to read and look like shouting.' });
  const counts2 = f.experience.map((e) => e.bullets.length);
  if (counts2.length > 2 && Math.max(...counts2) - Math.min(...counts2) >= 5) add('Formatting', 'tip', 'Bullet counts vary a lot between jobs.', { fix: 'Give recent jobs the most detail and older ones fewer bullets, but avoid extremes.' });
  const glyph = f.allText.match(ODD_GLYPHS);
  if (glyph) add('Formatting', 'warn', `Special symbol “${glyph[0]}” found.`, { fix: 'Some ATS parsers drop or garble decorative symbols and emoji. Use plain text.' });
  if (resume.style.template === 'sidebar') add('Formatting', 'tip', 'The Sidebar template uses two columns.', { fix: 'Two-column layouts can be read out of order by older ATS. For online applications, the Classic template is safest.' });

  const rank: Record<Severity, number> = { error: 0, warn: 1, tip: 2 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

