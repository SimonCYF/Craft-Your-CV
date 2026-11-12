import { useMemo, useRef, useState } from 'react';
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
import type { SaveState } from '@/App';

type PickImage = (read: (file: File) => Promise<string>, then: (dataUrl: string) => void) => (file: File) => void;

interface Props {
  item: StoredResume;
  saveState: SaveState;
  onChange: (patch: Partial<Pick<StoredResume, 'name' | 'resume'>>) => void;
  onBack: () => void;
}

const SCALE_CHOICES: { id: Scale; name: string }[] = [{ id: 'small', name: 'Small' }, { id: 'normal', name: 'Normal' }, { id: 'large', name: 'Large' }, { id: 'xlarge', name: 'Extra large' }];
const SAVE_TEXT: Record<SaveState, string> = { saved: 'Saved in this browser', saving: 'Saving…', failed: 'Not saved. Download to keep your work.' };

export default function Editor({ item, saveState, onChange, onBack }: Props) {
  const say = useToast();
  const { resume } = item;
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
  const pick: PickImage = (read, then) => async (file) => { try { then(await read(file)); } catch { say(COPY.photoFailed); } };

  return (
    <div className="flex h-dvh flex-col bg-tint">
      <header className="on-ink flex flex-wrap items-center gap-x-3 gap-y-2 bg-ink px-3 py-2 text-paper sm:px-5">
        <Button variant="ghost" size="sm" className="text-paper hover:bg-ink-hover" onClick={onBack}><ArrowLeft />My resumes</Button>
        <div className="flex min-w-40 flex-1 items-center gap-2">
          <label htmlFor="resume-name" className="sr-only">Name of this resume (only you see it)</label>
          <Input id="resume-name" value={item.name} onChange={(e) => onChange({ name: e.target.value })} className="max-w-72 border-ink-hover bg-ink-hover font-bold text-paper" />
          <p role="status" className={cn('hidden text-sm sm:block', saveState === 'failed' ? 'font-bold text-accent' : 'text-on-ink-muted')}>{SAVE_TEXT[saveState]}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="border-paper text-paper hover:bg-paper hover:text-ink" onClick={() => preview.current?.print()}><Printer />Save as PDF</Button>
          <Button size="sm" variant="accent" className="border-accent" onClick={() => { downloadResume(resume, item.name); say(COPY.downloadDone); }}><Download />Download</Button>
        </div>
      </header>

      {/* Small screens: switch between the form and the preview */}
      <div className="flex border-b border-rule bg-paper lg:hidden" role="tablist" aria-label="Edit or preview">
        {(['edit', 'preview'] as const).map((k) => (
          <button key={k} role="tab" aria-selected={pane === k} onClick={() => setPane(k)}
            className={cn('min-h-12 flex-1 border-b-[3px] font-bold capitalize', pane === k ? 'border-ink' : 'border-transparent text-muted')}>{k}</button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[440px_minmax(0,1fr)]">
        <div className={cn('min-h-0 overflow-y-auto border-r-2 border-ink bg-paper px-5 pb-16', pane === 'preview' && 'hidden lg:block')}>
          <Panel title="Template, text size and colours" defaultOpen>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-[15px] font-bold">Template</legend>
              {TEMPLATES.map((t) => {
                const on = resume.style.template === t.id;
                return (
                  <label key={t.id} className={cn('flex cursor-pointer items-start gap-3 rounded-sm border p-3', on ? 'border-2 border-ink bg-tint' : 'border-muted')}>
                    <input type="radio" name="template" className="mt-1 size-5 accent-ink" checked={on} onChange={() => set({ style: { ...resume.style, template: t.id } })} />
                    <span><span className="block font-bold">{t.name}</span><span className="block text-sm text-muted">{t.description}</span></span>
                  </label>
                );
              })}
            </fieldset>
            <fieldset>
              <legend className="mb-1 mt-2 text-[15px] font-bold">Text size</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {SCALE_CHOICES.map((sc) => {
                  const on = resume.style.scale === sc.id;
                  return (
                    <label key={sc.id} className={cn('flex min-h-11 cursor-pointer items-center justify-center rounded-sm border px-1 text-center text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3', on ? 'border-2 border-ink bg-ink text-paper' : 'border-muted hover:bg-tint')}>
                      <input type="radio" name="scale" className="sr-only" checked={on} onChange={() => set({ style: { ...resume.style, scale: sc.id } })} />
                      {sc.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <p className="mt-2 text-[15px] font-bold">Colours: start from a combination</p>
            <div className="grid grid-cols-2 gap-2">
              {COLOUR_PRESETS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => setColors({ main: preset.main, accent: preset.accent, soft: preset.soft })}
                  className="flex min-h-12 items-center gap-2.5 rounded-sm border border-muted bg-paper px-2.5 py-1.5 text-left text-sm font-semibold hover:border-ink hover:bg-tint">
                  <span className="flex h-7 w-11 shrink-0 overflow-hidden rounded-sm border border-ink" aria-hidden="true">
                    <i className="flex-1" style={{ background: preset.main }} /><i className="flex-1" style={{ background: preset.accent }} /><i className="flex-1" style={{ background: preset.soft }} />
                  </span>
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[15px] font-bold">Or pick your own</p>
            <ColourPicker label="Main colour" hint="The large coloured areas and the headings." value={c.main} onChange={(main) => setColors({ main })} />
            <ColourPicker label="Highlight colour" hint="Buttons, underlines and small accents." value={c.accent} onChange={(accent) => setColors({ accent })} />
            <ColourPicker label="Soft background" hint="Lightly tinted areas behind the content." value={c.soft} onChange={(soft) => setColors({ soft })} />
            {contrast(c.accent, c.main) < 3 ? <p role="status" className="rounded-sm border-2 border-ink p-2.5 text-[15px] font-semibold">{COPY.lowContrast}</p> : null}
            <p className="text-sm text-muted">Text switches between dark and white by itself so it stays readable.</p>
          </Panel>

          <Panel title="Name and contact" defaultOpen>
            <Field label="Full name" value={p.fullName} onChange={(fullName) => setProfile({ fullName })} />
            <Field label="Job title" hint="Short. For example: Graphic Designer." value={p.title} onChange={(title) => setProfile({ title })} />
            <Field label="Line under your name" value={p.headline} onChange={(headline) => setProfile({ headline })} />
            <Field label="One or two sentences about you" multiline value={p.summary} onChange={(summary) => setProfile({ summary })} />
            <Field label="City, country" value={p.location} onChange={(location) => setProfile({ location })} />
            <Field label="Email" type="email" value={p.email} onChange={(email) => setProfile({ email })} />
            <Field label="Phone (optional)" type="tel" value={p.phone} onChange={(phone) => setProfile({ phone })} />
            <Field label="Small text at the bottom (optional)" value={p.footerNote} onChange={(footerNote) => setProfile({ footerNote })} />
          </Panel>

          <Panel title="Photo (optional)">
            <ImageField label="Your picture" shape="portrait" value={p.photo}
              hint="A head-and-shoulders portrait works best. It is cropped to 4:5 and stored inside the resume file. The resume looks fine without one."
              onPick={pick(readPhoto, (photo) => setProfile({ photo }))} onRemove={() => setProfile({ photo: '' })} />
          </Panel>

          <Panel title="Links (GitHub, LinkedIn, portfolio)">
            <ListEditor<LinkItem> items={p.links} onChange={(links) => setProfile({ links })} noun="link" label={(l) => l.label} blank={() => ({ label: '', url: '' })}>
              {(l, s) => (<>
                <Field label="Name" value={l.label} onChange={(label) => s({ label })} />
                <Field label="Web address" type="url" hint="Paste the full address, starting with https://" value={l.url} onChange={(url) => s({ url })} />
              </>)}
            </ListEditor>
          </Panel>

          <Panel title="QR code (optional)">
            <Field label="Web address the code opens" type="url" hint="People scan it with their phone camera. Handy on a printed resume. Leave empty for no code." value={p.qrUrl} onChange={(qrUrl) => setProfile({ qrUrl })} />
            {p.links.filter((l) => l.label && l.url).length ? (
              <div className="flex flex-wrap gap-2">
                {p.links.filter((l) => l.label && l.url).map((l, i) => (
                  <Button key={i} size="sm" onClick={() => setProfile({ qrUrl: l.url, qrLabel: p.qrLabel || `Scan for my ${l.label}` })}>Use my {l.label}</Button>
                ))}
              </div>
            ) : null}
            <Field label="Text beside the code" hint="For example: Scan for my LinkedIn." value={p.qrLabel} onChange={(qrLabel) => setProfile({ qrLabel })} />
            {p.qrUrl.length > 300 ? <p role="status" className="rounded-sm border-2 border-ink p-2.5 text-[15px] font-semibold">{COPY.qrTooLong}</p> : null}
          </Panel>

          <div className="flex items-end justify-between gap-3 border-b-[3px] border-ink pb-2 pt-8">
            <h2 className="text-2xl font-extrabold tracking-tight">Sections</h2>
            <p className="text-sm text-muted">Drag the handle to reorder.</p>
          </div>
          {resume.sections.length === 0 ? <p className="py-4 text-muted">No sections yet. Add the first one below.</p> : null}
          <Sortable ids={resume.sections.map((s) => s.id)} onMove={(from, to) => setSections(moved(resume.sections, from, to))}>
            {resume.sections.map((s) => (
              <SortableRow key={s.id} id={s.id}>
                <Panel title={s.title || 'Untitled section'}
                  handle={<DragHandle what={`${s.title || 'untitled'} section`} />}
                  actions={<RemoveButton what={`${s.title || 'untitled'} section`}
                    onRemove={() => { if (window.confirm(`Remove the “${s.title || 'Untitled'}” section and everything in it?`)) setSections(resume.sections.filter((x) => x.id !== s.id)); }} />}>
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
            <p className="text-sm text-muted">This is exactly what Download gives you.</p>
            <div className="flex gap-1" role="group" aria-label="Preview size">
              <Button size="sm" variant={phone ? 'ghost' : 'primary'} aria-pressed={!phone} onClick={() => setPhone(false)}><Monitor />Desktop</Button>
              <Button size="sm" variant={phone ? 'primary' : 'ghost'} aria-pressed={phone} onClick={() => setPhone(true)}><Smartphone />Phone</Button>
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
  const [name, setName] = useState('');
  const [layout, setLayout] = useState<SectionType>('timeline');
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="primary"><Plus />Add section</Button></DialogTrigger>
      <DialogContent title="Add a section" description="Pick a ready-made one, or make your own at the bottom. Everything can be renamed afterwards.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {SECTION_CHOICES.map((choice) => (
            <li key={choice.title}>
              <DialogClose asChild>
                <button type="button" onClick={() => onAdd(choice.type, choice.title)} className="h-full w-full rounded-sm border border-muted p-3 text-left hover:border-ink hover:bg-tint">
                  <span className="block font-bold">{choice.title}</span>
                  <span className="block text-sm text-muted">{choice.hint}</span>
                </button>
              </DialogClose>
            </li>
          ))}
        </ul>
        <form className="mt-5 grid gap-3 border-t-[3px] border-ink pt-4" onSubmit={(e) => e.preventDefault()}>
          <h3 className="text-lg font-extrabold">Custom section</h3>
          <Field label="Section name" hint="Anything you like: Publications, Hobbies, Military service…" value={name} onChange={setName} />
          <div className="grid gap-1">
            <Label htmlFor="custom-layout">How it is laid out</Label>
            <select id="custom-layout" value={layout} onChange={(e) => setLayout(e.target.value as SectionType)} className="min-h-11 w-full rounded-sm border border-muted bg-paper px-3 text-base">
              {LAYOUT_CHOICES.map((l) => <option key={l.type} value={l.type}>{l.name}: {l.hint}</option>)}
            </select>
          </div>
          <div>
            <DialogClose asChild>
              <Button variant="primary" type="submit" disabled={!name.trim()} onClick={() => { onAdd(layout, name.trim()); setName(''); }}><Plus />Add custom section</Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionForm({ section: s, onChange, pick }: { section: Section; onChange: (patch: Partial<Section>) => void; pick: PickImage }) {
  const common = (<>
    <Field label="Section title" value={s.title} onChange={(title) => onChange({ title })} />
    <Field label="Small note under the title (optional)" value={s.note} onChange={(note) => onChange({ note })} />
  </>);
  if (s.type === 'text') {
    return (<>
      {common}
      <Field label="Headline" value={s.lead} onChange={(lead) => onChange({ lead })} />
      <Field label="Paragraph" multiline rows={4} value={s.body} onChange={(body) => onChange({ body })} />
      <p className="text-[15px] font-bold">Quick facts</p>
      <ListEditor items={s.facts} onChange={(facts) => onChange({ facts })} noun="fact" label={(f) => f.label} blank={() => ({ label: '', value: '' })}>
        {(f, set) => (<>
          <Field label="Label" hint="For example: Based in, Now, Languages." value={f.label} onChange={(label) => set({ label })} />
          <Field label="Text" value={f.value} onChange={(value) => set({ value })} />
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
          <Field label="Title" hint="Job title or qualification." value={i.title} onChange={(title) => set({ title })} />
          <Field label="Organisation" hint="Company, school, club or society." value={i.org} onChange={(org) => set({ org })} />
          <ImageField label="Organisation icon (optional)" hint="A small logo shown beside the title." value={i.logo} onPick={pick(readLogo, (logo) => set({ logo }))} onRemove={() => set({ logo: '' })} />
          <Field label="Dates" hint="For example: Apr 2024 – Present." value={i.when} onChange={(when) => set({ when })} />
          <Field label="Place (optional)" value={i.where} onChange={(where) => set({ where })} />
          <Field label="Short description (optional)" multiline value={i.body} onChange={(body) => set({ body })} />
          <BulletsEditor label="Bullet points" hint="One short line each. Press Enter for the next one. Drag to reorder." items={i.bullets} onChange={(bullets) => set({ bullets })} />
          <p className="text-[15px] font-bold">Projects (optional)</p>
          <ListEditor items={i.points} onChange={(points) => set({ points })} noun="project" label={(pt) => pt.title} blank={() => ({ title: '', desc: '', stack: '', bullets: [] as string[] })}>
            {(pt, setPt) => (<>
              <Field label="Title" value={pt.title} onChange={(title) => setPt({ title })} />
              <Field label="What it was, your part, the result" multiline rows={4} hint="One to three sentences. Numbers help: team size, users, time saved." value={pt.desc} onChange={(desc) => setPt({ desc })} />
              <BulletsEditor label="Bullet points (optional)" items={pt.bullets} onChange={(bullets) => setPt({ bullets })} />
              <Field label="Tools used (optional)" hint="For example: Java · Quarkus · PostgreSQL" value={pt.stack} onChange={(stack) => setPt({ stack })} />
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
          <Field label="Group name" value={g.name} onChange={(name) => set({ name })} />
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
          <Field label="Name" hint="For example: English." value={i.name} onChange={(name) => set({ name })} />
          <Field label="Level in words (optional)" hint="For example: Native, Fluent, Conversational, Basic." value={i.label} onChange={(label) => set({ label })} />
          <fieldset>
            <legend className="mb-1 text-[15px] font-semibold">Level shown as dots</legend>
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={cn('flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm border px-2 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3', i.level === n ? 'border-2 border-ink bg-ink text-paper' : 'border-muted hover:bg-tint')}>
                  <input type="radio" className="sr-only" checked={i.level === n} onChange={() => set({ level: n })} />
                  {n === 0 ? 'None' : n}
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
      <ListEditor items={s.items} onChange={(items) => onChange({ items })} noun="picture" label={(i) => i.caption || (i.image ? 'Picture' : '')} blank={() => ({ image: '', caption: '' })}>
        {(i, set) => (<>
          <ImageField label="Picture" shape="wide" hint="JPG or PNG. Large pictures are shrunk to fit." value={i.image} onPick={pick(readPicture, (image) => set({ image }))} onRemove={() => set({ image: '' })} />
          <Field label="Caption (optional)" hint="Also read aloud by screen readers, so say what the picture shows." value={i.caption} onChange={(caption) => set({ caption })} />
        </>)}
      </ListEditor>
    </>);
  }
  return (<>
    {common}
    <ListEditor items={s.items} onChange={(items) => onChange({ items })} noun="item" label={(i) => i.name} blank={() => ({ name: '', url: '', meta: '', desc: '' })}>
      {(i, set) => (<>
        <Field label="Name" value={i.name} onChange={(name) => set({ name })} />
        <Field label="Link (optional)" type="url" value={i.url} onChange={(url) => set({ url })} />
        <Field label="Small note (optional)" hint="Shown on the right. For example: a year, an expiry date, or a person's role." value={i.meta} onChange={(meta) => set({ meta })} />
        <Field label="Description (optional)" hint="For a reference: how you know them and how to reach them." multiline value={i.desc} onChange={(desc) => set({ desc })} />
      </>)}
    </ListEditor>
  </>);
}

/** Skills typed as one comma-separated line. Keeps what you typed (including a trailing comma) while you are typing. */
function TagsField({ value, onChange }: { value: string[]; onChange: (items: string[]) => void }) {
  const [text, setText] = useState(value.join(', '));
  return (
    <Field label="Items" multiline hint="Separate each one with a comma." value={text}
      onChange={(v) => { setText(v); onChange(v.split(',').map((x) => x.trim()).filter(Boolean)); }} />
  );
}
