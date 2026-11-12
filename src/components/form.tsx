import { useId, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/* The form pieces the editor is built from: one labelled field, one collapsible panel, one editable list. */

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

export function Panel({ title, children, defaultOpen = false, actions, level = 'section' }: {
  title: string; children: ReactNode; defaultOpen?: boolean; actions?: ReactNode; level?: 'section' | 'item';
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const item = level === 'item';
  return (
    <div className={cn(item ? 'rounded-sm border px-3' : 'border-b border-rule', item && (open ? 'border-ink' : 'border-rule'))}>
      <div className="flex items-center gap-1">
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
      <div id={id} hidden={!open} className={cn('grid gap-3.5', item ? 'pb-3' : 'pb-5')}>
        {open ? children : null}
      </div>
    </div>
  );
}

export function MoveButtons({ index, count, onMove, onRemove, what }: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void; what: string }) {
  return (
    <div className="flex shrink-0">
      <Button variant="ghost" size="icon" aria-label={`Move ${what} up`} disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowUp /></Button>
      <Button variant="ghost" size="icon" aria-label={`Move ${what} down`} disabled={index === count - 1} onClick={() => onMove(index + 1)}><ArrowDown /></Button>
      <Button variant="ghost" size="icon" aria-label={`Remove ${what}`} onClick={onRemove}><Trash2 /></Button>
    </div>
  );
}

export function moved<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

/** A list you can add to, reorder and remove from: jobs, projects, links, skill groups… */
export function ListEditor<T>({ items, onChange, noun, label, blank, children }: {
  items: T[]; onChange: (items: T[]) => void; noun: string; label: (item: T) => string; blank: () => T;
  children: (item: T, set: (patch: Partial<T>) => void) => ReactNode;
}) {
  /* Remount panels when the order or count changes so each keeps the right open state */
  const [stamp, setStamp] = useState(0);
  const [justAdded, setJustAdded] = useState(-1);
  const change = (next: T[], added = -1) => { setJustAdded(added); setStamp((s) => s + 1); onChange(next); };
  return (
    <div className="grid gap-2">
      {items.map((item, i) => {
        const name = label(item) || `New ${noun}`;
        return (
          <Panel
            key={`${stamp}-${i}`}
            level="item"
            title={name}
            defaultOpen={i === justAdded}
            actions={
              <MoveButtons
                index={i}
                count={items.length}
                what={name}
                onMove={(to) => change(moved(items, i, to))}
                onRemove={() => { if (window.confirm(`Remove “${name}”?`)) change(items.filter((_, j) => j !== i)); }}
              />
            }
          >
            {children(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
          </Panel>
        );
      })}
      <div><Button size="sm" onClick={() => change([...items, blank()], items.length)}><Plus />Add {noun}</Button></div>
    </div>
  );
}
