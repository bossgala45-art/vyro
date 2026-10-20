import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'error' | 'warning' | 'info';

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  error: { box: 'border-red-500/40 bg-red-500/10 text-red-200', icon: CircleAlert },
  warning: { box: 'border-amber-400/40 bg-amber-400/10 text-amber-100', icon: TriangleAlert },
  info: { box: 'border-volt-500/40 bg-volt-600/10 text-snow', icon: Info },
};

export function Alert({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-3 text-sm ${box}`}>
      <Icon aria-hidden size={18} className="mt-0.5 shrink-0" />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
    </div>
  );
}
