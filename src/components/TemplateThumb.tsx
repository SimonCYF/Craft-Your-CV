import { useMemo } from 'react';
import type { Resume } from '@/model/types';
import { renderResume } from '@/render';

/** A small, non-interactive picture of a resume: the real template, scaled down. */
export function TemplateThumb({ resume, width = 300, eager = false }: { resume: Resume; width?: number; eager?: boolean }) {
  const html = useMemo(() => renderResume(resume, { preview: true, still: true }), [resume]);
  const scale = width / 1280;
  return (
    <div className="overflow-hidden rounded-sm border border-rule bg-paper" style={{ width, height: width * 1.25 }} aria-hidden="true">
      <iframe
        srcDoc={html}
        title=""
        tabIndex={-1}
        loading={eager ? 'eager' : 'lazy'}
        sandbox=""
        className="pointer-events-none origin-top-left border-0"
        style={{ width: 1280, height: 1600, transform: `scale(${scale})` }}
      />
    </div>
  );
}
