import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const cardVariants = cva(
  'text-card-foreground flex flex-col gap-6 rounded-xl border transition-all',
  {
    variants: {
      variant: {
        default: 'bg-card',
        elevated: 'bg-card shadow-lg',
        ghost: 'bg-transparent border-0',
        gradient: 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
      },
      status: {
        none: '',
        success: 'border-green-500/30 bg-green-500/5',
        warning: 'border-orange-500/30 bg-orange-500/5',
        error: 'border-destructive/30 bg-destructive/5',
        info: 'border-blue-500/30 bg-blue-500/5',
      },
    },
    defaultVariants: {
      variant: 'default',
      status: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, interactive, status, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, interactive, status }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn('grid auto-rows-min items-start gap-1.5 px-6 pt-6', className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4 data-slot="card-title" className={cn('text-lg font-semibold leading-none', className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6 [&:last-child]:pb-6', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-2 px-6 pb-6', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
