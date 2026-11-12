import * as React from 'react';
import { cn } from '@/lib/utils';

const base = 'w-full rounded-sm border border-muted bg-paper px-3 py-2 text-base text-ink placeholder:text-muted focus-visible:outline-offset-0';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, 'min-h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'min-h-20 resize-y leading-snug', className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-[15px] font-semibold', className)} {...props} />;
}
