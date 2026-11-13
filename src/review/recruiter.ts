import type { Resume } from '../model/types';
import { extractFacts, kind, wordCount } from './facts';
import { HAS_METRIC } from './lexicon';
import type { MatchReport, ScanReport, ScanStop } from './types';

/* A recruiter does not read a resume, they scan it. Eye-tracking studies put the first pass at roughly 6–10 seconds,
   following a fixed path: name and title, then the latest role, the one before it, education, and a glance at skills.
   This models that path and reports what it would actually catch, and what slips past. */

export const SCAN_SECONDS = 7;
const clip = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const first = (s: string, n: number) => s.split(/\s+/).filter(Boolean).slice(0, n).join(' ');

export function recruiterScan(resume: Resume, match?: MatchReport | null): ScanReport {
  const f = extractFacts(resume), p = resume.profile;
  const stops: ScanStop[] = [];
  const seenParts: string[] = [];
  const overlooked: ScanReport['overlooked'] = [];
  const strengths: string[] = [], weaknesses: string[] = [], tips: string[] = [];
  let order = 0;
  const add = (seconds: number, area: string, saw: string, note: string, level: ScanStop['level']) => { stops.push({ order: ++order, seconds, area, saw, note, level }); seenParts.push(saw); };

  /* 1. Name and title */
  const role = p.title.trim() || p.headline.trim() || f.experience[0]?.title || '';
  if (p.fullName.trim() && (p.title.trim() || p.headline.trim())) add(0.8, 'Name and title', `${p.fullName} · ${role}`, 'Clear at a glance: who you are and what role you want.', 'strong');
  else if (p.fullName.trim()) { add(0.8, 'Name and title', p.fullName, 'No job title under your name, so the recruiter must work out your field from the text below.', 'weak'); weaknesses.push('No job title under your name.'); tips.push('Add the role you want as a short title under your name.'); }
  else { add(0.8, 'Name and title', '(nothing)', 'No name found at the top.', 'missed'); weaknesses.push('No name at the top.'); }

  /* 2. Summary: only the opening is read */
  const sumWords = wordCount(f.summary);
  if (sumWords) {
    const lead = first(f.summary, 14);
    const strong = /\d/.test(first(f.summary, 25)) || sumWords <= 70;
    add(0.9, 'Summary (opening line only)', `“${lead}…”`, strong ? 'The first line is read; the rest is skipped. Yours is short enough to land.' : 'The first line is read; the rest is skipped. Yours is long and opens vaguely.', strong ? 'ok' : 'weak');
    if (sumWords > 80) { weaknesses.push('The summary is too long to be read.'); tips.push('Cut the summary to 2–3 sentences. Put the strongest fact in the first line.'); }
  } else { add(0.5, 'Summary', '(none)', 'No summary: nothing frames the rest for the recruiter.', 'missed'); weaknesses.push('No summary.'); }

  /* 3. Latest role: title, employer, dates and the first two bullets */
  const e1 = f.experience[0];
  if (e1) {
    const b1 = e1.bullets.slice(0, 2);
    const metricSeen = b1.some((b) => HAS_METRIC.test(b));
    const dates = e1.range.ok;
    add(1.8, 'Latest role', `${[e1.title, e1.org].filter(Boolean).join(' at ') || 'Untitled role'}${e1.when ? ` · ${e1.when}` : ''}${b1.length ? ` — “${clip(b1[0], 70)}”` : ''}`,
      !dates ? 'Dates are unclear, so tenure cannot be judged at a glance.' : metricSeen ? 'Title, dates and a measurable result are visible straight away.' : 'Title and dates are visible, but the first bullets show no result.', !dates ? 'weak' : metricSeen ? 'strong' : 'ok');
    if (metricSeen) strengths.push('A measurable result sits in the first bullets of your latest role.');
    else { weaknesses.push('The first bullets of your latest role carry no numbers.'); tips.push('Lead each role with its most measurable achievement.'); }
    if (!dates) { weaknesses.push('Dates on the latest role cannot be read.'); tips.push('Use “Mon YYYY – Mon YYYY” for every role.'); }
    e1.bullets.slice(2).forEach((b) => { if (HAS_METRIC.test(b)) overlooked.push({ text: clip(b, 110), why: `A quantified achievement in “${e1.title || 'your latest role'}” sits below the first two bullets, where a quick scan stops.` }); });
  } else { add(1.8, 'Latest role', '(none found)', 'No work experience was found to scan.', 'missed'); weaknesses.push('No work experience found.'); }

  /* 4. Previous role: title and employer only */
  const e2 = f.experience[1];
  if (e2) {
    add(1.0, 'Previous role', `${[e2.title, e2.org].filter(Boolean).join(' at ') || 'Untitled role'}${e2.when ? ` · ${e2.when}` : ''}`, 'Only the title, employer and dates are taken in. The bullets are not read.', 'ok');
    f.experience.slice(1).forEach((e) => e.bullets.forEach((b) => { if (HAS_METRIC.test(b) && overlooked.length < 6) overlooked.push({ text: clip(b, 110), why: `A strong line in an earlier role (“${e.title || e.org}”) is outside the scan path.` }); }));
  }

  /* 5. Education */
  const edu = f.education[0];
  add(0.7, 'Education', edu ? `${[edu.title, edu.org].filter(Boolean).join(' · ')}` : '(none)', edu ? 'A single glance: level and institution.' : 'No education found. Recruiters look for it to tick a box.', edu ? 'ok' : 'weak');
  if (!edu) weaknesses.push('No education section.');

  /* 6. Skills: first handful only */
  const shown = f.skills.slice(0, 8), hidden = f.skills.slice(8);
  if (f.skills.length) {
    add(1.0, 'Skills', shown.join(' · '), hidden.length ? `Only the first ${shown.length} are noticed. ${hidden.length} more are lost in the list.` : 'The whole list fits in one glance.', hidden.length > 8 ? 'weak' : 'ok');
    if (hidden.length) overlooked.push({ text: hidden.slice(0, 6).join(', ') + (hidden.length > 6 ? '…' : ''), why: 'Skills past the first eight are rarely seen. Put the ones the job asks for first.' });
    if (f.skills.length >= 8 && f.skills.length <= 22) strengths.push('Skills are listed in a scannable range.');
  } else { add(1.0, 'Skills', '(none)', 'No skills to scan.', 'missed'); weaknesses.push('No skills section.'); }

  /* What the advert wants, if one was pasted: is it inside the scanned area? */
  if (match) {
    const scanned = seenParts.join(' ').toLowerCase();
    const required = match.matched.filter((m) => m.required && !scanned.includes(m.term.toLowerCase())).slice(0, 4);
    if (required.length) { overlooked.push({ text: required.map((m) => m.term).join(', '), why: 'You have these and the advert requires them, but they are not in the part a recruiter reads first.' }); tips.push(`Bring ${required.map((m) => m.term).join(', ')} into your summary or first bullets.`); }
  }

  /* Structure and density */
  const nB = f.bullets.length;
  const long = f.bullets.filter((b) => wordCount(b.text) > 32).length;
  if (long) { weaknesses.push(`${long} bullet${long > 1 ? 's' : ''} run longer than two lines and will be skipped.`); tips.push('Keep bullets to one or two lines.'); }
  if (nB && f.bullets.filter((b) => HAS_METRIC.test(b.text)).length / nB >= 0.4) strengths.push('Most bullets are quantified, which recruiters remember.');
  if (resume.style.template === 'classic') strengths.push('One-column layout reads in the order a recruiter expects.');
  else if (resume.style.template === 'sidebar') { weaknesses.push('The sidebar splits attention between two columns.'); tips.push('Put your strongest content in the main column; the eye goes there first.'); }
  const order2 = resume.sections.map(kind);
  if (order2.indexOf('education') >= 0 && order2.indexOf('experience') > order2.indexOf('education') && f.experience.length) { weaknesses.push('Education comes before experience, pushing your work history down.'); tips.push('Move Experience above Education.'); }
  if (p.email.trim() && p.phone.trim()) strengths.push('Contact details are present and easy to find.'); else { weaknesses.push('Contact details are incomplete.'); tips.push('Add both email and phone.'); }
  if (f.experience.some((e) => e.bullets.length > 6)) { weaknesses.push('Some roles have more than six bullets, which buries the best ones.'); tips.push('Cut each role to its top 3–5 bullets.'); }

  const total = stops.reduce((a, s) => a + s.seconds, 0);
  const seenWords = wordCount(seenParts.join(' '));
  const seenPercent = Math.min(100, Math.round((100 * seenWords) / Math.max(1, f.words)));
  const bad = stops.filter((s) => s.level === 'weak' || s.level === 'missed').length;
  const good = stops.filter((s) => s.level === 'strong').length;
  const verdict = bad >= 3 ? 'A recruiter would struggle to see why you fit. Key facts are missing from the scan path.' : bad >= 1 ? 'A recruiter gets the basics, but there are weak spots in the first seconds.' : good >= 2 ? 'Strong first impression: the key facts are where a recruiter looks.' : 'A clear, readable first impression. Stronger results up top would lift it.';
  return { totalSeconds: Math.round(total * 10) / 10, seenPercent, verdict, stops, strengths: [...new Set(strengths)].slice(0, 5), weaknesses: [...new Set(weaknesses)].slice(0, 6), overlooked: overlooked.slice(0, 5), tips: [...new Set(tips)].slice(0, 5) };
}
