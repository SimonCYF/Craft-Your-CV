import { Fragment, useMemo, useRef, useState } from 'react';
import { ClipboardCheck, Copy, Download, FilePlus2, Layers, Trash2, Upload } from 'lucide-react';
import type { Resume, StoredResume, TemplateId } from '@/model/types';
import { blankResume, exampleResume } from '@/model/presets';
import { NotAResumeError, readResumeFile } from '@/model/normalize';
import { TEMPLATES } from '@/render';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { TemplateThumb } from '@/components/TemplateThumb';
import { useToast } from '@/lib/toast';
import { downloadResume } from '@/lib/files';
import { COPY } from '@/copy';
import { LanguageSelect, useI18n, type Translate } from '@/i18n';

interface Props {
  list: StoredResume[];
  onCreate: (resume: Resume, name: string, open?: boolean, extra?: Pick<StoredResume, 'masterId' | 'target'>) => string;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onReview: (id?: string) => void;
}

const when = (ms: number, tag: string) => new Date(ms).toLocaleString(tag, { dateStyle: 'medium', timeStyle: 'short' });

const STEPS: { name: string; text: string }[] = [
  { name: 'Build', text: 'Pick a clean, ATS-friendly template and fill in the form.' },
  { name: 'Review', text: 'Get a score for each part, and the exact reasons it is weak.' },
  { name: 'Improve', text: 'Fix the weak lines with specific rewrites and a full proofread.' },
  { name: 'Apply', text: 'Match it to a job advert and write the cover letter.' },
];
const ROLE_IDEAS = ['Software Engineer', 'Business Analyst', 'IT Support', 'Project Manager'];

export default function Home({ list, onCreate, onOpen, onRemove, onReview }: Props) {
  const say = useToast();
  const { t, tag, locale } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const examples = useMemo(() => Object.fromEntries(TEMPLATES.map((t) => [t.id, exampleResume(t.id)])) as Record<TemplateId, Resume>, []);

  /* Tailored versions sit under the master they were made from */
  const ids = new Set(list.map((r) => r.id));
  const roots = list.filter((r) => !r.masterId || !ids.has(r.masterId));
  const versionsOf = (id: string) => list.filter((r) => r.masterId === id);

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

  const Row = ({ r, version }: { r: StoredResume; version?: boolean }) => (
    <li className={`grid items-center gap-3 border-b border-rule py-4 sm:grid-cols-[1fr_auto] ${version ? 'ml-6 border-l-4 border-l-accent pl-4 sm:ml-10' : ''}`}>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold">{r.name || t('Untitled resume')}</p>
        <p className="text-[15px] text-muted">
          {version && r.target ? <><span className="font-bold text-ink">{t('Version for {role}', { role: r.target })}</span> · </> : null}
          {t('{template} template · edited {when}', { template: t(TEMPLATES.find((x) => x.id === r.resume.style.template)?.name ?? ''), when: when(r.updatedAt, tag) })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={() => onOpen(r.id)}>{t('Edit')}</Button>
        <Button size="sm" onClick={() => onReview(r.id)}><ClipboardCheck />{t('Review')}</Button>
        {!version && <TailorDialog t={t} master={r} onCreate={onCreate} />}
        <Button size="sm" onClick={() => { downloadResume(r.resume, r.name); say(t(COPY.downloadDone)); }}><Download />{t('Download')}</Button>
        <Button size="sm" onClick={() => onCreate(structuredClone(r.resume), t('{name} (copy)', { name: r.name || t('Untitled resume') }), false, r.masterId ? { masterId: r.masterId, target: r.target } : undefined)}><Copy />{t('Duplicate')}</Button>
        <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(t('Delete “{name}” from this browser? This cannot be undone.', { name: r.name || t('Untitled resume') }))) onRemove(r.id); }}>
          <Trash2 />{t('Delete')}
        </Button>
      </div>
    </li>
  );

  return (
    <div className="min-h-screen bg-paper">
      <header className="on-ink bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-10 sm:py-16">
          <div className="flex items-center justify-between gap-4">
            <p className="font-extrabold"><span className="text-accent">CV</span> {COPY.appName}</p>
            <LanguageSelect className="min-h-10 rounded-sm border border-paper bg-ink px-2 text-[15px] font-semibold text-paper" />
          </div>
          <h1 className="mt-6 max-w-[20ch] text-4xl font-extrabold uppercase leading-[.98] tracking-tight sm:text-6xl">{t('Build a resume that gets you')} <span className="text-accent">{t('shortlisted')}</span></h1>
          <p className="mt-6 max-w-[54ch] text-lg text-on-ink-muted">{t(COPY.tagline)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="accent" className="border-accent" asChild><a href="#templates">{t('Build my resume')}</a></Button>
            <Button className="border-paper text-paper hover:bg-paper hover:text-ink" onClick={() => onReview()}><ClipboardCheck />{t('Review my resume')}</Button>
            <Button className="border-paper text-paper hover:bg-paper hover:text-ink" onClick={() => fileInput.current?.click()}><Upload />{t('Upload a resume to edit')}</Button>
            <input ref={fileInput} type="file" accept=".html,.htm,.json,text/html,application/json" className="sr-only" aria-label={t('Upload a resume file')} onChange={(e) => upload(e.target.files?.[0])} />
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={t('How it works')}>
            {STEPS.map((s, i) => (
              <li key={s.name} className="border-t-[3px] border-accent pt-3">
                <p className="text-xl font-extrabold"><span className="text-accent">{i + 1}.</span> {t(s.name)}</p>
                <p className="mt-1 text-[15px] text-on-ink-muted">{t(s.text)}</p>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-10">
        <section id="templates" className="scroll-mt-6 py-14" aria-labelledby="templates-h">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-ink pb-3">
            <h2 id="templates-h" className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('Templates')}</h2>
            <p className="text-[15px] text-muted">{t('Recruiters and applicant-tracking systems read plain one-column layouts best. You can switch template and colours at any time.')}</p>
          </div>
          <ul className="mt-8 grid gap-10 md:grid-cols-3">
            {TEMPLATES.map((tp) => (
              <li key={tp.id} className="grid content-start gap-4">
                <TemplateThumb resume={examples[tp.id]} />
                <div>
                  <h3 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
                    {t(tp.name)}
                    <span className={tp.ats === 'best' ? 'rounded-sm border-2 border-ink bg-accent px-2 text-sm font-extrabold' : 'rounded-sm border border-rule bg-tint px-2 text-sm font-semibold text-muted'}>
                      {tp.ats === 'best' ? t('ATS-friendly · recommended') : t('Designer layout · less ATS-safe')}
                    </span>
                  </h3>
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
            <>
              <p className="mt-4 max-w-[70ch] text-[15px] text-muted">{t('Keep one master resume, then use “Tailor” to make a separate version for each role you apply for.')}</p>
              <ul>
                {roots.map((r) => (
                  <Fragment key={r.id}>
                    <Row r={r} />
                    {versionsOf(r.id).map((v) => <Row key={v.id} r={v} version />)}
                  </Fragment>
                ))}
              </ul>
            </>
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

/** Makes a separate copy of a master resume for one role, so the master stays untouched. */
function TailorDialog({ t, master, onCreate }: { t: Translate; master: StoredResume; onCreate: Props['onCreate'] }) {
  const [role, setRole] = useState('');
  const [setTitle, setSetTitle] = useState(true);
  const make = () => {
    const name = role.trim();
    if (!name) return;
    const copy: Resume = structuredClone(master.resume);
    if (setTitle) {
      if (!copy.profile.headline || copy.profile.headline === copy.profile.title) copy.profile.headline = name;
      copy.profile.title = name;
    }
    onCreate(copy, `${master.name || t('Untitled resume')} – ${name}`, true, { masterId: master.id, target: name });
  };
  return (
    <Dialog>
      <DialogTrigger asChild><Button size="sm"><Layers />{t('Tailor')}</Button></DialogTrigger>
      <DialogContent title={t('Tailor for a role')} description={t('This makes a separate copy for one kind of job. Your master stays exactly as it is.')}>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="tailor-role">{t('Which role is this version for?')}</Label>
            <Input id="tailor-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder={t('For example: Business Analyst')} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
            <ul className="mt-2 flex flex-wrap gap-2">
              {ROLE_IDEAS.map((r) => (
                <li key={r}><button type="button" onClick={() => setRole(r)} className="min-h-9 rounded-sm border border-muted px-2.5 text-sm font-semibold hover:border-ink hover:bg-tint">{r}</button></li>
              ))}
            </ul>
          </div>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" className="mt-1 size-5 accent-ink" checked={setTitle} onChange={(e) => setSetTitle(e.target.checked)} />
            <span>{t('Use this role as the job title at the top of the resume')}</span>
          </label>
          <p className="text-[15px] text-muted">{t('Next: reorder sections, lead with the bullets that fit this role, then use Review → Job match with a real advert.')}</p>
          <DialogClose asChild><Button variant="primary" disabled={!role.trim()} onClick={make}>{t('Create version')}</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
