import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Mot à recopier pour confirmer une action irréversible. */
  requireText?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Fenêtre de confirmation. Fermée, elle n'est pas montée : sa saisie repart de zéro à chaque ouverture. */
export function ConfirmDialog({ open, ...props }: ConfirmDialogProps) {
  return open ? <DialogPanel {...props} /> : null;
}

function DialogPanel({
  title,
  children,
  confirmLabel,
  tone = 'primary',
  requireText,
  busy = false,
  onConfirm,
  onCancel,
}: Omit<ConfirmDialogProps, 'open'>) {
  const titleId = useId();
  const [typed, setTyped] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const confirmed = !requireText || typed.trim().toUpperCase() === requireText;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-md animate-screen-in rounded-2xl border border-ink-700 bg-ink-900 p-5 shadow-2xl focus:outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold text-snow">
          {title}
        </h2>
        {children && <div className="mt-2 space-y-2 text-sm text-mist">{children}</div>}
        {requireText && (
          <label className="mt-4 block text-sm text-snow">
            Écris <strong>{requireText}</strong> pour confirmer
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-3 text-snow focus:border-volt-500 focus:outline-none"
            />
          </label>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Annuler
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={!confirmed} busy={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
