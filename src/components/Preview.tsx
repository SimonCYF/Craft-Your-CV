import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface PreviewHandle { print: () => void }

/** A4 at 96 dpi. The frame is this wide in page view so the sheet looks like the printed one. */
export const A4_WIDTH = 794;

interface Props {
  html: string;
  phone: boolean;
  /** Show the sheet at A4 width with dashed lines where a new page is likely to start. */
  pageView?: boolean;
  /** Printable height of one page in px for this template (null = the template does not print as A4 pages). */
  pageHeight?: number | null;
  /** Reports the estimated page count after each redraw (null when the template is not paged). */
  onMeasure?: (pages: number | null) => void;
}

/** The live resume. It is the exact page that Download produces, shown in a frame. */
export const Preview = forwardRef<PreviewHandle, Props>(function Preview({ html, phone, pageView = false, pageHeight = null, onMeasure }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const scroll = useRef(0);
  const [doc, setDoc] = useState(html);
  const paged = pageView && !phone && !!pageHeight;

  /* Redraw a moment after typing stops, and put the reader back where they were */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try { scroll.current = frame.current?.contentWindow?.scrollY ?? 0; } catch { scroll.current = 0; }
      setDoc(html);
    }, 250);
    return () => window.clearTimeout(t);
  }, [html]);

  useImperativeHandle(ref, () => ({ print: () => frame.current?.contentWindow?.print() }), []);

  /** Measure the drawn page, report how many sheets it fills, and mark each break. */
  function measure() {
    try {
      const d = frame.current?.contentDocument;
      if (!d) return;
      d.querySelectorAll('[data-page-guide]').forEach((n) => n.remove());
      if (!pageHeight) { onMeasure?.(null); return; }
      const n = Math.max(1, Math.ceil((d.documentElement.scrollHeight - 2) / pageHeight));
      onMeasure?.(n);
      if (!paged) return;
      for (let k = 1; k < n; k++) {
        const line = d.createElement('div');
        line.setAttribute('data-page-guide', '');
        line.setAttribute('aria-hidden', 'true');
        line.style.cssText = `position:absolute;left:0;right:0;top:${k * pageHeight}px;border-top:2px dashed #d33;z-index:2147483647;pointer-events:none`;
        const label = d.createElement('span');
        label.textContent = `Page ${k + 1} starts about here`;
        label.style.cssText = 'position:absolute;right:6px;top:2px;font:700 11px/1.4 sans-serif;color:#d33;background:#fff;padding:0 6px;border-radius:3px';
        line.appendChild(label);
        d.body.appendChild(line);
      }
    } catch { /* frame not ready */ }
  }

  /* Page view toggled or template changed without a redraw of the document */
  useEffect(measure, [paged, pageHeight]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <iframe
      ref={frame}
      srcDoc={doc}
      title="Resume preview"
      sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
      onLoad={() => {
        try { frame.current?.contentWindow?.scrollTo({ top: scroll.current, behavior: 'instant' as ScrollBehavior }); } catch { /* frame not ready */ }
        measure();
      }}
      className={paged ? 'h-full border-0 bg-paper shadow-[0_0_0_1px_var(--color-rule)]' : 'h-full border-0 bg-paper'}
      style={{ width: phone ? 390 : paged ? A4_WIDTH : '100%', maxWidth: '100%' }}
    />
  );
});
