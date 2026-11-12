import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Monitor, Plus, Printer, Smartphone } from 'lucide-react';
import type { Colors, LinkItem, Profile, Resume, Scale, Section, SectionType, StoredResume } from '@/model/types';
import { blankEntry, blankSection } from '@/model/normalize';
import { LAYOUT_CHOICES, SECTION_CHOICES } from '@/model/presets';
import { COLOUR_PRESETS, TEMPLATES, renderResume } from '@/render';
import { contrast } from '@/render/shared';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { BulletsEditor, DragHandle, Field, ImageField, ListEditor, Panel, RemoveButton, Sortable, SortableRow, moved } from '@/components/form';
import { Preview, type PreviewHandle } from '@/components/Preview';
import { useToast } from '@/lib/toast';
import { downloadResume, readLogo, readPhoto, readPicture } from '@/lib/files';
import { cn } from '@/lib/utils';
import { COPY } from '@/copy';
import { LanguageSelect, LOCALES, retitle, useI18n, useT } from '@/i18n';
import type { SaveState } from '@/App';

type PickImage = (read: (file: File) => Promise<string>, then: (dataUrl: string) => void) => (file: File) => void;

interface Props {
  item: StoredResume;
  saveState: SaveState;
  onChange: (patch: Partial<Pick<StoredResume, 'name' | 'resume'>>) => void;
  onBack: () => void;
}

const SCALE_CHOICES: { id: Scale; name: string }[] = [{ id: 'small', name: 'Small' }, { id: 'normal', name: 'Normal' }, { id: 'large', name: 'Large' }, { id: 'xlarge', name: 'Extra large' }];
const SAVE_TEXT: Record<SaveState, string> = { saved: 'Saved in this browser', saving: 'Saving…', failed: 'Not saved. Download to keep your work.' };   // English keys; translated where shown

export default function Editor({ item, saveState, onChange, onBack }: Props) {
  const say = useToast();
  const { t, locale } = useI18n();
  const { resume } = item;
  /* When the app language changes, stock section titles and the downloaded-file language follow it (titles you renamed are left alone) */
  const lastLocale = useRef(locale);
  useEffect(() => {
    if (lastLocale.current === locale) return;
    lastLocale.current = locale;
    const sections = resume.sections.map((s) => { const n = retitle(s.title, locale); return n && n !== s.title ? { ...s, title: n } : s; });
    onChange({ resume: { ...resume, sections, style: { ...resume.style, lang: locale } } });
  }, [locale]);   // eslint-disable-line react-hooks/exhaustive-deps
  const preview = useRef<PreviewHandle>(null);
  const [phone, setPhone] = useState(false);
  const [pane, setPane] = useState<'edit' | 'preview'>('edit');   // small screens show one at a time
  const html = useMemo(() => renderResume(resume, { preview: true }), [resume]);

  const set = (patch: Partial<Resume>) => onChange({ resume: { ...resume, ...patch } });
  const setProfile = (patch: Partial<Profile>) => set({ profile: { ...resume.profile, ...patch } });
  const setColors = (patch: Partial<Colors>) => set({ style: { ...resume.style, colors: { ...resume.style.colors, ...patch } } });
  const setSections = (sections: Section[]) => set({ sections });
  const setSection = (id: string, patch: Partial<Section>) => setSections(resume.sections.map((s) => (s.id === id ? ({ ...s, ...patch } as Section) : s)));

  const p = resume.profile;
  const c = resume.style.colors;
  /* Reads a picked picture, then hands the result on; tells the person if the file was not a picture */
  const pick: PickImage = (read, then) => async (file) => { try { then(await read(file)); } catch { say(t(COPY.photoFailed)); } };

  return (
    <div className="flex h-dvh flex-col bg-tint">
      <header className="on-ink flex flex-wrap items-center gap-x-3 gap-y-2 bg-ink px-3 py-2 text-paper sm:px-5">
        <Button variant="ghost" size="sm" className="text-paper hover:bg-ink-hover" onClick={onBack}><ArrowLeft />{t('My resumes')}</Button>
        <div className="flex min-w-40 flex-1 items-center gap-2">
          <label htmlFor="resume-name" className="sr-only">{t('Name of this resume (only you see it)')}</label>
          <Input id="resume-name" value={item.name} onChange={(e) => onChange({ name: e.target.value })} className="max-w-72 border-ink-hover bg-ink-hover font-bold text-paper" />
          <p role="status" className={cn('hidden text-sm sm:block', saveState === 'failed' ? 'font-bold text-accent' : 'text-on-ink-muted')}>{t(SAVE_TEXT[saveState])}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSelect className="min-h-9 rounded-sm border border-ink-hover bg-ink-hover px-2 text-sm font-semibold text-paper" />
          <Button size="sm" className="border-paper text-paper hover:bg-paper hover:text-ink" onClick={() => preview.current?.print()}><Printer />{t('Save as PDF')}</Button>
          <Button size="sm" variant="accent" className="border-accent" onClick={() => { downloadResume(resume, item.name); say(t(COPY.downloadDone)); }}><Download />{t('Download')}</Button>
        </div>
      </header>

      {/* Small screens: switch between the form and the preview */}
      <div className="flex border-b border-rule bg-paper lg:hidden" role="tablist" aria-label={t('Edit or preview')}>
        {(['edit', 'preview'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={pane === k} onClick={() => setPane(k)}
            className={cn('min-h-12 flex-1 border-b-[3px] font-bold ', pane === k ? 'border-ink' : 'border-transparent text-muted')}>{t(k === 'edit' ? 'Edit' : 'Preview')}</button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[440px_minmax(0,1fr)]">
        <div className={cn('min-h-0 overflow-y-auto border-r-2 border-ink bg-paper px-5 pb-16', pane === 'preview' && 'hidden lg:block')}>
          <Panel title={t('Template, text size and colours')} defaultOpen>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-[15px] font-bold">{t('Template')}</legend>
              {TEMPLATES.map((tp) => {
                const on = resume.style.template === tp.id;
                return (
                  <label key={tp.id} className={cn('flex cursor-pointer items-start gap-3 rounded-sm border p-3', on ? 'border-2 border-ink bg-tint' : 'border-muted')}>
                    <input type="radio" name="template" className="mt-1 size-5 accent-ink" checked={on} onChange={() => set({ style: { ...resume.style, template: tp.id } })} />
                    <span><span className="block font-bold">{t(tp.name)}</span><span className="block text-sm text-muted">{t(tp.description)}</span></span>
                  </label>
                );
              })}
            </fieldset>
            <fieldset>
              <legend className="mb-1 mt-2 text-[15px] font-bold">{t('Text size')}</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {SCALE_CHOICES.map((sc) => {
                  const on = resume.style.scale === sc.id;
                  return (
                    <label key={sc.id} className={cn('flex min-h-11 cursor-pointer items-center justify-center rounded-sm border px-1 text-center text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3', on ? 'border-2 border-ink bg-ink text-paper' : 'border-muted hover:bg-tint')}>
                      <input type="radio" name="scale" className="sr-only" checked={on} onChange={() => set({ style: { ...resume.style, scale: sc.id } })} />
                      {t(sc.name)}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="mt-2 text-[15px] font-bold">{t('Colours: start from a combination')}</p>
            <div className="grid grid-cols-2 gap-2">
              {COLOUR_PRESETS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => setColors({ main: preset.main, accent: preset.accent, soft: preset.soft })}
                  className="flex min-h-12 items-center gap-2.5 rounded-sm border border-muted bg-paper px-2.5 py-1.5 text-left text-sm font-semibold hover:border-ink hover:bg-tint">
                  <span className="flex h-7 w-11 shrink-0 overflow-hidden rounded-sm border border-ink" aria-hidden="true">
                    <i className="flex-1" style={{ background: preset.main }} /><i className="flex-1" style={{ background: preset.accent }} /><i className="flex-1" style={{ background: preset.soft }} />
                  </span>
                  {t(preset.label)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[15px] font-bold">{t('Or pick your own')}</p>
            <ColourPicker label={t('Main colour')} hint={t('The large coloured areas and the headings.')} value={c.main} onChange={(main) => setColors({ main })} />
            <ColourPicker label={t('Highlight colour')} hint={t('Buttons, underlines and small accents.')} value={c.accent} onChange={(accent) => setColors({ accent })} />
            <ColourPicker label={t('Soft background')} hint={t('Lightly tinted areas behind the content.')} value={c.soft} onChange={(soft) => setColors({ soft })} />
            {contrast(c.accent, c.main) < 3 ? <p role="status" className="rounded-sm border-2 border-ink p-2.5 text-[15px] font-semibold">{t(COPY.lowContrast)}</p> : null}
            <div className="grid gap-1">
              <Label htmlFor="resume-lang">{t('Language of the downloaded resume')}</Label>
              <p className="text-sm text-muted">{t('Sets the fixed words in the file, such as “Contact” and “Save as PDF”. Your own text stays as you typed it.')}</p>
              <select id="resume-lang" value={resume.style.lang} onChange={(e) => set({ style: { ...resume.style, lang: e.target.value } })} className="min-h-11 w-full rounded-sm border border-muted bg-paper px-3 text-base">
                {LOCALES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <p className="text-sm text-muted">{t('Text switches between dark and white by itself so it stays readable.')}</p>
          </Panel>

          <Panel title={t('Name and contact')} defaultOpen>
            <Field label={t('Full name')} value={p.fullName} onChange={(fullName) => setProfile({ fullName })} />
            <Field label={t('Job title')} hint={t('Short. For example: Graphic Designer.')} value={p.title} onChange={(title) => setProfile({ title })} />
            <Field label={t('Line under your name')} value={p.headline} onChange={(headline) => setProfile({ headline })} />
            <Field label={t('One or two sentences about you')} multiline value={p.summary} onChange={(summary) => setProfile({ summary })} />
            <Field label={t('City, country')} value={p.location} onChange={(location) => setProfile({ location })} />
            <Field label={t('Email')} type="email" value={p.email} onChange={(email) => setProfile({ email })} />
            <Field label={t('Phone (optional)')} type="tel" value={p.phone} onChange={(phone) => setProfile({ phone })} />
            <Field label={t('Small text at the bottom (optional)')} value={p.footerNote} onChange={(footerNote) => setProfile({ footerNote })} />
          </Panel>

          <Panel title={t('Photo (optional)')}>
            <ImageField label={t('Your picture')} shape="portrait" value={p.photo}
              hint={t('A head-and-shoulders portrait works best. It is cropped to 4:5 and stored inside the resume file. The resume looks fine without one.')}
              onPick={pick(readPhoto, (photo) => setProfile({ photo }))} onRemove={() => setProfile({ photo: '' })} />
          </Panel>

          <Panel title={t('Links (GitHub, LinkedIn, portfolio)')}>
            <ListEditor<LinkItem> items={p.links} onChange={(links) => setProfile({ links })} noun="link" label={(l) => l.label} blank={() => ({ label: '', url: '' })}>
              {(l, s) => (<>
                <Field label={t('Name')} value={l.label} onChange={(label) => s({ label })} />
                <Field label={t('Web address')} type="url" hint={t('Paste the full address, starting with https://')} value={l.url} onChange={(url) => s({ url })} />
              </>)}
            </ListEditor>
          </Panel>

          <Panel title={t('QR code (optional)')}>
            <Field label={t('Web address the code opens')} type="url" hint={t('People scan it with their phone camera. Handy on a printed resume. Leave empty for no code.')} value={p.qrUrl} onChange={(qrUrl) => setProfile({ qrUrl })} />
            {p.links.filter((l) => l.label && l.url).length ? (
              <div className="flex flex-wrap gap-2">
                {p.links.filter((l) => l.label && l.url).map((l, i) => (
                  <Button key={i} size="sm" onClick={() => setProfile({ qrUrl: l.url, qrLabel: p.qrLabel || t('Scan for my {label}', { label: l.label }) })}>{t('Use my {label}', { label: l.label })}</Button>
                ))}
              </div>
            ) : null}
            <Field label={t('Text beside the code')} hint={t('For example: Scan for my LinkedIn.')} value={p.qrLabel} onChange={(qrLabel) => setProfile({ qrLabel })} />
            {p.qrUrl.length > 300 ? <p role="status" className="rounded-sm border-2 border-ink p-2.5 text-[15px] font-semibold">{t(COPY.qrTooLong)}</p> : null}
          </Panel>

          <div className="flex items-end justify-between gap-3 border-b-[3px] border-ink pb-2 pt-8">
            <h2 className="text-2xl font-extrabold tracking-tight">{t('Sections')}</h2>
            <p className="text-sm text-muted">{t('Drag the handle to reorder.')}</p>
          </div>
          {resume.sections.length === 0 ? <p className="py-4 text-muted">{t('No sections yet. Add the first one below.')}</p> : null}
          <Sortable ids={resume.sections.map((s) => s.id)} onMove={(from, to) => setSections(moved(resume.sections, from, to))}>
            {resume.sections.map((s) => (
              <SortableRow key={s.id} id={s.id}>
                <Panel title={s.title || t('Untitled section')}
                  handle={<DragHandle what={t('{title} section', { title: s.title || t('untitled') })} />}
                  actions={<RemoveButton what={t('{title} section', { title: s.title || t('untitled') })}
                    onRemove={() => { if (window.confirm(t('Remove the “{title}” section and everything in it?', { title: s.title || t('Untitled') }))) setSections(resume.sections.filter((x) => x.id !== s.id)); }} />}>
                  <SectionForm section={s} onChange={(patch) => setSection(s.id, patch)} pick={pick} />
                </Panel>
              </SortableRow>
            ))}
          </Sortable>
          <div className="pt-5">
            <AddSection onAdd={(type, title) => setSections([...resume.sections, blankSection(type, title)])} />
          </div>
        </div>

        <div className={cn('flex min-h-0 flex-col', pane === 'edit' && 'hidden lg:flex')}>
          <div className="hidden items-center justify-between gap-3 border-b border-rule bg-paper px-4 py-1.5 lg:flex">
            <p className="text-sm text-muted">{t('This is exactly what Download gives you.')}</p>
            <div className="flex gap-1" role="group" aria-label={t('Preview size')}>
              <Button size="sm" variant={phone ? 'ghost' : 'primary'} aria-pressed={!phone} onClick={() => setPhone(false)}><Monitor />{t('Desktop')}</Button>
              <Button size="sm" variant={phone ? 'primary' : 'ghost'} aria-pressed={phone} onClick={() => setPhone(true)}><Smartphone />{t('Phone')}</Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 justify-center"><Preview ref={preview} html={html} phone={phone} /></div>
        </div>
      </div>
    </div>
  );
}

function ColourPicker({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const id = 'colour-' + label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="grid grid-cols-[56px_1fr] items-center gap-x-3">
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="row-span-2 h-12 w-14 cursor-pointer rounded-sm border border-muted bg-paper p-0.5" />
      <Label htmlFor={id}>{label}</Label>
      <p className="text-sm text-muted">{hint}</p>
    </div>
  );
}

function AddSection({ onAdd }: { onAdd: (type: SectionType, title: string) => void }) {
  const t = useT();
  const [name, setName] = useState('');
  const [layout, setLayout] = useState<SectionType>('timeline');
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="primary"><Plus />{t('Add section')}</Button></DialogTrigger>
      <DialogContent title={t('Add a section')} description={t('Pick a ready-made one, or make your own at the bottom. Everything can be renamed afterwards.')}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SECTION_CHOICES.map((choice) => (
            <li key={choice.title}>
              <DialogClose asChild>
                <button type="button" onClick={() => onAdd(choice.type, t(choice.title))} className="h-full w-full rounded-sm border border-muted p-3 text-left hover:border-ink hover:bg-tint">
                  <span className="block font-bold">{t(choice.title)}</span>
                  <span className="block text-sm text-muted">{t(choice.hint)}</span>
                </button>
              </DialogClose>
            </li>
          ))}
        </ul>
        <form className="mt-5 grid gap-3 border-t-[3px] border-ink pt-4" onSubmit={(e) => e.preventDefault()}>
          <h3 className="text-lg font-extrabold">{t('Custom section')}</h3>
          <Field label={t('Section name')} hint={t('Anything you like: Publications, Hobbies, Military service…')} value={name} onChange={setName} />
          <div className="grid gap-1">
            <Label htmlFor="custom-layout">{t('How it is laid out')}</Label>
            <select id="custom-layout" value={layout} onChange={(e) => setLayout(e.target.value as SectionType)} className="min-h-11 w-full rounded-sm border border-muted bg-paper px-3 text-base">
              {LAYOUT_CHOICES.map((l) => <option key={l.type} value={l.type}>{t(l.name)}: {t(l.hint)}</option>)}
            </select>
          </div>
          <div>
            <DialogClose asChild>
              <Button variant="primary" type="submit" disabled={!name.trim()} onClick={() => { onAdd(layout, name.trim()); setName(''); }}><Plus />{t('Add custom section')}</Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionForm({ section: s, onChange, pick }: { section: Section; onChange: (patch: Partial<Section>) => void; pick: PickImage }) {
  const t = useT();
  const common = (<>
    <Field label={t('Section title')} value={s.title} onChange={(title) => onChange({ title })} />
    <Field label={t('Small note under the title (optional)')} value={s.note} onChange={(note) => onChange({ note })} />
  </>);
  if (s.type === 'text') {
    return (<>
      {common}
      <Field label={t('Headline')} value={s.lead} onChange={(lead) => onChange({ lead })} />
      <Field label={t('Paragraph')} multiline rows={4} value={s.body} onChange={(body) => onChange({ body })} />
      <p className="text-[15px] font-bold">{t('Quick facts')}</p>
      <ListEditor items={s.facts} onChange={(facts) => onChange({ facts })} noun="fact" label={(f) => f.label} blank={() => ({ label: '', value: '' })}>
        {(f, set) => (<>
          <Field label={t('Label')} hint={t('For example: Based in, Now, Languages.')} value={f.label} onChange={(label) => set({ label })} />
          <Field label={t('Text')} value={f.value} onChange={(value) => set({ value })} />
        </>)}
      </ListEditor>
    </>);
  }
  if (s.type === 'timeline') {
    return (<>
      {common}
      <ListEditor items={s.items} onChange={(items) => onChange({ items })} noun="entry" label={(i) => [i.title, i.org].filter(Boolean).join(', ')}
        blank={blankEntry}>
        {(i, set) => (<>
          <Field label={t('Title')} hint={t('Job title or qualification.')} value={i.title} onChange={(title) => set({ title })} />
          <Field label={t('Organisation')} hint={t('Company, school, club or society.')} value={i.org} onChange={(org) => set({ org })} />
          <ImageField label={t('Organisation icon (optional)')} hint={t('A small logo shown beside the title.')} value={i.logo} onPick={pick(readLogo, (logo) => set({ logo }))} onRemove={() => set({ logo: '' })} />
          <Field label={t('Dates')} hint={t('For example: Apr 2024 – Present.')} value={i.when} onChange={(when) => set({ when })} />
          <Field label={t('Place (optional)')} value={i.where} onChange={(where) => set({ where })} />
          <Field label={t('Short description (optional)')} multiline value={i.body} onChange={(body) => set({ body })} />
          <BulletsEditor label={t('Bullet points')} hint={t('One short line each. Press Enter for the next one. Drag to reorder.')} items={i.bullets} onChange={(bullets) => set({ bullets })} />
          <p className="text-[15px] font-bold">{t('Projects (optional)')}</p>
          <ListEditor items={i.points} onChange={(points) => set({ points })} noun="project" label={(pt) => pt.title} blank={() => ({ title: '', desc: '', stack: '', bullets: [] as string[] })}>
            {(pt, setPt) => (<>
              <Field label={t('Title')} value={pt.title} onChange={(title) => setPt({ title })} />
              <Field label={t('What it was, your part, the result')} multiline rows={4} hint={t('One to three sentences. Numbers help: team size, users, time saved.')} value={pt.desc} onChange={(desc) => setPt({ desc })} />
              <BulletsEditor label={t('Bullet points (optional)')} items={pt.bullets} onChange={(bullets) => setPt({ bullets })} />
              <Field label={t('Tools used (optional)')} hint={t('For example: Java · Quarkus · PostgreSQL')} value={pt.stack} onChange={(stack) => setPt({ stack })} />
            </>)}
          </ListEditor>
        </>)}
      </ListEditor>
    </>);
  }
  if (s.type === 'tags') {
    return (<>
      {common}
      <ListEditor items={s.groups} onChange={(groups) => onChange({ groups })} noun="group" label={(g) => g.name} blank={() => ({ name: '', items: [] as string[] })}>
        {(g, set) => (<>
          <Field label={t('Group name')} value={g.name} onChange={(name) => set({ name })} />
          <TagsField value={g.items} onChange={(items) => set({ items })} />
        </>)}
      </ListEditor>
    </>);
  }
  if (s.type === 'levels') {
    return (<>
      {common}
      <ListEditor items={s.items} onChange={(items) => onChange({ items })} noun="item" label={(i) => [i.name, i.label].filter(Boolean).join(', ')} blank={() => ({ name: '', label: '', level: 0 })}>
        {(i, set) => (<>
          <Field label={t('Name')} hint={t('For example: English.')} value={i.name} onChange={(name) => set({ name })} />
          <Field label={t('Level in words (optional)')} hint={t('For example: Native, Fluent, Conversational, Basic.')} value={i.label} onChange={(label) => set({ label })} />
          <fieldset>
            <legend className="mb-1 text-[15px] font-semibold">Level shown as dots</legend>
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={cn('flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm border px-2 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3', i.level === n ? 'border-2 border-ink bg-ink text-paper' : 'border-muted hover:bg-tint')}>
                  <input type="radio" className="sr-only" checked={i.level === n} onChange={() => set({ level: n })} />
                  {n === 0 ? t('None') : n}
                </label>
              ))}
            </div>
          </fieldset>
        </>)}
      </ListEditor>
    </>);
  }
  if (s.type === 'gallery') {
    return (<>
      {common}
      <ListEditor items={s.items} onChange={(items) => onChange({ items })} noun="picture" label={(i) => i.caption || (i.image ? t('Picture') : '')} blank={() => ({ image: '', caption: '' })}>
        {(i, set) => (<>
          <ImageField label={t('Picture')} shape="wide" hint={t('JPG or PNG. Large pictures are shrunk to fit.')} value={i.image} onPick={pick(readPicture, (image) => set({ image }))} onRemove={() => set({ image: '' })} />
          <Field label={t('Caption (optional)')} hint={t('Also read aloud by screen readers, so say what the picture shows.')} value={i.caption} onChange={(caption) => set({ caption })} />
        </>)}
      </ListEditor>
    </>);
  }
  return (<>
    {common}
    <ListEditor items={s.items} onChange={(items) => onChange({ items })} noun="item" label={(i) => i.name} blank={() => ({ name: '', url: '', meta: '', desc: '' })}>
      {(i, set) => (<>
        <Field label={t('Name')} value={i.name} onChange={(name) => set({ name })} />
        <Field label={t('Link (optional)')} type="url" value={i.url} onChange={(url) => set({ url })} />
        <Field label={t('Small note (optional)')} hint={t("Shown on the right. For example: a year, an expiry date, or a person's role.")} value={i.meta} onChange={(meta) => set({ meta })} />
        <Field label={t('Description (optional)')} hint={t('For a reference: how you know them and how to reach them.')} multiline value={i.desc} onChange={(desc) => set({ desc })} />
      </>)}
    </ListEditor>
  </>);
}

/** Skills typed as one comma-separated line. Keeps what you typed (including a trailing comma) while you are typing. */
function TagsField({ value, onChange }: { value: string[]; onChange: (items: string[]) => void }) {
  const t = useT();
  const [text, setText] = useState(value.join(', '));
  return (
    <Field label={t('Items')} multiline hint={t('Separate each one with a comma.')} value={text}
      onChange={(v) => { setText(v); onChange(v.split(',').map((x) => x.trim()).filter(Boolean)); }} />
  );
}
