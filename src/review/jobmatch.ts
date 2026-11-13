import type { Resume } from '../model/types';
import { extractFacts, firstWord } from './facts';
import { totalMonths } from './dates';
import type { MatchReport, MatchTerm } from './types';

/* Compares a resume with a pasted job advert. It finds the skills and keywords the ad asks for, checks each one
   against the resume, and explains what is missing, what is hidden, and what to move up. */

type Kind = MatchTerm['kind'];

/** "canonical|alias|alias". Aliases are matched as whole words. */
const DICT: Record<Exclude<Kind, 'keyword'>, string[]> = {
  technical: [
    'Python', 'Java', 'JavaScript|js', 'TypeScript', 'C#|csharp', 'C++|cpp', 'Golang', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'SQL', 'NoSQL', 'HTML', 'CSS',
    'React|reactjs|react.js', 'Angular', 'Vue|vue.js|vuejs', 'Node.js|nodejs', 'Django', 'Flask', 'Spring Boot|spring', '.NET|dotnet', 'REST|restful|rest api', 'GraphQL', 'API|apis', 'Microservices',
    'Machine Learning|ml', 'Deep Learning', 'NLP|natural language processing', 'Data Analysis|data analytics', 'Data Science', 'Data Engineering', 'Data Visualization|data visualisation', 'ETL', 'Statistics|statistical analysis', 'Big Data',
    'CI/CD|continuous integration', 'DevOps', 'Agile', 'Scrum', 'Kanban', 'Test Automation|automated testing', 'Unit Testing', 'QA|quality assurance', 'Cybersecurity|information security', 'Networking', 'Linux', 'Embedded Systems', 'PLC', 'Cloud Computing|cloud',
    'AutoCAD', 'SolidWorks', 'CAD', 'Lean Manufacturing|lean', 'Six Sigma', 'Kaizen', '5S', 'TPM', 'ISO 9001', 'ISO 14001', 'IATF 16949', 'Supply Chain', 'Procurement', 'Logistics', 'Inventory Management', 'Forecasting',
    'Budgeting', 'Financial Reporting', 'Financial Analysis', 'Accounting', 'Auditing|audit', 'Taxation|tax', 'IFRS|mfrs', 'Accounts Payable', 'Accounts Receivable', 'Payroll', 'Reconciliation', 'Cost Control',
    'Recruitment', 'Talent Acquisition', 'Employee Engagement', 'Onboarding', 'Performance Management', 'SEO', 'SEM', 'PPC', 'Content Marketing', 'Social Media', 'Email Marketing', 'Copywriting', 'Brand Management', 'Market Research', 'Digital Marketing',
    'Sales', 'Business Development', 'Account Management', 'Customer Service', 'Customer Success', 'Project Management', 'Product Management', 'Stakeholder Management', 'Risk Management', 'Compliance', 'Change Management', 'Process Improvement', 'Root Cause Analysis',
    'Data Modelling|data modeling', 'UX Design|ux', 'UI Design|ui', 'User Research', 'Wireframing', 'Prototyping', 'Patient Care', 'Lesson Planning', 'Curriculum Development',
  ],
  tool: [
    'AWS|amazon web services', 'Azure', 'GCP|google cloud', 'Docker', 'Kubernetes|k8s', 'Terraform', 'Jenkins', 'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Excel|ms excel|microsoft excel', 'Power BI|powerbi', 'Tableau',
    'Power Query', 'VBA', 'SAP', 'Oracle', 'Salesforce', 'HubSpot', 'Workday', 'PowerPoint|ms powerpoint', 'Microsoft Office|ms office', 'Google Analytics', 'Photoshop', 'Illustrator', 'Figma', 'Sketch', 'Canva', 'MySQL',
    'PostgreSQL|postgres', 'MongoDB', 'Redis', 'Snowflake', 'BigQuery', 'Spark|apache spark', 'Hadoop', 'Airflow', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'scikit-learn|sklearn', 'MATLAB', 'SAS', 'SPSS', 'Power Automate',
    'Power Apps', 'SharePoint', 'QuickBooks', 'Xero', 'ERP', 'WMS', 'Postman', 'Selenium', 'Cypress', 'Jest',
  ],
  soft: [
    'Leadership', 'Communication', 'Teamwork|collaboration', 'Problem Solving|problem-solving', 'Critical Thinking', 'Time Management', 'Adaptability', 'Negotiation', 'Presentation', 'Mentoring|coaching',
    'Decision Making', 'Creativity', 'Attention to Detail', 'Interpersonal',
  ],
};

/** If the resume has the key, the person very likely also has each of the values. */
const IMPLIES: Record<string, string[]> = {
  react: ['JavaScript'], angular: ['TypeScript', 'JavaScript'], vue: ['JavaScript'], 'node.js': ['JavaScript'], django: ['Python'], flask: ['Python'], 'spring boot': ['Java'],
  mysql: ['SQL'], postgresql: ['SQL'], oracle: ['SQL'], pandas: ['Python', 'Data Analysis'], numpy: ['Python'], tensorflow: ['Python', 'Machine Learning'], pytorch: ['Python', 'Machine Learning'], 'scikit-learn': ['Python', 'Machine Learning'],
  'power bi': ['Data Visualization', 'Data Analysis'], tableau: ['Data Visualization', 'Data Analysis'], scrum: ['Agile'], kanban: ['Agile'], kubernetes: ['Docker'], jenkins: ['CI/CD'], github: ['Git'], gitlab: ['Git'],
  aws: ['Cloud Computing'], azure: ['Cloud Computing'], gcp: ['Cloud Computing'], 'six sigma': ['Process Improvement'], kaizen: ['Process Improvement', 'Lean Manufacturing'], excel: ['Microsoft Office'], powerpoint: ['Microsoft Office'],
  selenium: ['Test Automation'], cypress: ['Test Automation'], jest: ['Unit Testing'], seo: ['Digital Marketing'], ppc: ['Digital Marketing'], 'google analytics': ['Data Analysis'], quickbooks: ['Accounting'], xero: ['Accounting'],
};

const STOP = new Set(('a an and are as at be been but by can do for from has have in into is it its of on or our out over per so than that the their them then there these they this those to up us was we were what when where which who will with within you your yours across about above after also any all both each more most other such very able senior junior lead ' +
  'experience work working works team teams role roles job candidate candidates looking responsibilities requirements required requirement preferred skills skill knowledge years year strong good excellent ability including related relevant etc must should would could plus well new using use used based join company position opportunity apply applying benefits salary time ' +
  'successful proven proficient familiar understanding understand demonstrated demonstrate high level highly day days week month months one two three need needs needed seeking we’re you’ll responsible support provide ensure help make like etc degree bachelor diploma master qualification qualifications').split(/\s+/));
const NOT_ACRONYM = new Set(['AND', 'THE', 'FOR', 'USA', 'PDF', 'KL', 'PJ', 'JB', 'EPF', 'SOCSO', 'EIS', 'FAQ', 'OK', 'CV', 'AM', 'PM', 'MD', 'HR', 'IT', 'ASAP', 'EOE', 'ETC', 'WFH', 'PTE', 'LTD', 'SDN', 'BHD']);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stem = (w: string) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w.length > 3 ? w.replace(/s$/, '') : w);
const words = (s: string) => s.toLowerCase().match(/[a-z0-9][a-z0-9+#.'’-]*[a-z0-9+#]|[a-z0-9]/g) ?? [];

function variantRegex(v: string): RegExp {
  return new RegExp(`(?<![a-z0-9+#.])${esc(v.toLowerCase())}(?:s)?(?![a-z0-9+#])`, 'g');
}
const countIn = (text: string, variants: string[]) => variants.reduce((n, v) => n + (text.match(variantRegex(v))?.length ?? 0), 0);

interface Candidate { term: string; kind: Kind; variants: string[]; stems?: string }

const dictCandidates: Candidate[] = (Object.entries(DICT) as [Exclude<Kind, 'keyword'>, string[]][]).flatMap(([kind, list]) =>
  list.map((row) => { const [term, ...alias] = row.split('|'); return { term, kind, variants: [term, ...alias].map((x) => x.toLowerCase()) }; }));

function adSections(ad: string) {
  let pref = false;
  const req: string[] = [], opt: string[] = [];
  for (const raw of ad.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.length < 60 && (/:$/.test(line) || line === line.toUpperCase() || !/[.,;]/.test(line));
    if (heading && /nice to have|preferred|bonus|advantage|good to have|desirable|a plus|pluses/i.test(line)) pref = true;
    else if (heading && /requirement|qualification|responsibilit|what you|you have|must|essential|about you|who you|the role/i.test(line)) pref = false;
    (pref || /\b(?:preferred|advantage|nice to have|bonus|a plus|good to have|desirable)\b/i.test(line) ? opt : req).push(line);
  }
  return { req: req.join('\n').toLowerCase(), opt: opt.join('\n').toLowerCase() };
}

function extractTerms(ad: string): { term: string; kind: Kind; variants: string[]; required: boolean; count: number }[] {
  const { req, opt } = adSections(ad);
  const all = (req + '\n' + opt);
  const out: ReturnType<typeof extractTerms> = [];
  const taken = new Set<string>();
  for (const c of dictCandidates) {
    const nReq = countIn(req, c.variants), nOpt = countIn(opt, c.variants);
    if (!nReq && !nOpt) continue;
    // short ambiguous aliases only count when written in the ad's own case, e.g. "ml", "ui", "ux", "cloud" are fine; "lean", "audit", "tax", "spring", "sales" are real words and fine too.
    out.push({ term: c.term, kind: c.kind, variants: c.variants, required: nReq > 0, count: nReq + nOpt });
    c.variants.forEach((v) => taken.add(v));
  }
  const covered = (w: string) => [...taken].some((t) => t.split(/\s+/).includes(w));

  /* Acronyms such as CRM, KPI, GST, MFRS that are not in the dictionary */
  const acr = new Map<string, number>();
  for (const m of ad.matchAll(/\b[A-Z][A-Z0-9]{1,5}\b/g)) if (!NOT_ACRONYM.has(m[0]) && !/^\d+$/.test(m[0]) && ![...taken].some((t) => t === m[0].toLowerCase() || t.split(/[^a-z0-9+#.]+/).includes(m[0].toLowerCase()))) acr.set(m[0], (acr.get(m[0]) ?? 0) + 1);
  for (const [a, n] of acr) out.push({ term: a, kind: 'keyword', variants: [a.toLowerCase()], required: countIn(req, [a.toLowerCase()]) > 0, count: n });

  /* Repeated phrases: two- and three-word runs with no stop words at the edges */
  const tokens = words(all).map((w) => w.replace(/[.'’-]+$/g, ''));
  const grams = new Map<string, { n: number; raw: string }>();
  const generic = (w: string) => STOP.has(w) || w.length < 3 || /^\d/.test(w);
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const g = tokens.slice(i, i + n);
      if (generic(g[0]) || generic(g[n - 1]) || g.some((w) => w.length < 2) || /^(full|part) time$/.test(g.join(' '))) continue;
      if (n === 1 && (covered(g[0]) || g[0].length < 5)) continue;
      if (n > 1 && g.slice(1, -1).some((w) => /^\d/.test(w))) continue;
      const key = g.map(stem).join(' ');
      const e = grams.get(key) ?? { n: 0, raw: g.join(' ') };
      e.n++; grams.set(key, e);
    }
  }
  const chosen = [...grams.entries()].filter(([k, v]) => v.n >= (k.includes(' ') ? 2 : 3) && !k.split(' ').every((w) => covered(w)))
    .sort((a, b) => b[1].n * (1 + 0.5 * a[0].split(' ').length) - a[1].n * (1 + 0.5 * b[0].split(' ').length)).slice(0, 40);
  const longer = chosen.map(([k]) => k);
  for (const [k, v] of chosen) {
    if (longer.some((o) => o !== k && o.includes(k) && (grams.get(o)!.n >= v.n))) continue;   // keep the longest phrase
    out.push({ term: v.raw, kind: 'keyword', variants: [], required: countIn(req, [v.raw]) > 0 || countIn(req, [v.raw.replace(/\s+/g, ' ')]) > 0 || !countIn(opt, [v.raw]), count: v.n });
  }
  return out;
}

const LEVELS: [RegExp, number, string][] = [[/ph\.?d|doctorate/i, 4, 'PhD'], [/master|msc|m\.sc|mba|m\.eng/i, 3, "Master's"], [/bachelor|b\.?sc|b\.?eng|bba|\bba\b|degree/i, 2, "Bachelor's degree"], [/diploma/i, 1, 'Diploma'], [/spm|stpm|certificate|sijil|a-?level/i, 0.5, 'Certificate / school-leaving']];
const levelOf = (text: string): { n: number; name: string } => { for (const [re, n, name] of LEVELS) if (re.test(text)) return { n, name }; return { n: 0, name: '' }; };

export function matchJob(resume: Resume, ad: string, now = new Date()): MatchReport | null {
  const text = ad.trim();
  if (text.length < 20) return null;
  const f = extractFacts(resume);
  const resumeLow = f.allText.toLowerCase();
  const stemKey = (x: string) => ' ' + words(x).map(stem).join(' ') + ' ';
  const resumeStem = stemKey(f.allText);
  const expText = f.experience.map((e) => e.text).concat(f.other.map((e) => e.text), [f.summary]).join('\n').toLowerCase();
  const skillsText = f.skillsSectionText.toLowerCase();

  const has = (t: { variants: string[]; term: string }, low?: string) =>
    t.variants.length ? countIn(low ?? resumeLow, t.variants) > 0 : (low === undefined ? resumeStem : stemKey(low)).includes(stemKey(t.term));

  const terms = extractTerms(text);
  const matched: MatchTerm[] = [], missing: MatchTerm[] = [];
  for (const t of terms) (has(t) ? matched : missing).push({ term: t.term, kind: t.kind, required: t.required, count: t.count });

  /* Implied skills: you list React, the ad wants JavaScript */
  const unmentioned: MatchReport['unmentioned'] = [];
  const impliedFrom = (term: string) => Object.entries(IMPLIES).find(([k, vals]) => vals.some((v) => v.toLowerCase() === term.toLowerCase()) && (countIn(resumeLow, [k]) > 0));
  const stillMissing = missing.filter((m) => {
    const hit = impliedFrom(m.term);
    if (!hit) return true;
    unmentioned.push({ term: m.term, why: `Your resume mentions ${dictCandidates.find((c) => c.variants.includes(hit[0]))?.term ?? hit[0]}, which means you almost certainly know ${m.term}, but the word “${m.term}” never appears.`, fix: `Write “${m.term}” explicitly in your Skills section (and in a bullet if true), because ATS filters look for the exact word.` });
    return false;
  });

  /* Skills used in a job but missing from the Skills section */
  for (const t of terms) {
    if (t.kind !== 'technical' && t.kind !== 'tool') continue;
    if (countIn(expText, t.variants) > 0 && countIn(skillsText, t.variants) === 0) {
      unmentioned.push({ term: t.term, why: `You use ${t.term} in your experience, but it is not in your Skills section.`, fix: `Add “${t.term}” to Skills. Recruiters and ATS filters scan that section first.` });
    }
  }

  /* Experience and qualifications */
  const gaps: MatchReport['gaps'] = [];
  const months = totalMonths(f.experience.map((e) => e.range), now);
  const years = months / 12;
  const ym = text.match(/(\d{1,2})\s*(?:\+|-\s*\d{1,2}|to\s*\d{1,2})?\s*(?:years?|yrs?)\b[^.\n]{0,40}?(?:experience|exp)/i) ?? text.match(/(?:minimum|at least|min\.?)\s*(?:of\s*)?(\d{1,2})\s*(?:years?|yrs?)/i);
  if (ym) {
    const need = +ym[1];
    if (years + 0.25 < need) gaps.push({ severity: 'warn', title: `Asks for ${need}+ years of experience`, detail: `Your dated experience adds up to about ${years.toFixed(1)} years. Emphasise relevant projects, internships and depth of impact, and do not hide the gap. A strong cover note can bridge ${(need - years).toFixed(1)} years.` });
    else if (!new RegExp(`\\b${Math.floor(years)}\\+?\\s*(years?|yrs?)\\b`, 'i').test(f.summary) && !/\b\d+\+?\s*(years?|yrs?)\b/i.test(f.summary)) {
      unmentioned.push({ term: `${need}+ years of experience`, why: `The ad asks for ${need}+ years and you have about ${years.toFixed(1)}, but your summary never says so.`, fix: `Open your summary with “${Math.max(need, Math.floor(years))}+ years of experience in …”.` });
    }
  }
  const adLevel = levelOf(text.match(/[^\n.]*(?:degree|bachelor|diploma|master|phd|doctorate|certificate|spm)[^\n.]*/i)?.[0] ?? '');
  const myLevel = levelOf(f.education.map((e) => e.text).join('\n') + '\n' + resumeLow);
  if (adLevel.n && !f.education.length) gaps.push({ severity: 'warn', title: `Asks for ${adLevel.name}`, detail: 'There is no education section. Add your qualification, even if it is still in progress (“Expected 2026”).' });
  else if (adLevel.n > myLevel.n) gaps.push({ severity: 'warn', title: `Asks for ${adLevel.name}`, detail: `Your highest qualification reads as ${myLevel.name || 'unclear'}. If you have equivalent experience or professional certificates, say so explicitly.` });

  const seniorAd = /\b(senior|lead|principal|head of|manager|director)\b/i.test(text.split('\n').slice(0, 3).join(' ') || text);
  const myTitles = f.experience.map((e) => e.title).join(' ') + ' ' + resume.profile.title + ' ' + resume.profile.headline;
  if (seniorAd && !/\b(senior|lead|principal|head|manager|director|chief|vp)\b/i.test(myTitles)) gaps.push({ severity: 'warn', title: 'A senior role', detail: 'None of your job titles signal seniority. Show scope: people led, budgets owned, decisions you made, projects you drove end to end.' });
  if (/\b(?:lead|manage|mentor|supervis)\w*\s+(?:a\s+|the\s+)?(?:team|people|staff|juniors?)/i.test(text) && !f.bullets.some((b) => /\b(led|managed|mentored|supervised|coached|headed)\b|team of \d/i.test(b.text))) {
    gaps.push({ severity: 'warn', title: 'Leadership is expected', detail: 'The ad wants someone who leads people, but no bullet shows you doing it. Add team size and what the team achieved under you.' });
  }
  const certRe = /\b(PMP|CPA|ACCA|CFA|CISSP|CCNA|CCNP|ITIL|PRINCE2|CMA|CIMA|MICPA|CSM|AWS Certified[A-Za-z -]*|Azure [A-Z]{2}-\d{3}|Six Sigma (?:Green|Black|Yellow) Belt|Scrum Master|chartered accountant|professional engineer|P\.?Eng|driving licen[sc]e|CompTIA \w+)\b/gi;
  for (const c of new Set([...text.matchAll(certRe)].map((m) => m[0].trim()))) {
    if (!resumeLow.includes(c.toLowerCase())) gaps.push({ severity: 'warn', title: `Certification: ${c}`, detail: `The ad mentions ${c} and your resume does not. If you hold it, add it under Certifications. If you are working toward it, write “${c} (in progress, expected …)”.` });
  }
  for (const l of new Set([...text.matchAll(/\b(mandarin|cantonese|bahasa (?:malaysia|melayu)|malay|tamil|japanese|korean|thai|arabic|hindi|spanish|french|german)\b/gi)].map((m) => m[0].toLowerCase()))) {
    if (!resumeLow.includes(l.split(' ')[0]) && !f.languages.some((x) => l.includes(x.toLowerCase()))) gaps.push({ severity: 'warn', title: `Language: ${l.replace(/\b\w/g, (c) => c.toUpperCase())}`, detail: 'The ad mentions this language, and your resume does not list it. Add it under Languages with your level if you speak it.' });
  }
  const eng = /\b(fluent|proficien\w*|strong)\b[^.\n]{0,30}\benglish\b|\benglish\b[^.\n]{0,30}\b(fluent|proficien\w*|written|spoken)\b/i.test(text);
  if (eng && !/english/i.test(resumeLow)) gaps.push({ severity: 'tip', title: 'English proficiency', detail: 'The ad asks for English; your resume does not mention it. Add English to Languages, or evidence of using it at work.' });
  for (const line of new Set(text.split(/\r?\n/).filter((l) => /(?:must|need to|required to|should)\b[^.]{0,50}\b(?:reside|based in|relocat|citizen|work permit|visa|right to work|own transport|travel)|malaysian citizen|permanent resident/i.test(l)).map((l) => l.trim()))) {
    gaps.push({ severity: 'tip', title: 'Eligibility to check', detail: `“${line.slice(0, 140)}”. Make sure your location and status on the resume make this clear.` });
  }

  /* Experience worth moving up: bullets or entries that share the most terms with the ad */
  const scored = [...f.experience, ...f.other].flatMap((e) => e.bullets.map((b) => {
    const low = b.toLowerCase();
    const hits = terms.filter((t) => has(t, low));
    return { text: b, where: [e.title, e.org].filter(Boolean).join(' at '), terms: hits.map((h) => h.term), score: hits.reduce((a, h) => a + (h.required ? 2 : 1), 0) };
  })).filter((x) => x.score >= 2).sort((a, b) => b.score - a.score).slice(0, 6);

  /* Matched in Skills only, never proven */
  const unproven = terms.filter((t) => (t.kind === 'technical' || t.kind === 'tool') && countIn(skillsText, t.variants) > 0 && countIn(expText, t.variants) === 0).slice(0, 4);
  for (const u of unproven) gaps.push({ severity: 'tip', title: `${u.term} is listed but not proven`, detail: `You list ${u.term}, but no job or project shows it in use. Add one bullet that uses it, because recruiters trust evidence more than a list.` });

  const weight = (m: MatchTerm) => (m.kind === 'soft' ? 0.5 : 1) * (m.required ? 1 : 0.5);
  const sum = (xs: MatchTerm[]) => xs.reduce((a, m) => a + weight(m), 0);
  const total = sum(matched) + sum(missing), reqM = matched.filter((m) => m.required), reqAll = [...reqM, ...missing.filter((m) => m.required)];
  const ranked = (xs: MatchTerm[]) => xs.sort((a, b) => Number(b.required) - Number(a.required) || b.count - a.count);
  const miss = stillMissing;
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';

  return {
    percent: total ? Math.round((100 * sum(matched)) / total) : 0,
    requiredPercent: reqAll.length ? Math.round((100 * sum(reqM)) / sum(reqAll)) : 0,
    matched: ranked(matched),
    missingTechnical: ranked(miss.filter((m) => m.kind === 'technical' || m.kind === 'tool')),
    missingKeywords: ranked(miss.filter((m) => m.kind === 'keyword' || m.kind === 'soft')).slice(0, 18),
    highlight: scored.map(({ text, where, terms }) => ({ text, where, terms })),
    unmentioned: unmentioned.filter((u, i, a) => a.findIndex((x) => x.term === u.term) === i),
    gaps,
    title: firstLine.length <= 80 && firstWord(firstLine) ? firstLine : '',
  };
}
