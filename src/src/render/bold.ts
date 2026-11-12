import type { Resume, Section } from '@/model/types';
import css from './bold.css?raw';
import { arrow, bullets, esc, ext, gallery, has, levels, page, paras, qr, safeUrl, withLogo, type RenderOptions } from './shared';

/* Bold: dark full-width name area, sticky section headings, timeline. The original design. */

const BG: Record<Section['type'], string> = { text: 'section--paper', timeline: 'section--sand', tags: 'section--deep on-deep', links: 'section--paper', levels: 'section--sand', gallery: 'section--paper' };

function head(s: Section): string {
  return `<div class="section-head reveal"><h2 class="section-title" id="h-${s.id}">${esc(s.title)}</h2>${has(s.note) ? `<p class="section-note">${esc(s.note)}</p>` : ''}</div>`;
}

function sectionBody(s: Section, extraFact = ''): string {
  if (s.type === 'text') {
    const facts = s.facts.filter((f) => has(f.label) || has(f.value));
    const dl = facts.length > 0 || extraFact !== '';
    return `<div class="about-grid${dl ? '' : ' is-single'}">
      <div class="reveal">${has(s.lead) ? `<p class="about-lead">${esc(s.lead)}</p>` : ''}${paras(s.body, 'about-body')}</div>
      ${dl ? `<dl class="facts reveal">${facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}${extraFact}</dl>` : ''}
    </div>`;
  }
  if (s.type === 'timeline') {
    return `<div class="roles">${s.items.filter((i) => has(i.title) || has(i.org)).map((i) => {
      const pts = i.points.filter((p) => has(p.title) || has(p.desc) || p.bullets.some(has));
      return `<article class="role reveal">
        <header class="role-head">
          ${withLogo(i.logo, `<h3>${esc(i.title)}</h3>${has(i.org) ? `<p class="role-org">${esc(i.org)}</p>` : ''}`)}
          <p class="role-when">${esc(i.when)}${has(i.where) ? `<span class="role-where">${esc(i.where)}</span>` : ''}</p>
        </header>
        ${paras(i.body, 'role-body')}
        ${bullets(i.bullets)}
        ${pts.length ? `<ul class="works">${pts.map((p) => `<li class="work">${has(p.title) ? `<h4 class="work-title">${esc(p.title)}</h4>` : ''}${has(p.desc) ? `<p class="work-desc">${esc(p.desc)}</p>` : ''}${bullets(p.bullets)}${has(p.stack) ? `<p class="work-stack">${esc(p.stack)}</p>` : ''}</li>`).join('')}</ul>` : ''}
      </article>`;
    }).join('')}</div>`;
  }
  if (s.type === 'tags') {
    const groups = s.groups.filter((g) => g.items.length);
    const tabs = groups.length > 1 && groups.every((g) => has(g.name));
    const tab = (key: string, label: string, on: boolean) =>
      `<button class="tab" role="tab" type="button" id="t-${s.id}-${key}" aria-selected="${on}" aria-controls="p-${s.id}" data-filter="${key}" tabindex="${on ? 0 : -1}">${esc(label)}</button>`;
    return `<div>
      ${tabs ? `<div class="tabs" role="tablist" aria-label="${esc(s.title)} groups">${tab('all', 'All', true)}${groups.map((g, i) => tab(String(i), g.name, false)).join('')}<span class="tab-ink" aria-hidden="true"></span></div>` : ''}
      <div class="skill-panel" id="p-${s.id}"${tabs ? ` role="tabpanel" aria-labelledby="t-${s.id}-all" tabindex="0"` : ''}>
        ${groups.map((g, i) => `<div class="skill-group" data-cat="${i}"><h3>${esc(g.name)}</h3><ul class="chips">${g.items.map((t) => `<li class="chip">${esc(t)}</li>`).join('')}</ul></div>`).join('')}
      </div>
      <p class="skills-count" role="status" aria-live="polite"></p>
    </div>`;
  }
  if (s.type === 'levels') return `<div class="reveal">${levels(s.items)}</div>`;
  if (s.type === 'gallery') return `<div class="reveal">${gallery(s.items)}</div>`;
  return `<ul class="certs reveal">${s.items.filter((i) => has(i.name)).map((i) => {
    const url = safeUrl(i.url);
    const inner = `<span class="cert-text"><span class="cert-name">${esc(i.name)}</span>${has(i.desc) ? `<span class="cert-desc">${esc(i.desc)}</span>` : ''}</span><span class="cert-meta">${esc(i.meta)}</span>${url ? arrow : '<span></span>'}`;
    return `<li>${url ? `<a class="cert" ${ext(url)}>${inner}</a>` : `<div class="cert">${inner}</div>`}</li>`;
  }).join('')}</ul>`;
}

export function renderBold(r: Resume, o: RenderOptions = {}): string {
  const p = r.profile;
  const words = p.fullName.trim().split(/\s+/).filter(Boolean);
  const line1 = words.length > 1 ? words[0] : p.fullName;
  const line2 = words.length > 1 ? words.slice(1).join(' ') : '';
  const links = p.links.filter((l) => has(l.label) && safeUrl(l.url));
  const sections = r.sections.filter((s) => has(s.title));
  const nav = sections.map((s) => `<a href="#s-${s.id}">${esc(s.title)}</a>`).join('');
  const firstText = sections.findIndex((x) => x.type === 'text');

  const body = `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header on-deep">
  <div class="wrap">
    <a class="brand" href="#top" aria-label="${esc(p.fullName)}, back to top"><b>CV</b><span class="brand-long">${esc(p.fullName)}</span></a>
    <nav class="nav" aria-label="Sections">${nav}</nav>
  </div>
  <div class="progress" id="progress" aria-hidden="true"></div>
</header>
<main id="main">
  <section class="hero on-deep${has(p.photo) ? '' : ' no-photo'}" id="top" aria-labelledby="hero-name">
    <div class="wrap">
      <div>
        <h1 id="hero-name" aria-label="${esc(p.fullName)}">
          <span class="line" aria-hidden="true"><span>${esc(line1 || 'Your name')}</span></span>
          ${line2 ? `<span class="line" aria-hidden="true"><span>${esc(line2)}</span></span>` : ''}
        </h1>
        ${has(p.headline || p.title) ? `<p class="hero-role fade-up" style="--i:0">${esc(p.headline || p.title)}</p>` : ''}
        ${has(p.summary) ? `<p class="lede fade-up" style="--i:1">${esc(p.summary)}</p>` : ''}
        <div class="actions fade-up" style="--i:2">
          ${has(p.email) ? `<a class="btn btn--accent" href="mailto:${esc(p.email)}">Email me</a>` : ''}
          <button class="btn btn--quiet" type="button" data-action="print">Save as PDF</button>
        </div>
        ${links.length ? `<p class="elsewhere fade-up" style="--i:3">${links.map((l) => `<a ${ext(safeUrl(l.url))}>${esc(l.label)} ${arrow}</a>`).join('')}</p>` : ''}
      </div>
      ${has(p.photo) ? `<figure class="portrait fade-up" style="--i:1"><img src="${esc(p.photo)}" alt="Portrait of ${esc(p.fullName)}" width="800" height="1000" fetchpriority="high"></figure>` : ''}
    </div>
  </section>
  ${sections.map((s, i) => {
    /* The first text section also carries the email, with a copy button */
    const inner = sectionBody(s, i === firstText && has(p.email)
      ? `<div><dt>Email</dt><dd class="copy-row"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a><button class="btn btn--quiet btn--small copy-btn" type="button" data-action="copy-email" data-email="${esc(p.email)}">Copy email</button></dd></div>`
      : '');
    return `<section class="section ${BG[s.type]}" id="s-${s.id}" aria-labelledby="h-${s.id}"><div class="wrap split">${head(s)}${inner}</div></section>`;
  }).join('\n')}
</main>
<footer class="site-footer on-deep">
  <div class="wrap">
    <div class="footer-grid">
      <div><p class="brand-foot">${esc(p.fullName)}</p>${has(p.title) ? `<p>${esc(p.title)}</p>` : ''}${has(p.location) ? `<p>${esc(p.location)}</p>` : ''}</div>
      <div class="footer-nav"><h2>Sections</h2><ul>${sections.map((s) => `<li><a href="#s-${s.id}">${esc(s.title)}</a></li>`).join('')}</ul></div>
      ${links.length ? `<div><h2>Elsewhere</h2><ul>${links.map((l) => `<li><a ${ext(safeUrl(l.url))}>${esc(l.label)}</a></li>`).join('')}</ul></div>` : '<div></div>'}
      ${has(p.email) || has(p.phone) ? `<div><h2>Contact</h2><ul>${has(p.email) ? `<li><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></li>` : ''}${has(p.phone) ? `<li><a href="tel:${esc(p.phone.replace(/[^+\d]/g, ''))}">${esc(p.phone)}</a></li>` : ''}</ul></div>` : ''}
    </div>
    ${qr(r) ? `<div class="footer-qr">${qr(r)}</div>` : ''}
    <p class="small-print"><span>© <span data-year></span> ${esc(p.fullName)}</span><span>${esc(p.footerNote)}</span></p>
  </div>
</footer>
<a class="to-top" id="to-top" href="#top" aria-label="Back to top"><span aria-hidden="true">↑</span></a>`;

  return page(r, o, { fonts: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap', css, body });
}
