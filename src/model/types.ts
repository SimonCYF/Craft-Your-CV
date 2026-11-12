/* The shape of a resume. Every template draws from this and nothing else. */

export type TemplateId = 'bold' | 'classic' | 'sidebar';

export interface Colors { main: string; accent: string; soft: string }
export interface LinkItem { label: string; url: string }
export interface Fact { label: string; value: string }
export interface Point { title: string; desc: string; stack: string }
export interface TimelineItem { title: string; org: string; when: string; where: string; body: string; points: Point[] }
export interface TagGroup { name: string; items: string[] }
export interface ListItem { name: string; url: string; meta: string; desc: string }

interface SectionBase { id: string; title: string; note: string }
/** A paragraph, with optional short facts beside it (About, Summary, Objective). */
export interface TextSection extends SectionBase { type: 'text'; lead: string; body: string; facts: Fact[] }
/** Dated entries, each with optional sub-points (Experience, Education, Volunteering). */
export interface TimelineSection extends SectionBase { type: 'timeline'; items: TimelineItem[] }
/** Groups of short labels (Skills, Languages, Tools). */
export interface TagsSection extends SectionBase { type: 'tags'; groups: TagGroup[] }
/** A list of named things, each with an optional link (Certifications, Projects, Awards). */
export interface LinksSection extends SectionBase { type: 'links'; items: ListItem[] }

export type Section = TextSection | TimelineSection | TagsSection | LinksSection;
export type SectionType = Section['type'];

export interface Profile {
  fullName: string;
  title: string;      // short job title
  headline: string;   // one line under the name
  summary: string;    // one or two sentences
  location: string;
  email: string;
  phone: string;
  photo: string;      // data: URL (stored inside the file) or a web address
  links: LinkItem[];
  footerNote: string;
}

export interface Resume {
  version: 2;
  profile: Profile;
  style: { template: TemplateId; colors: Colors };
  sections: Section[];
}

/** A resume as kept in "My resumes" in this browser. */
export interface StoredResume { id: string; name: string; updatedAt: number; resume: Resume }
