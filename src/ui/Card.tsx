import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-ink-700/80 bg-ink-900/80 p-4 shadow-[0_8px_30px_-12px_rgb(31_94_255/0.25)] ${className}`}>
      {children}
    </div>
  );
}
