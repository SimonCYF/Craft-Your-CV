/* The small script inside every exported resume: print, copy email, skill tabs, reading progress, current section. */
(function () {
  'use strict';
  var root = document.documentElement;
  var all = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  all('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });

  var L = window.CYC_LABELS || {};
  var toast = document.getElementById('toast');
  var toastTimer;
  function say(message) {
    if (!toast) { return; }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 4000);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) { return; }
    var action = t.getAttribute('data-action');
    if (action === 'print') {
      say(L.printHint || 'In the print dialog, choose “Save as PDF”. Keep margins on Default.');
      setTimeout(function () { window.print(); }, 350);
    }
    if (action === 'copy-email') {
      var failed = function () { say(L.copyFail || 'Could not copy. Select the address and press Ctrl+C (Cmd+C on Mac).'); };
      if (!navigator.clipboard || !navigator.clipboard.writeText) { failed(); return; }
      navigator.clipboard.writeText(t.getAttribute('data-email')).then(function () {
        t.textContent = L.copied || 'Copied';
        say(L.copyDone || 'Email copied to your clipboard.');
        setTimeout(function () { t.textContent = L.copyEmail || 'Copy email'; }, 2000);
      }, failed);
    }
  });

  /* Tabs that narrow a list of groups: arrow keys, Home, End; one tab stop */
  all('[role="tablist"]').forEach(function (list) {
    var tabs = all('[role="tab"]', list);
    var panel = document.getElementById(tabs[0].getAttribute('aria-controls'));
    var count = panel.nextElementSibling;
    var ink = list.querySelector('.tab-ink');
    function moveInk() {
      var current = list.querySelector('[aria-selected="true"]');
      if (ink && current) { ink.style.transform = 'translateX(' + current.offsetLeft + 'px) scaleX(' + (current.offsetWidth / 100) + ')'; }
    }
    function select(tab, focus) {
      var filter = tab.getAttribute('data-filter');
      tabs.forEach(function (t) { var on = t === tab; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
      var shown = 0;
      all('[data-cat]', panel).forEach(function (g) {
        var match = filter === 'all' || g.getAttribute('data-cat') === filter;
        g.hidden = !match;
        if (match) { shown += all('.chip', g).length; }
      });
      panel.setAttribute('aria-labelledby', tab.id);
      if (count) { count.textContent = filter === 'all' ? '' : shown + (shown === 1 ? ' item' : ' items') + ' in ' + tab.textContent + '.'; }
      moveInk();
      if (focus) { tab.focus(); tab.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }
    }
    list.addEventListener('click', function (e) { var tab = e.target.closest('[role="tab"]'); if (tab) { select(tab, false); } });
    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(e.target), next = null;
      if (i < 0) { return; }
      if (e.key === 'ArrowRight') { next = tabs[(i + 1) % tabs.length]; }
      if (e.key === 'ArrowLeft') { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
      if (e.key === 'Home') { next = tabs[0]; }
      if (e.key === 'End') { next = tabs[tabs.length - 1]; }
      if (next) { e.preventDefault(); select(next, true); }
    });
    moveInk();
    window.addEventListener('resize', moveInk);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(moveInk); }
  });

  /* Reading progress and back to top */
  var progress = document.getElementById('progress');
  var toTop = document.getElementById('to-top');
  if (progress || toTop) {
    var ticking = false;
    var onScroll = function () {
      ticking = false;
      var max = root.scrollHeight - window.innerHeight;
      var y = window.scrollY || root.scrollTop;
      if (progress) { progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')'; }
      if (toTop) { toTop.classList.toggle('is-visible', y > window.innerHeight * 0.8); }
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  /* Current section in the header */
  var links = all('.nav a');
  if (links.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        links.forEach(function (a) {
          a.removeAttribute('aria-current');
          if (a.getAttribute('href') === '#' + entry.target.id) { a.setAttribute('aria-current', 'true'); }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) { io.observe(t); } });
  }
})();
