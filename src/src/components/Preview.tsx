import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface PreviewHandle { print: () => void }

/** The live resume. It is the exact page that Download produces, shown in a frame. */
export const Preview = forwardRef<PreviewHandle, { html: string; phone: boolean }>(function Preview({ html, phone }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const scroll = useRef(0);
  const [doc, setDoc] = useState(html);

  /* Redraw a moment after typing stops, and put the reader back where they were */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try { scroll.current = frame.current?.contentWindow?.scrollY ?? 0; } catch { scroll.current = 0; }
      setDoc(html);
    }, 250);
    return () => window.clearTimeout(t);
  }, [html]);

  useImperativeHandle(ref, () => ({ print: () => frame.current?.contentWindow?.print() }), []);

  return (
    <iframe
      ref={frame}
      srcDoc={doc}
      title="Resume preview"
      sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
      onLoad={() => { try { frame.current?.contentWindow?.scrollTo({ top: scroll.current, behavior: 'instant' as ScrollBehavior }); } catch { /* frame not ready */ } }}
      className="h-full border-0 bg-paper"
      style={{ width: phone ? 390 : '100%', maxWidth: '100%' }}
    />
  );
});
