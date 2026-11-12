import type { Resume, SectionType, TemplateId } from './types';
import { translateTo as tr } from '@/i18n';
import { DEFAULT_COLORS, newId, normalize } from './normalize';

/* Starting points. The example people are made up; their text shows what goes where. */

export function blankResume(template: TemplateId = 'bold', lang = 'en'): Resume {
  return normalize({
    version: 2,
    profile: { fullName: '', title: '', headline: '', summary: '', location: '', email: '', phone: '', photo: '', links: [], footerNote: '' },
    style: { template, colors: { ...DEFAULT_COLORS }, lang },
    sections: [
      { id: newId(), type: 'text', title: tr(lang, 'About'), note: '', lead: '', body: '', facts: [] },
      { id: newId(), type: 'timeline', title: tr(lang, 'Experience'), note: '', items: [{ title: '', org: '', when: '', where: '', body: '', points: [] }] },
      { id: newId(), type: 'tags', title: tr(lang, 'Skills'), note: '', groups: [{ name: '', items: [] }] },
      { id: newId(), type: 'timeline', title: tr(lang, 'Education'), note: '', items: [{ title: '', org: '', when: '', where: '', body: '', points: [] }] },
    ],
  });
}

export function exampleResume(template: TemplateId = 'bold', lang = 'en'): Resume {
  return normalize({
    version: 2,
    profile: {
      fullName: 'Alex Tan',
      title: 'Software Engineer',
      headline: 'Software Engineer (example resume)',
      summary: 'This is example text. Replace it with one or two sentences on what you do and who you do it for.',
      location: 'Kuala Lumpur, Malaysia',
      email: 'you@example.com',
      phone: '',
      photo: '',
      links: [{ label: 'GitHub', url: 'https://github.com' }, { label: 'LinkedIn', url: 'https://www.linkedin.com' }],
      footerNote: '',
    },
    style: { template, colors: { ...DEFAULT_COLORS }, lang },
    sections: [
      { id: newId(), type: 'text', title: tr(lang, 'About'), note: '', lead: 'Say what kind of work you do in one line.',
        body: 'Then add two or three sentences: the problems you like, the tools you reach for, and what you are looking for next.',
        facts: [{ label: 'Based in', value: 'Kuala Lumpur, Malaysia' }, { label: 'Now', value: 'Software Engineer, Example Sdn Bhd' }, { label: 'Languages', value: 'English, Malay, Mandarin' }] },
      { id: newId(), type: 'timeline', title: tr(lang, 'Experience'), note: 'Newest first.', items: [
        { title: 'Software Engineer', org: 'Example Sdn Bhd', when: '2023 – Present', where: 'Kuala Lumpur', body: '', points: [
          { title: 'Customer portal', desc: 'What it was, your part in it, and the result.', stack: 'Java · React · PostgreSQL', bullets: ['Start each bullet with what you did.', 'Numbers help: team size, users, time saved.'] },
          { title: 'Payments integration', desc: 'One to three sentences per project is enough.', stack: '' },
        ] },
        { title: 'Junior Developer', org: 'Sample Consulting', when: '2021 – 2023', where: 'Penang', body: '', points: [
          { title: 'Internal tools', desc: 'Describe the work in plain words a recruiter outside your field would follow.', stack: '' },
        ] },
      ] },
      { id: newId(), type: 'tags', title: tr(lang, 'Skills'), note: '', groups: [
        { name: 'Back end', items: ['Java', 'Spring Boot', 'Node.js'] },
        { name: 'Front end', items: ['React', 'TypeScript'] },
        { name: 'Data', items: ['PostgreSQL', 'MySQL'] },
      ] },
      { id: newId(), type: 'timeline', title: tr(lang, 'Education'), note: '', items: [
        { title: 'Bachelor of Computer Science', org: 'Example University', when: '2017 – 2021', where: '', body: 'Result or one notable thing (optional).', points: [] },
      ] },
      { id: newId(), type: 'links', title: tr(lang, 'Certifications'), note: '', items: [
        { name: 'Example Cloud Certification', url: 'https://example.com', meta: 'Exp: 2027', desc: '' },
        { name: 'Another Certificate', url: '', meta: '', desc: '' },
      ] },
      { id: newId(), type: 'levels', title: tr(lang, 'Languages'), note: '', items: [
        { name: 'English', label: 'Fluent', level: 5 }, { name: 'Malay', label: 'Fluent', level: 4 }, { name: 'Mandarin', label: 'Conversational', level: 3 },
      ] },
    ],
  });
}

/** Ready-made sections offered in "Add section". */
export const SECTION_CHOICES: { type: SectionType; title: string; hint: string }[] = [
  { type: 'text', title: 'About', hint: 'A paragraph about you, with optional quick facts.' },
  { type: 'timeline', title: 'Experience', hint: 'Jobs with dates, bullet points and projects.' },
  { type: 'timeline', title: 'Education', hint: 'Schools and qualifications with dates.' },
  { type: 'tags', title: 'Skills', hint: 'Groups of short labels.' },
  { type: 'levels', title: 'Languages', hint: 'Each language with a level out of five.' },
  { type: 'timeline', title: 'Co-curricular activities', hint: 'Clubs, societies, sports and volunteering, with dates.' },
  { type: 'links', title: 'Achievements', hint: 'Awards and results, each with an optional year and link.' },
  { type: 'links', title: 'Certifications', hint: 'Certificates with an optional expiry and link.' },
  { type: 'links', title: 'Projects', hint: 'Named projects with a description and link.' },
  { type: 'links', title: 'References', hint: 'People who can vouch for you, with their role and contact.' },
  { type: 'gallery', title: 'Gallery', hint: 'Pictures with captions: work samples, certificates, events.' },
];

/** Layouts offered for a custom section. */
export const LAYOUT_CHOICES: { type: SectionType; name: string; hint: string }[] = [
  { type: 'text', name: 'Paragraph', hint: 'A headline, a paragraph and quick facts' },
  { type: 'timeline', name: 'Dated entries', hint: 'Entries with dates and bullet points' },
  { type: 'links', name: 'Simple list', hint: 'Names with a note, description and link' },
  { type: 'tags', name: 'Labels', hint: 'Groups of short labels' },
  { type: 'levels', name: 'Levels', hint: 'Names with a level out of five' },
  { type: 'gallery', name: 'Pictures', hint: 'Images with captions' },
];
