import { createContext, useContext, useId, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useT } from '@/i18n';

/* The form pieces the editor is built from: a labelled field, a collapsible panel, lists you can drag into order. */

export function Field({ label, value, onChange, hint, multiline, rows = 3, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; multiline?: boolean; rows?: number; type?: string;
}) {
  const id = useId();
  const describedBy = hint ? id + '-h' : undefined;
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p id={id + '-h'} className="text-sm text-muted">{hint}</p> : null}
      {multiline
        ? <Textarea id={id} rows={rows} value={value} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
        : <Input id={id} type={type} autoComplete="off" value={value} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

/* ---------- Drag to reorder ---------- */

export function moved<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/** Wraps a vertical list whose rows can be dragged by their handle (mouse, touch, or keyboard: Space, arrows, Space). */
export function Sortable({ ids, onMove, children }: { ids: string[]; onMove: (from: number, to: number) => void; children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const end = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from >= 0 && to >= 0) onMove(from, to);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={end}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>{children}</SortableContext>
    </DndContext>
  );
}

const HandleContext = createContext<{ attributes: object; listeners: object | undefined; setRef: (el: HTMLElement | null) => void } | null>(null);

/** One draggable row. Put a <DragHandle /> somewhere inside it. */
export function SortableRow({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn(className, isDragging && 'relative z-10 bg-paper shadow-[0_6px_0_-2px_var(--color-ink)]')}>
      <HandleContext.Provider value={{ attributes, listeners, setRef: setActivatorNodeRef }}>{children}</HandleContext.Provider>
    </div>
  );
}

export function DragHandle({ what }: { what: string }) {
  const t = useT();
  const ctx = useContext(HandleContext);
  if (!ctx) return null;
  return (
    <button type="button" ref={ctx.setRef} {...ctx.attributes} {...ctx.listeners} aria-label={t('Drag to move {what}', { what })} title={t('Drag to reorder')}
      className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted hover:bg-tint hover:text-ink active:cursor-grabbing">
      <GripVertical className="size-5" />
    </button>
  );
}

/* ---------- Panels and lists ---------- */

export function Panel({ title, children, defaultOpen = false, actions, handle, level = 'section' }: {
  title: string; children: ReactNode; defaultOpen?: boolean; actions?: ReactNode; handle?: ReactNode; level?: 'section' | 'item';
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const item = level === 'item';
  return (
    <div className={cn(item ? 'rounded-sm border bg-paper pl-1 pr-2' : 'border-b border-rule', item && (open ? 'border-ink' : 'border-rule'))}>
      <div className="flex items-center gap-0.5">
        {handle}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className={cn('flex min-h-12 min-w-0 flex-1 items-center gap-2 text-left font-bold', item ? 'text-base' : 'text-lg')}
        >
          {open ? <Minus className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0" />}
          <span className="truncate">{title}</span>
        </button>
        {actions}
      </div>
      <div id={id} hidden={!open} className={cn('grid grid-cols-1 gap-3.5', item ? 'px-2 pb-3' : 'pb-5')}>
        {open ? children : null}
      </div>
    </div>
  );
}

/** A wrapper that stays closed until opened, then drops down to show what is inside. Keeps a long editor short. */
export function Group({ title, hint, count, children, defaultOpen = false }: { title: string; hint?: string; count?: number; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="mt-3 rounded-sm border-2 border-ink bg-paper">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="flex min-h-14 w-full items-center gap-3 px-3 text-left">
        <ChevronDown className={cn('size-5 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold">{title}</span>
          {hint ? <span className="block truncate text-sm text-muted">{hint}</span> : null}
        </span>
        {count !== undefined ? <span className="rounded-sm bg-ink px-2 text-sm font-bold text-paper">{count}</span> : null}
      </button>
      <div id={id} hidden={!open} className="border-t border-rule px-3 pb-3">{open ? children : null}</div>
    </section>
  );
}

/** One line in the editor: a name and a short summary. "Edit" opens its form in a panel beside the preview. */
export function EditRow({ title, summary, children, handle, actions }: { title: string; summary?: string; children: ReactNode; handle?: ReactNode; actions?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex items-center gap-1 border-b border-rule py-1.5 last:border-b-0">
      {handle}
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate font-bold">{title}</p>
        {summary ? <p className="truncate text-sm text-muted">{summary}</p> : null}
      </div>
      <Dialog>
        <DialogTrigger asChild><Button size="sm"><Pencil />{t('Edit')}</Button></DialogTrigger>
        <DialogContent drawer title={title} description={t('Changes save by themselves and show in the preview.')}>
          <div className="grid grid-cols-1 gap-3.5">{children}</div>
        </DialogContent>
      </Dialog>
      {actions}
    </div>
  );
}

export function RemoveButton({ what, onRemove }: { what: string; onRemove: () => void }) {
  const t = useT();
  return <Button variant="ghost" size="icon" aria-label={t('Remove {what}', { what })} onClick={onRemove}><Trash2 /></Button>;
}

/** A list you can add to, drag into order and remove from: jobs, projects, links, skill groups… */
export function ListEditor<T>({ items, onChange, noun, label, blank, children }: {
  items: T[]; onChange: (items: T[]) => void; noun: string; label: (item: T) => string; blank: () => T;
  children: (item: T, set: (patch: Partial<T>) => void) => ReactNode;
}) {
  const t = useT();
  /* Remount panels when the order or count changes so each keeps the right open state */
  const [stamp, setStamp] = useState(0);
  const [justAdded, setJustAdded] = useState(-1);
  const change = (next: T[], added = -1) => { setJustAdded(added); setStamp((s) => s + 1); onChange(next); };
  const ids = items.map((_, i) => `${stamp}-${i}`);
  return (
    <div className="grid grid-cols-1 gap-2">
      <Sortable ids={ids} onMove={(from, to) => change(moved(items, from, to))}>
        {items.map((item, i) => {
          const name = label(item) || t('New {noun}', { noun: t(noun) });
          return (
            <SortableRow key={ids[i]} id={ids[i]}>
              <Panel
                level="item"
                title={name}
                defaultOpen={i === justAdded}
                handle={<DragHandle what={name} />}
                actions={<RemoveButton what={name} onRemove={() => { if (window.confirm(t('Remove “{name}”?', { name }))) change(items.filter((_, j) => j !== i)); }} />}
              >
                {children(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
              </Panel>
            </SortableRow>
          );
        })}
      </Sortable>
      <div><Button size="sm" onClick={() => change([...items, blank()], items.length)}><Plus />{t('Add {noun}', { noun: t(noun) })}</Button></div>
    </div>
  );
}

/** Bullet points, one box each. Enter adds the next one; pasting several lines makes several bullets. */
export function BulletsEditor({ label, hint, items, onChange }: { label: string; hint?: string; items: string[]; onChange: (items: string[]) => void }) {
  const t = useT();
  const [stamp, setStamp] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const ids = items.map((_, i) => `${stamp}-${i}`);
  const restamp = (next: string[]) => { setStamp((s) => s + 1); onChange(next); };
  const focus = (i: number) => box.current?.querySelectorAll('textarea')[i]?.focus();
  /* Draw the new box before moving the cursor, so fast typing never lands in the old one */
  const addAfter = (i: number) => { const next = items.slice(); next.splice(i + 1, 0, ''); flushSync(() => onChange(next)); focus(i + 1); };
  return (
    <div className="grid grid-cols-1 gap-1.5" ref={box}>
      <p className="text-[15px] font-semibold">{label}</p>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      <Sortable ids={ids} onMove={(from, to) => restamp(moved(items, from, to))}>
        {items.map((text, i) => (
          <SortableRow key={ids[i]} id={ids[i]} className="flex items-start gap-0.5">
            <DragHandle what={t('bullet {n}', { n: i + 1 })} />
            <Textarea
              rows={1}
              value={text}
              aria-label={t('Bullet {n}', { n: i + 1 })}
              className="min-h-11 [field-sizing:content]"
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addAfter(i); }
                if (e.key === 'Backspace' && text === '' && items.length > 0) { e.preventDefault(); flushSync(() => restamp(items.filter((_, j) => j !== i))); if (i > 0) focus(i - 1); }
              }}
              onPaste={(e) => {
                const rows = e.clipboardData.getData('text').split(/\r?\n/).map((r) => r.replace(/^\s*[-•*·]\s*/, '').trim()).filter(Boolean);
                if (rows.length < 2) return;
                e.preventDefault();
                const next = items.slice();
                next.splice(i, text === '' ? 1 : 0, ...rows);
                restamp(next);
              }}
            />
            <RemoveButton what={t('bullet {n}', { n: i + 1 })} onRemove={() => restamp(items.filter((_, j) => j !== i))} />
          </SortableRow>
        ))}
      </Sortable>
      <div><Button size="sm" variant="ghost" onClick={() => addAfter(items.length - 1)}><Plus />{t('Add bullet')}</Button></div>
    </div>
  );
}

/** Pick, preview and remove one picture. */
export function ImageField({ label, hint, value, onPick, onRemove, shape = 'square' }: {
  label: string; hint?: string; value: string; onPick: (file: File) => void; onRemove: () => void; shape?: 'square' | 'portrait' | 'wide';
}) {
  const t = useT();
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        {value ? <img src={value} alt="" className={cn('rounded-sm border border-rule bg-white', shape === 'square' ? 'size-14 object-contain p-0.5' : shape === 'portrait' ? 'aspect-[4/5] w-24 object-cover' : 'max-h-28 w-40 object-contain')} /> : null}
        <input id={id} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
          className="max-w-full text-[15px] file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-sm file:border-2 file:border-solid file:border-ink file:bg-paper file:px-3 file:font-bold"
          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onPick(file); }} />
        {value ? <Button size="sm" onClick={onRemove}>{t('Remove')}</Button> : null}
      </div>
    </div>
  );
}
