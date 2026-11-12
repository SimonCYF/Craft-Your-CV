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

/** Reads a picked image and shrinks it so it can live inside the resume file.
    cover: crop from the centre to exactly w × h. contain: keep the whole picture, no larger than w × h. */
export function readImage(file: File, o: { w: number; h: number; fit: 'cover' | 'contain'; png?: boolean }): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const im = new Image();
      im.onerror = () => reject(new Error('decode'));
      im.onload = () => {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d')!;
        if (o.fit === 'cover') {
          c.width = o.w; c.height = o.h;
          const scale = Math.max(o.w / im.width, o.h / im.height);
          const w = im.width * scale, h = im.height * scale;
          ctx.drawImage(im, (o.w - w) / 2, (o.h - h) / 2, w, h);
        } else {
          const scale = Math.min(1, o.w / im.width, o.h / im.height);
          c.width = Math.max(1, Math.round(im.width * scale)); c.height = Math.max(1, Math.round(im.height * scale));
          ctx.drawImage(im, 0, 0, c.width, c.height);
        }
        resolve(o.png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85));
      };
      im.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Profile photo: a 4:5 portrait. */
export const readPhoto = (file: File) => readImage(file, { w: 800, h: 1000, fit: 'cover' });
/** Organisation icon: small, keeps a transparent background. */
export const readLogo = (file: File) => readImage(file, { w: 160, h: 160, fit: 'contain', png: true });
/** Gallery picture: whole image, at most 1200px wide. */
export const readPicture = (file: File) => readImage(file, { w: 1200, h: 1200, fit: 'contain' });
