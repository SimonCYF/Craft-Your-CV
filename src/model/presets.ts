import type { Resume, TemplateId } from './types';
import { DEFAULT_COLORS, newId } from './normalize';

/* Starting points. The example people are made up; their text shows what goes where. */

export function blankResume(template: TemplateId = 'bold'): Resume {
  return {
    version: 2,
    profile: { fullName: '', title: '', headline: '', summary: '', location: '', email: '', phone: '', photo: '', links: [], footerNote: '' },
    style: { template, colors: { ...DEFAULT_COLORS } },
    sections: [
      { id: newId(), type: 'text', title: 'About', note: '', lead: '', body: '', facts: [] },
      { id: newId(), type: 'timeline', title: 'Experience', note: '', items: [{ title: '', org: '', when: '', where: '', body: '', points: [] }] },
      { id: newId(), type: 'tags', title: 'Skills', note: '', groups: [{ name: '', items: [] }] },
      { id: newId(), type: 'timeline', title: 'Education', note: '', items: [{ title: '', org: '', when: '', where: '', body: '', points: [] }] },
    ],
  };
}

export function exampleResume(template: TemplateId = 'bold'): Resume {
  return {
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
    style: { template, colors: { ...DEFAULT_COLORS } },
    sections: [
      { id: newId(), type: 'text', title: 'About', note: '', lead: 'Say what kind of work you do in one line.',
        body: 'Then add two or three sentences: the problems you like, the tools you reach for, and what you are looking for next.',
        facts: [{ label: 'Based in', value: 'Kuala Lumpur, Malaysia' }, { label: 'Now', value: 'Software Engineer, Example Sdn Bhd' }, { label: 'Languages', value: 'English, Malay, Mandarin' }] },
      { id: newId(), type: 'timeline', title: 'Experience', note: 'Newest first.', items: [
        { title: 'Software Engineer', org: 'Example Sdn Bhd', when: '2023 – Present', where: 'Kuala Lumpur', body: '', points: [
          { title: 'Customer portal', desc: 'What it was, your part in it, and the result. Numbers help: team size, users, time saved.', stack: 'Java · React · PostgreSQL' },
          { title: 'Payments integration', desc: 'One to three sentences per project is enough.', stack: '' },
        ] },
        { title: 'Junior Developer', org: 'Sample Consulting', when: '2021 – 2023', where: 'Penang', body: '', points: [
          { title: 'Internal tools', desc: 'Describe the work in plain words a recruiter outside your field would follow.', stack: '' },
        ] },
      ] },
      { id: newId(), type: 'tags', title: 'Skills', note: '', groups: [
        { name: 'Back end', items: ['Java', 'Spring Boot', 'Node.js'] },
        { name: 'Front end', items: ['React', 'TypeScript'] },
        { name: 'Data', items: ['PostgreSQL', 'MySQL'] },
      ] },
      { id: newId(), type: 'timeline', title: 'Education', note: '', items: [
        { title: 'Bachelor of Computer Science', org: 'Example University', when: '2017 – 2021', where: '', body: 'Result or one notable thing (optional).', points: [] },
      ] },
      { id: newId(), type: 'links', title: 'Certifications', note: '', items: [
        { name: 'Example Cloud Certification', url: 'https://example.com', meta: 'Exp: 2027', desc: '' },
        { name: 'Another Certificate', url: '', meta: '', desc: '' },
      ] },
    ],
  };
}

/** Section kinds offered in "Add section", with ready-made titles. */
export const SECTION_CHOICES: { type: 'text' | 'timeline' | 'tags' | 'links'; title: string; hint: string }[] = [
  { type: 'text', title: 'About', hint: 'A paragraph, with optional quick facts. Also good for Summary or Objective.' },
  { type: 'timeline', title: 'Experience', hint: 'Dated entries with projects under each. Also good for Education or Volunteering.' },
  { type: 'tags', title: 'Skills', hint: 'Groups of short labels. Also good for Languages or Tools.' },
  { type: 'links', title: 'Certifications', hint: 'A list of named items with optional links. Also good for Projects or Awards.' },
];
