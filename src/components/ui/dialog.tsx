import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, title, description, drawer, ...props }: Omit<DialogPrimitive.DialogContentProps, 'title'> & { title: string; description?: string; /** a panel that slides in from the left so the preview stays visible */ drawer?: boolean }) {
  const t = useT();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50', drawer ? 'bg-ink/25' : 'bg-ink/60')} />
      <DialogPrimitive.Content
        className={cn('fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-sm border-2 border-ink bg-paper p-6', drawer && 'left-0 top-0 h-dvh max-h-dvh w-[min(480px,100vw)] translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0', className)}
        {...props}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-2xl font-extrabold tracking-tight">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="mt-1 text-[15px] text-muted">{description}</DialogPrimitive.Description> : null}
          </div>
          <DialogPrimitive.Close className="grid size-10 shrink-0 place-items-center rounded-sm hover:bg-tint" aria-label={t('Close')}>
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
