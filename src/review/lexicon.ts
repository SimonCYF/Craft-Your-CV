/* Word lists the reviewers use. Plain data: add to them freely. */

/** Strong opening verbs (past tense). Used to recognise good bullets. */
export const STRONG_VERBS = new Set((
  'achieved accelerated administered analysed analyzed architected assembled audited automated built calculated championed coached collaborated completed configured consolidated coordinated created cut debugged decreased delivered deployed designed developed directed doubled drove earned eliminated enabled engineered established evaluated exceeded executed expanded facilitated forecast founded generated grew guided identified implemented improved increased initiated innovated installed integrated introduced investigated launched led maintained managed mentored migrated minimised minimized modernised modernized negotiated onboarded optimised optimized orchestrated organised organized oversaw owned partnered planned presented prioritised prioritized processed produced programmed proposed prototyped published raised rebuilt recruited redesigned reduced refactored released remodelled replaced researched resolved restructured revamped reviewed saved scaled secured shipped simplified sold solved spearheaded standardised standardized streamlined strengthened supervised supported surpassed tested trained transformed troubleshot upgraded won wrote'
).split(' '));

/** Result words: a bullet that says what changed. */
export const RESULT_WORDS = /\b(increas|reduc|sav(?:ed|ing)|grew|grow|improv|boost|cut|doubl|tripl|generat|earn|win|won|exceed|surpass|accelerat|decreas|eliminat|streamlin|rais|gain|achiev|deliver(?:ed)? (?:ahead|on time|under))/i;

/** A figure: number, percentage, currency, multiplier, or a size/time quantity. */
export const HAS_METRIC = /(\d[\d,.]*\s?(%|x\b|k\b|m\b|million|billion|hours?|days?|weeks?|months?|users?|customers?|clients?|people|members|staff|units?|projects?|sites?|accounts?|leads?|orders?)|\b(RM|USD|SGD|MYR|EUR|GBP|US\$|S\$)\s?\d|[$£€¥]\s?\d|\b\d{2,}\b|%)/i;

export const WEAK_PHRASES: { re: RegExp; label: string }[] = [
  { re: /\bresponsible for\b/i, label: 'responsible for' },
  { re: /\bduties (?:included|include)\b/i, label: 'duties included' },
  { re: /\bin charge of\b/i, label: 'in charge of' },
  { re: /\b(?:helped|help|assisted|assist)(?: with| in| to)?\b/i, label: 'helped / assisted with' },
  { re: /\bworked (?:on|with)\b/i, label: 'worked on / with' },
  { re: /\binvolved in\b/i, label: 'involved in' },
  { re: /\bparticipated in\b/i, label: 'participated in' },
  { re: /\btasked with\b/i, label: 'tasked with' },
  { re: /\b(?:various|several|numerous|miscellaneous)\b/i, label: 'vague quantity (various, several…)' },
  { re: /\b(?:etc\.?|and so on|and more|stuff|things)\b/i, label: 'filler (etc., things…)' },
  { re: /\b(?:team player|hard-?working|results?-driven|detail-oriented|self-motivated|go-getter|dynamic|passionate|motivated individual|fast learner|quick learner|think outside the box)\b/i, label: 'cliché' },
];

export const CLICHES = /\b(team player|hard-?working|results?-driven|detail-oriented|self-motivated|go-getter|dynamic|passionate|motivated individual|fast learner|quick learner|think(?:ing)? outside the box|excellent communication skills|proven track record|synergy|seasoned professional)\b/gi;

/** Gerund → strong past-tense verb, to turn "Responsible for managing X" into "Managed X". */
export const PAST: Record<string, string> = {
  managing: 'Managed', handling: 'Handled', leading: 'Led', developing: 'Developed', maintaining: 'Maintained', preparing: 'Prepared',
  coordinating: 'Coordinated', organizing: 'Organized', organising: 'Organised', supervising: 'Supervised', training: 'Trained', creating: 'Created',
  designing: 'Designed', building: 'Built', running: 'Ran', processing: 'Processed', monitoring: 'Monitored', reviewing: 'Reviewed',
  analyzing: 'Analyzed', analysing: 'Analysed', writing: 'Wrote', testing: 'Tested', planning: 'Planned', negotiating: 'Negotiated',
  resolving: 'Resolved', implementing: 'Implemented', delivering: 'Delivered', overseeing: 'Oversaw', ensuring: 'Ensured', providing: 'Provided',
  conducting: 'Conducted', performing: 'Performed', operating: 'Operated', updating: 'Updated', reporting: 'Reported', selling: 'Sold',
  recruiting: 'Recruited', installing: 'Installed', troubleshooting: 'Troubleshot', answering: 'Answered', serving: 'Served', teaching: 'Taught',
};

/** Frequent misspellings and wrong-case names on resumes. [pattern, correction] */
export const MISSPELLINGS: [RegExp, string][] = [
  [/\brecieve(d|s)?\b/gi, 'receive'], [/\bseperate(d|ly)?\b/gi, 'separate'], [/\bdefinate(ly)?\b/gi, 'definite'], [/\bexperiance(d|s)?\b/gi, 'experience'],
  [/\bmanagment\b/gi, 'management'], [/\bresponsable\b/gi, 'responsible'], [/\baccomodate\b/gi, 'accommodate'], [/\baccomodation\b/gi, 'accommodation'], [/\boccured\b/gi, 'occurred'],
  [/\boccurence\b/gi, 'occurrence'], [/\bneccessary\b/gi, 'necessary'], [/\bnecesary\b/gi, 'necessary'], [/\bsucessful(ly)?\b/gi, 'successful'],
  [/\bsuccesful(ly)?\b/gi, 'successful'], [/\bachive(d|ment|ments)?\b/gi, 'achieve'], [/\bacheive(d|ment|ments)?\b/gi, 'achieve'], [/\bcommunciation\b/gi, 'communication'], [/\bcommunciate\b/gi, 'communicate'],
  [/\bcomunication(s)?\b/gi, 'communication'], [/\bcomunicate\b/gi, 'communicate'], [/\bteh\b/gi, 'the'], [/\badress(es)?\b/gi, 'address'], [/\bbuisness\b/gi, 'business'], [/\bbussiness\b/gi, 'business'],
  [/\benviroment(s|al)?\b/gi, 'environment'], [/\bgovernement\b/gi, 'government'], [/\bknowlege\b/gi, 'knowledge'], [/\bknowledgable\b/gi, 'knowledgeable'],
  [/\bmaintainance\b/gi, 'maintenance'], [/\bmanger\b/gi, 'manager'], [/\bprofessionel\b/gi, 'professional'], [/\bprofesional\b/gi, 'professional'],
  [/\bproffesional\b/gi, 'professional'], [/\bpreformance\b/gi, 'performance'], [/\bperformence\b/gi, 'performance'], [/\bdevelopement\b/gi, 'development'],
  [/\bimplmement(ed)?\b/gi, 'implement'], [/\bimplimentation\b/gi, 'implementation'], [/\bcoordinater\b/gi, 'coordinator'], [/\bassitant\b/gi, 'assistant'],
  [/\bassistent\b/gi, 'assistant'],  [/\bcustomar(s)?\b/gi, 'customer'], [/\bcostumer(s)?\b/gi, 'customer'],
  [/\bcollegue(s)?\b/gi, 'colleague'], [/\bcolleage(s)?\b/gi, 'colleague'], [/\bfullfil(l|led|ment)?\b/gi, 'fulfil'], [/\bwich\b/gi, 'which'],
  [/\bthier\b/gi, 'their'], [/\bwould of\b/gi, 'would have'], [/\bcould of\b/gi, 'could have'], 
  [/\bprogramer(s)?\b/gi, 'programmer'], [/\bstrenght(s)?\b/gi, 'strength'], [/\bgrammer\b/gi, 'grammar'], [/\bcalender\b/gi, 'calendar'],
  [/\bcertifcate\b/gi, 'certificate'], [/\bcertficate\b/gi, 'certificate'], [/\bcertifcation\b/gi, 'certification'], [/\bpubliclly\b/gi, 'publicly'], [/\breceptionest\b/gi, 'receptionist'],
  [/\bliason\b/gi, 'liaison'], [/\bresturant\b/gi, 'restaurant'], [/\bimproovment\b/gi, 'improvement'], [/\bsuccessfull\b/gi, 'successful'],
  [/\bleaderhip\b/gi, 'leadership'], [/\bleadeship\b/gi, 'leadership'], [/\bcommited\b/gi, 'committed'], [/\bcommitee\b/gi, 'committee'], [/\bdependant on\b/gi, 'dependent on'],
];

/** Product names people write in the wrong case. [lowercase, correct] */
export const BRAND_CASE: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', linkedin: 'LinkedIn', github: 'GitHub', gitlab: 'GitLab', mysql: 'MySQL', postgresql: 'PostgreSQL',
  mongodb: 'MongoDB', powerpoint: 'PowerPoint', 'microsoft excel': 'Microsoft Excel', wordpress: 'WordPress', youtube: 'YouTube', photoshop: 'Photoshop',
  nodejs: 'Node.js', 'node.js': 'Node.js', reactjs: 'React', 'react.js': 'React', vuejs: 'Vue.js', html5: 'HTML5', css3: 'CSS3', ios: 'iOS',
  macos: 'macOS', iphone: 'iPhone', paypal: 'PayPal', tensorflow: 'TensorFlow', pytorch: 'PyTorch', salesforce: 'Salesforce', sap: 'SAP', sql: 'SQL', aws: 'AWS',
  api: 'API', apis: 'APIs', seo: 'SEO', crm: 'CRM', erp: 'ERP', ui: 'UI', ux: 'UX', php: 'PHP', css: 'CSS', html: 'HTML', json: 'JSON',
};

/** Sections that ATS software looks for, with the heading it expects. */
export const STANDARD_HEADINGS: [RegExp, string][] = [
  [/experience|employment|work history|career/i, 'Experience'], [/education|academic|qualification/i, 'Education'], [/skill|competenc|expertise/i, 'Skills'],
];

/** Odd glyphs that some ATS parsers drop or garble. */
export const ODD_GLYPHS = /[★☆✔✓✗✘➤➢►▶◆◇■□●○◼◻✦✪❖☎✆✉☑☐♦♥]|[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u;

/** Personal details that are better left off in most hiring markets. */
export const PERSONAL_INFO: { re: RegExp; label: string; severity: 'warn' | 'tip'; why: string }[] = [
  { re: /\b(date of birth|d\.?o\.?b\.?|born (?:on|in)|birth ?date|tarikh lahir)\b/i, label: 'Date of birth', severity: 'warn', why: 'Age is not a hiring criterion and can invite bias.' },
  { re: /\b(?:age|umur)\s*[:\-]\s*\d{2}\b/i, label: 'Age', severity: 'warn', why: 'Age is not a hiring criterion and can invite bias.' },
  { re: /\b(?:marital status|taraf perkahwinan|status perkahwinan)\b|\b(?:status|marital)\s*[:\-]\s*(?:single|married|divorced|widowed)\b/i, label: 'Marital status', severity: 'warn', why: 'Not relevant to the job; many employers are not allowed to ask.' },
  { re: /\b(gender|sex|jantina)\s*[:\-]\s*(male|female|lelaki|perempuan|m|f)\b/i, label: 'Gender', severity: 'warn', why: 'Not relevant to the job and can invite bias.' },
  { re: /\b(religion|agama)\s*[:\-]/i, label: 'Religion', severity: 'warn', why: 'Not relevant to the job and can invite bias.' },
  { re: /\b(race|ethnicity|bangsa)\s*[:\-]/i, label: 'Race / ethnicity', severity: 'warn', why: 'Not relevant to the job and can invite bias.' },
  { re: /\b(nationality|citizenship|warganegara)\s*[:\-]/i, label: 'Nationality', severity: 'tip', why: 'Only keep it if the job ad asks about work authorisation.' },
  { re: /\b(?:ic|nric|passport|ssn|social security|national id)\s*(?:no\.?|number|#)?\s*[:\-]?\s*[A-Z0-9][\d\- ]{6,}/i, label: 'ID or passport number', severity: 'warn', why: 'A privacy risk. Never put identity numbers on a resume.' },
  { re: /\b\d{6}-\d{2}-\d{4}\b/, label: 'IC number', severity: 'warn', why: 'A privacy risk. Never put identity numbers on a resume.' },
  { re: /\b(father|mother)(?:'s)? name\b/i, label: "Parent's name", severity: 'warn', why: 'Not relevant to the job.' },
  { re: /\b(expected|current) salary\b|\bsalary expectation\b/i, label: 'Salary', severity: 'tip', why: 'Leave salary for the application form or interview unless the ad asks.' },
  { re: /\breferences? (?:available )?(?:up)?on request\b|\breferences available\b/i, label: '"References available on request"', severity: 'tip', why: 'Employers assume this. Use the space for achievements.' },
  { re: /\b(?:no\.?|lot|unit|blok|block)\s*\d+[A-Za-z]?,?\s+(?:jalan|jln|lorong|lrg|taman|persiaran|street|st\.|road|rd\.|avenue|ave\.|lane)\b/i, label: 'Full home address', severity: 'tip', why: 'City and country are enough. A street address is a privacy risk.' },
];
