import type { Resume } from '@/model/types';
import { renderResume } from '@/render';

export const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'resume';

export function downloadResume(resume: Resume, name: string) {
  const url = URL.createObjectURL(new Blob([renderResume(resume)], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = slug(name) + '.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Crops a picked image to a 4:5 portrait from the centre and shrinks it, so it can live inside the resume file. */
export function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const im = new Image();
      im.onerror = () => reject(new Error('decode'));
      im.onload = () => {
        const W = 800, H = 1000;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const scale = Math.max(W / im.width, H / im.height);
        const w = im.width * scale, h = im.height * scale;
        c.getContext('2d')!.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      im.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
