import type { Resume, TemplateId } from '@/model/types';
import { renderBold } from './bold';
import { renderClassic } from './classic';
import { renderSidebar } from './sidebar';
import type { RenderOptions } from './shared';

/* To add a template: write one render function (Resume in, HTML string out) and add it to this list. */
export const TEMPLATES: { id: TemplateId; name: string; description: string; /** how safely applicant-tracking systems read it */ ats: 'best' | 'caution'; render: (r: Resume, o?: RenderOptions) => string }[] = [
  { id: 'classic', name: 'Classic', description: 'One column on a white sheet with serif headings. Best for printing and job portals.', ats: 'best', render: renderClassic },
  { id: 'bold', name: 'Bold', description: 'Big name on a dark band, timeline, skill tabs. Works best as a website.', ats: 'caution', render: renderBold },
  { id: 'sidebar', name: 'Sidebar', description: 'Contact and skills in a coloured column, experience beside it.', ats: 'caution', render: renderSidebar },
];

export function renderResume(r: Resume, o: RenderOptions = {}): string {
  const t = TEMPLATES.find((x) => x.id === r.style.template) ?? TEMPLATES[0];
  return t.render(r, o);
}

export const COLOUR_PRESETS = [
  { label: 'Charcoal + yellow', main: '#262626', accent: '#f2d11a', soft: '#f5f5dc' },
  { label: 'Navy + sky', main: '#14213d', accent: '#8ecbff', soft: '#e9f0f6' },
  { label: 'Forest + mint', main: '#16302b', accent: '#7fe0b0', soft: '#e9f3ec' },
  { label: 'Plum + coral', main: '#3b1f2b', accent: '#ff9f80', soft: '#f7ece6' },
  { label: 'Burgundy + gold', main: '#4a1522', accent: '#f0c75e', soft: '#f6efe2' },
  { label: 'Teal + white', main: '#0f4c5c', accent: '#ffffff', soft: '#e6f0f2' },
  { label: 'Cream + red', main: '#f4efe6', accent: '#c8321f', soft: '#fbf8f2' },
  { label: 'Black + lime', main: '#111111', accent: '#c6f432', soft: '#f1f3ea' },
];
