import { fill, labelsFor, type Labels } from './labels';
import type { LevelsSection, Resume, Section, TagsSection } from '@/model/types';
import css from './sidebar.css?raw';
import { arrow, bullets, esc, ext, gallery, has, levels, page, paras, qr, safeUrl, withLogo, type RenderOptions } from './shared';

type Side = TagsSection | LevelsSection;
type Main = Exclude<Section, Side>;

/* Sidebar: skills and contact details sit in a coloured column; everything else reads down the wide column. */

const chips = (s: TagsSection): string =>
  s.groups.filter((g) => g.items.length).map((g) => `<div class="group">${has(g.name) ? `<h3>${esc(g.name)}</h3>` : ''}<ul class="chips">${g.items.map((t) => `<li class="chip">${esc(t)}</li>`).join('')}</ul></div>`).join('');

function section(s: Main, L: Labels): string {
  let inner = '';
  if (s.type === 'text') {
    const facts = s.facts.filter((f) => has(f.label) || has(f.value));
    inner = `${has(s.lead) ? `<p class="lead">${esc(s.lead)}</p>` : ''}${has(s.body) ? `<div class="text">${paras(s.body)}</div>` : ''}
      ${facts.length ? `<dl class="pairs">${facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>` : ''}`;
  } else if (s.type === 'timeline') {
    inner = s.items.filter((i) => has(i.title) || has(i.org)).map((i) => {
      const pts = i.points.filter((p) => has(p.title) || has(p.desc) || p.bullets.some(has));
      return `<article class="entry">
        <div class="entry-head">${withLogo(i.logo, `<h3>${esc(i.title)}</h3>${has(i.org) ? `<p class="org">${esc(i.org)}</p>` : ''}`)}<p class="when">${esc(i.when)}${has(i.where) ? `<span>${esc(i.where)}</span>` : ''}</p></div>
        ${has(i.body) ? `<div class="body">${paras(i.body)}</div>` : ''}
        ${bullets(i.bullets)}
        ${pts.length ? `<ul class="points">${pts.map((p) => `<li>${has(p.title) ? `<h4>${esc(p.title)}</h4>` : ''}${has(p.desc) ? `<p>${esc(p.desc)}</p>` : ''}${bullets(p.bullets)}${has(p.stack) ? `<p class="stack">${esc(p.stack)}</p>` : ''}</li>`).join('')}</ul>` : ''}
      </article>`;
    }).join('');
  } else if (s.type === 'gallery') {
    inner = `<div class="gap">${gallery(s.items)}</div>`;
  } else {
    inner = `<ul class="items">${s.items.filter((i) => has(i.name)).map((i) => {
      const url = safeUrl(i.url);
      const row = `<span class="name">${esc(i.name)}</span><span class="meta">${esc(i.meta)}</span>${url ? arrow : '<span></span>'}${has(i.desc) ? `<span class="desc">${esc(i.desc)}</span>` : ''}`;
      return `<li>${url ? `<a class="item" ${ext(url)}>${row}</a>` : `<div class="item">${row}</div>`}</li>`;
    }).join('')}</ul>`;
  }
  return `<section class="sec" aria-labelledby="h-${s.id}"><h2 id="h-${s.id}">${esc(s.title)}</h2>${has(s.note) ? `<p class="note">${esc(s.note)}</p>` : ''}${inner}</section>`;
}

export function renderSidebar(r: Resume, o: RenderOptions = {}): string {
  const L = labelsFor(r.style.lang);
  const p = r.profile;
  const links = p.links.filter((l) => has(l.label) && safeUrl(l.url));
  const sections = r.sections.filter((s) => has(s.title));
  const side = sections.filter((s): s is Side => s.type === 'tags' || s.type === 'levels');
  const main = sections.filter((s): s is Main => s.type !== 'tags' && s.type !== 'levels');
  const contact = [
    has(p.email) ? `<li><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></li>` : '',
    has(p.phone) ? `<li><a href="tel:${esc(p.phone.replace(/[^+\d]/g, ''))}">${esc(p.phone)}</a></li>` : '',
    has(p.location) ? `<li>${esc(p.location)}</li>` : '',
    ...links.map((l) => `<li><a ${ext(safeUrl(l.url))}>${esc(l.label)} ${arrow}</a></li>`),
  ].join('');
  const intro = has(p.headline) || has(p.summary);
  const body = `<div class="page">
  <aside class="side" aria-label="${esc(L.contactAndSkills)}">
    ${has(p.photo) ? `<img class="photo" src="${esc(p.photo)}" alt="${esc(fill(L.portraitOf, { name: p.fullName }))}" width="800" height="1000">` : ''}
    <h1>${esc(p.fullName || L.yourName)}</h1>
    ${has(p.title) ? `<p class="title">${esc(p.title)}</p>` : ''}
    ${contact ? `<ul class="contact">${contact}</ul>` : ''}
    ${side.map((s) => `<section aria-labelledby="h-${s.id}"><h2 id="h-${s.id}">${esc(s.title)}</h2>${s.type === 'tags' ? chips(s) : levels(s.items, L)}</section>`).join('')}
    ${qr(r) ? `<div class="side-qr">${qr(r)}</div>` : ''}
    <button class="side-print" type="button" data-action="print">${esc(L.savePdf)}</button>
  </aside>
  <main class="main"><div class="main-inner">
    ${intro ? `<div class="intro">${has(p.headline) ? `<p class="headline">${esc(p.headline)}</p>` : ''}${has(p.summary) ? `<p class="summary">${esc(p.summary)}</p>` : ''}</div>` : ''}
    ${main.map((s) => section(s, L)).join('\n')}
    <footer class="foot"><span>© <span data-year></span> ${esc(p.fullName)}</span><span>${esc(p.footerNote)}</span></footer>
  </div></main>
</div>`;
  return page(r, o, { fonts: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap', css, body });
}
