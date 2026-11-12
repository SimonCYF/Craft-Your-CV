import { useMemo, useRef } from 'react';
import { Copy, Download, FilePlus2, Trash2, Upload } from 'lucide-react';
import type { Resume, StoredResume, TemplateId } from '@/model/types';
import { blankResume, exampleResume } from '@/model/presets';
import { NotAResumeError, readResumeFile } from '@/model/normalize';
import { TEMPLATES } from '@/render';
import { Button } from '@/components/ui/button';
import { TemplateThumb } from '@/components/TemplateThumb';
import { useToast } from '@/lib/toast';
import { downloadResume } from '@/lib/files';
import { COPY } from '@/copy';
import { LanguageSelect, useI18n } from '@/i18n';

interface Props {
  list: StoredResume[];
  onCreate: (resume: Resume, name: string, open?: boolean) => string;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}

const when = (ms: number, tag: string) => new Date(ms).toLocaleString(tag, { dateStyle: 'medium', timeStyle: 'short' });

export default function Home({ list, onCreate, onOpen, onRemove }: Props) {
  const say = useToast();
  const { t, tag, locale } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const examples = useMemo(() => Object.fromEntries(TEMPLATES.map((t) => [t.id, exampleResume(t.id)])) as Record<TemplateId, Resume>, []);

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      const resume = await readResumeFile(file);
      onCreate(resume, resume.profile.fullName || file.name.replace(/\.(html?|json)$/i, ''), true);
      say(t(COPY.uploadDone));
    } catch (err) {
      say(t(err instanceof NotAResumeError ? COPY.uploadFailed : 'The file could not be opened. Try again.'));
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="on-ink bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-10 sm:py-16">
          <div className="flex items-center justify-between gap-4">
            <p className="font-extrabold"><span className="text-accent">CV</span> {COPY.appName}</p>
            <LanguageSelect className="min-h-10 rounded-sm border border-paper bg-ink px-2 text-[15px] font-semibold text-paper" />
          </div>
          <h1 className="mt-6 max-w-[16ch] text-5xl font-extrabold uppercase leading-[.95] tracking-tight sm:text-7xl">{t('Your resume,')} <span className="text-accent">{t('one file')}</span></h1>
          <p className="mt-6 max-w-[46ch] text-lg text-on-ink-muted">{t(COPY.tagline)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="accent" className="border-accent" asChild><a href="#templates">{t('Choose a template')}</a></Button>
            <Button className="border-paper text-paper hover:bg-paper hover:text-ink" onClick={() => fileInput.current?.click()}><Upload />{t('Upload a resume to edit')}</Button>
            <input ref={fileInput} type="file" accept=".html,.htm,.json,text/html,application/json" className="sr-only" aria-label={t('Upload a resume file')} onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-10">
        <section id="templates" className="scroll-mt-6 py-14" aria-labelledby="templates-h">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-ink pb-3">
            <h2 id="templates-h" className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('Templates')}</h2>
            <p className="text-[15px] text-muted">{t('You can switch template and colours at any time while editing.')}</p>
          </div>
          <ul className="mt-8 grid gap-10 md:grid-cols-3">
            {TEMPLATES.map((tp) => (
              <li key={tp.id} className="grid content-start gap-4">
                <TemplateThumb resume={examples[tp.id]} />
                <div>
                  <h3 className="text-2xl font-bold">{t(tp.name)}</h3>
                  <p className="mt-1 text-muted">{t(tp.description)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => onCreate(exampleResume(tp.id, locale), t('My resume'))}>{t('Use {name}', { name: t(tp.name) })}</Button>
                  <Button variant="ghost" onClick={() => onCreate(blankResume(tp.id, locale), t('My resume'))}><FilePlus2 />{t('Start empty')}</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="py-14" aria-labelledby="mine-h">
          <div className="border-b-[3px] border-ink pb-3">
            <h2 id="mine-h" className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('My resumes')}</h2>
          </div>
          {list.length === 0 ? (
            <p className="mt-6 max-w-[60ch] text-muted">{t(COPY.emptyList)}</p>
          ) : (
            <ul>
              {list.map((r) => (
                <li key={r.id} className="grid items-center gap-3 border-b border-rule py-4 sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold">{r.name || t('Untitled resume')}</p>
                    <p className="text-[15px] text-muted">
                      {t('{template} template · edited {when}', { template: t(TEMPLATES.find((x) => x.id === r.resume.style.template)?.name ?? ''), when: when(r.updatedAt, tag) })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" size="sm" onClick={() => onOpen(r.id)}>{t('Edit')}</Button>
                    <Button size="sm" onClick={() => { downloadResume(r.resume, r.name); say(t(COPY.downloadDone)); }}><Download />{t('Download')}</Button>
                    <Button size="sm" onClick={() => onCreate(structuredClone(r.resume), t('{name} (copy)', { name: r.name || t('Untitled resume') }), false)}><Copy />{t('Duplicate')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(t('Delete “{name}” from this browser? This cannot be undone.', { name: r.name || t('Untitled resume') }))) onRemove(r.id); }}>
                      <Trash2 />{t('Delete')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 max-w-[70ch] text-[15px] text-muted">{t(COPY.savedHere)}</p>
        </section>
      </main>

      <footer className="on-ink bg-ink text-on-ink-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-8 text-[15px] sm:px-10">
          <span>{COPY.appName}</span>
          <span>{t('No sign-up. No tracking. Your data stays on your device.')}</span>
          <span>{t('Need help?')} <a className="underline" href={`mailto:${COPY.contactEmail}`}>{COPY.contactEmail}</a></span>
        </div>
      </footer>
    </div>
  );
}
