import type { Resume, Section } from '@/model/types';
import css from './classic.css?raw';
import { bullets, esc, ext, gallery, has, levels, page, paras, qr, safeUrl, withLogo, type RenderOptions } from './shared';

/* Classic: a traditional one-column resume on a white sheet. The safest choice for printing and for screening software. */

function section(s: Section): string {
  let inner = '';
  if (s.type === 'text') {
    const facts = s.facts.filter((f) => has(f.label) || has(f.value));
    inner = `${has(s.lead) ? `<p class="lead">${esc(s.lead)}</p>` : ''}${has(s.body) ? `<div class="text">${paras(s.body)}</div>` : ''}
      ${facts.length ? `<dl class="pairs">${facts.map((f) => `<div class="row"><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>` : ''}`;
  } else if (s.type === 'timeline') {
    inner = s.items.filter((i) => has(i.title) || has(i.org)).map((i) => {
      const pts = i.points.filter((p) => has(p.title) || has(p.desc) || p.bullets.some(has));
      return `<div class="row">
        <p class="when">${esc(i.when)}${has(i.where) ? `<span>${esc(i.where)}</span>` : ''}</p>
        <div>${withLogo(i.logo, `<h3>${esc(i.title)}</h3>${has(i.org) ? `<p class="org">${esc(i.org)}</p>` : ''}`)}${has(i.body) ? `<div class="body">${paras(i.body)}</div>` : ''}${bullets(i.bullets)}
        ${pts.length ? `<ul class="points">${pts.map((p) => `<li>${has(p.title) ? `<strong>${esc(p.title)}${has(p.desc) ? '.' : ''}</strong> ` : ''}${esc(p.desc)}${bullets(p.bullets)}${has(p.stack) ? `<span class="stack">${esc(p.stack)}</span>` : ''}</li>`).join('')}</ul>` : ''}</div>
      </div>`;
    }).join('');
  } else if (s.type === 'tags') {
    inner = `<dl class="pairs">${s.groups.filter((g) => g.items.length).map((g) => `<div class="row"><dt>${esc(g.name)}</dt><dd>${g.items.map(esc).join(', ')}</dd></div>`).join('')}</dl>`;
  } else if (s.type === 'levels') {
    inner = levels(s.items);
  } else if (s.type === 'gallery') {
    inner = `<div class="gap">${gallery(s.items)}</div>`;
  } else {
    inner = `<ul class="items">${s.items.filter((i) => has(i.name)).map((i) => {
      const url = safeUrl(i.url);
      return `<li><span class="name">${url ? `<a ${ext(url)}>${esc(i.name)}</a>` : esc(i.name)}</span><span class="meta">${esc(i.meta)}</span>${has(i.desc) ? `<span class="desc">${esc(i.desc)}</span>` : ''}</li>`;
    }).join('')}</ul>`;
  }
  return `<section class="sec" aria-labelledby="h-${s.id}"><h2 id="h-${s.id}">${esc(s.title)}</h2>${has(s.note) ? `<p class="note">${esc(s.note)}</p>` : ''}${inner}</section>`;
}

export function renderClassic(r: Resume, o: RenderOptions = {}): string {
  const p = r.profile;
  const links = p.links.filter((l) => has(l.label) && safeUrl(l.url));
  const contact = [
    has(p.email) ? `<li><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></li>` : '',
    has(p.phone) ? `<li><a href="tel:${esc(p.phone.replace(/[^+\d]/g, ''))}">${esc(p.phone)}</a></li>` : '',
    has(p.location) ? `<li>${esc(p.location)}</li>` : '',
    ...links.map((l) => `<li><a ${ext(safeUrl(l.url))}>${esc(l.label)}</a></li>`),
  ].join('');
  const body = `<main class="sheet">
  <header class="top${has(p.photo) || qr(r) ? ' has-photo' : ''}">
    <div>
      <h1>${esc(p.fullName || 'Your name')}</h1>
      ${has(p.headline || p.title) ? `<p class="title">${esc(p.headline || p.title)}</p>` : ''}
      ${contact ? `<ul class="contact">${contact}</ul>` : ''}
      ${has(p.summary) ? `<p class="summary">${esc(p.summary)}</p>` : ''}
    </div>
    ${has(p.photo) || qr(r) ? `<div class="top-side">${has(p.photo) ? `<img class="photo" src="${esc(p.photo)}" alt="Portrait of ${esc(p.fullName)}" width="800" height="1000">` : ''}${qr(r)}</div>` : ''}
  </header>
  ${r.sections.filter((s) => has(s.title)).map(section).join('\n')}
  <footer class="foot"><span>© <span data-year></span> ${esc(p.fullName)}</span><span>${esc(p.footerNote)}</span></footer>
</main>
<button class="print-btn" type="button" data-action="print">Save as PDF</button>`;
  return page(r, o, { fonts: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap', css, body });
}
