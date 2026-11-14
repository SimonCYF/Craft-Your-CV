import type { PageLimit, Resume } from '@/model/types';
import { MIN_FIT } from '@/model/normalize';
import { renderResume } from '@/render';
import { SCALE_VALUE } from '@/render/shared';
import { A4_WIDTH } from '@/components/Preview';

/* Works out how far the text must shrink for the printed resume to fit in 1 or 2 pages.
   The resume is drawn in a hidden frame the width of an A4 sheet (the same width page view uses), and the shrink
   factor is searched for until the drawn height is no taller than the allowed pages. */

export interface FitResult { fit: number; /** pages needed at that factor */ pages: number; /** false when even the smallest size is too long */ ok: boolean }

const STEPS = 7;

export function fitToPages(resume: Resume, limit: Exclude<PageLimit, 0>, pageHeight: number): Promise<FitResult> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.sandbox.add('allow-same-origin');   // no scripts: the frame is only measured
    frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_WIDTH}px;height:900px;border:0;visibility:hidden`;
    const done = (r: FitResult) => { frame.remove(); resolve(r); };
    frame.onload = () => {
      const d = frame.contentDocument;
      if (!d) return done({ fit: 1, pages: 1, ok: true });
      const run = () => {
        const base = SCALE_VALUE[resume.style.scale] ?? 1;
        const pagesAt = (f: number) => {
          d.documentElement.style.setProperty('--scale', String(base * f));
          return Math.max(1, Math.ceil((d.documentElement.scrollHeight - 2) / pageHeight));
        };
        if (pagesAt(1) <= limit) return done({ fit: 1, pages: pagesAt(1), ok: true });
        if (pagesAt(MIN_FIT) > limit) return done({ fit: MIN_FIT, pages: pagesAt(MIN_FIT), ok: false });
        let lo = MIN_FIT, hi = 1;   // lo always fits, hi never does
        for (let i = 0; i < STEPS; i++) { const mid = (lo + hi) / 2; if (pagesAt(mid) <= limit) lo = mid; else hi = mid; }
        const fit = Math.floor(lo * 1000) / 1000;
        done({ fit, pages: pagesAt(fit), ok: true });
      };
      // wait for web fonts so the height is the real one, but never hang if they cannot load
      Promise.race([d.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]).then(run, run);
    };
    frame.srcdoc = renderResume({ ...resume, style: { ...resume.style, fit: 1 } }, { preview: true, still: true });
    document.body.appendChild(frame);
  });
}
