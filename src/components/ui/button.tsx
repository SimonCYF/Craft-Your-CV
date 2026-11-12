import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* One button, four looks. Flat, 4px radius, no shadows. */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'border-ink bg-ink text-paper hover:bg-ink-hover hover:border-ink-hover',
        accent: 'border-ink bg-accent text-ink hover:bg-accent-hover',
        outline: 'border-ink bg-transparent text-ink hover:bg-ink hover:text-paper',
        ghost: 'border-transparent bg-transparent text-ink hover:bg-tint',
      },
      size: {
        md: 'min-h-11 px-4 text-[15px]',
        sm: 'min-h-10 px-3 text-sm',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} type={asChild ? undefined : (type ?? 'button')} {...props} />;
}
