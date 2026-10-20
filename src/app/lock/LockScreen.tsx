import { Lock } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { deleteAllData } from '../../data/maintenance';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useLock } from './LockContext';

export function LockScreen() {
  const { unlock } = useLock();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [wiping, setWiping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code || checking) return;
    setChecking(true);
    setError(null);
    try {
      const result = await unlock(code);
      if (result.ok) return;
      setCode('');
      setError(
        result.reason === 'wait'
          ? `Trop d’essais. Réessaie dans ${result.retryInSeconds} s.`
          : result.retryInSeconds > 0
            ? `Code incorrect. Prochain essai possible dans ${result.retryInSeconds} s.`
            : 'Code incorrect.',
      );
      inputRef.current?.focus();
    } catch {
      setError('Vérification impossible (erreur de stockage). Ferme puis rouvre VYRO.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="animate-screen-in text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-volt-600/15 text-volt-400">
          <Lock aria-hidden size={28} />
        </span>
        <h1 className="mt-6 font-display text-2xl font-bold text-snow">VYRO est verrouillé</h1>
        <p className="mt-2 text-sm text-mist">Saisis ton code pour continuer.</p>
      </div>

      <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-4">
        <label htmlFor="unlock-code" className="sr-only">
          Code de verrouillage
        </label>
        <input
          ref={inputRef}
          id="unlock-code"
          type="password"
          autoComplete="off"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'unlock-error' : undefined}
          className="min-h-14 w-full rounded-xl border border-ink-700 bg-ink-900 px-4 text-center text-xl tracking-[0.3em] text-snow focus:border-volt-500 focus:outline-none"
        />
        {error && (
          <div id="unlock-error">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <Button type="submit" block busy={checking} disabled={!code}>
          Déverrouiller
        </Button>
      </form>

      <button type="button" onClick={() => setForgot(true)} className="mt-6 min-h-11 text-sm text-mist active:text-snow">
        Code oublié ?
      </button>

      <ConfirmDialog
        open={forgot}
        title="Code oublié"
        confirmLabel="Tout effacer"
        tone="danger"
        requireText="EFFACER"
        busy={wiping}
        onCancel={() => setForgot(false)}
        onConfirm={() => {
          setWiping(true);
          void deleteAllData().finally(() => window.location.reload());
        }}
      >
        <p>
          Le code n’est enregistré nulle part : il ne peut pas être récupéré. La seule solution est d’effacer toutes les
          données de VYRO sur cet iPhone et de recommencer.
        </p>
      </ConfirmDialog>
    </main>
  );
}
