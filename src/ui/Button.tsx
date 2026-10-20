import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-volt-600 text-white shadow-[0_6px_20px_-6px_rgb(31_94_255/0.6)] active:bg-volt-500',
  secondary: 'border border-ink-700 bg-ink-800 text-snow active:bg-ink-700',
  ghost: 'text-volt-400 active:text-snow',
  danger: 'bg-red-600 text-white active:bg-red-500',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  busy?: boolean;
  block?: boolean;
}

export function Button({
  variant = 'primary',
  busy = false,
  block = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {busy && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
