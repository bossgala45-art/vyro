import { useState, type FormEvent } from 'react';
import { useLock } from '../../app/lock/LockContext';
import { StorageError } from '../../data/errors';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { AUTO_LOCK_OPTIONS, type AppSettings, type AutoLockMinutes } from '../../domain/settings/types';
import { createLockVerifier, validateLockCode, verifyLockCode } from '../../security/lockCode';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/fields';

type Mode = 'idle' | 'enable' | 'change' | 'disable';

const AUTO_LOCK_LABELS: Record<AutoLockMinutes, string> = {
  0: 'Immédiatement',
  1: 'Après 1 minute',
  5: 'Après 5 minutes',
  15: 'Après 15 minutes',
};

const errorMessage = (error: unknown) =>
  error instanceof StorageError ? error.message : 'Opération impossible. Rien n’a été modifié.';

export function LockSettings({ settings }: { settings: AppSettings }) {
  const { lockNow } = useLock();
  const enabled = settings.lock.verifier !== null;
  const [mode, setMode] = useState<Mode>('idle');
  const [current, setCurrent] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; code?: string; confirm?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = (next: Mode) => {
    setMode(next);
    setCurrent('');
    setCode('');
    setConfirm('');
    setErrors({});
    setFailure(null);
    if (next !== 'idle') setDone(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (mode !== 'enable' && !current) nextErrors.current = 'Saisis ton code actuel.';
    if (mode !== 'disable') {
      const codeError = validateLockCode(code);
      if (codeError) nextErrors.code = codeError;
      else if (code !== confirm) nextErrors.confirm = 'Les deux codes ne correspondent pas.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setFailure(null);
    try {
      if (mode !== 'enable') {
        const verifier = settings.lock.verifier;
        if (!verifier || !(await verifyLockCode(current, verifier))) {
          setErrors({ current: 'Code actuel incorrect.' });
          return;
        }
      }
      const verifier = mode === 'disable' ? null : await createLockVerifier(code);
      await settingsRepository.update((s) => ({
        ...s,
        lock: { ...s.lock, verifier, failedAttempts: 0, retryAfter: null },
      }));
      setDone(
        mode === 'enable'
          ? 'Verrouillage activé.'
          : mode === 'change'
            ? 'Code modifié.'
            : 'Verrouillage désactivé.',
      );
      reset('idle');
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const setAutoLock = async (minutes: AutoLockMinutes) => {
    try {
      await settingsRepository.update((s) => ({ ...s, lock: { ...s.lock, autoLockMinutes: minutes } }));
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-mist">
        État : <strong className="text-snow">{enabled ? 'activé' : 'désactivé'}</strong>
      </p>

      {done && <Alert tone="info">{done}</Alert>}

      {mode === 'idle' &&
        (enabled ? (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-snow">Reverrouiller quand VYRO passe en arrière-plan</span>
              <select
                value={settings.lock.autoLockMinutes}
                onChange={(event) => void setAutoLock(Number(event.target.value) as AutoLockMinutes)}
                className="min-h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-3 text-snow focus:border-volt-500 focus:outline-none"
              >
                {AUTO_LOCK_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {AUTO_LOCK_LABELS[minutes]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={lockNow}>
                Verrouiller
              </Button>
              <Button variant="secondary" onClick={() => reset('change')}>
                Changer le code
              </Button>
            </div>
            <Button variant="ghost" block onClick={() => reset('disable')}>
              Désactiver le verrouillage
            </Button>
          </div>
        ) : (
          <Button block onClick={() => reset('enable')}>
            Activer le verrouillage
          </Button>
        ))}

      {mode !== 'idle' && (
        <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4 rounded-xl border border-ink-700 bg-ink-950/60 p-3">
          {mode !== 'enable' && (
            <TextField
              name="currentCode"
              label="Code actuel"
              type="password"
              autoComplete="off"
              value={current}
              onChange={setCurrent}
              error={errors.current}
            />
          )}
          {mode !== 'disable' && (
            <>
              <TextField
                name="newCode"
                label={mode === 'change' ? 'Nouveau code' : 'Code'}
                type="password"
                autoComplete="off"
                hint="Au moins 6 caractères (chiffres ou lettres). Il ne pourra pas être récupéré en cas d’oubli."
                value={code}
                onChange={setCode}
                error={errors.code}
              />
              <TextField
                name="confirmCode"
                label="Confirme le code"
                type="password"
                autoComplete="off"
                value={confirm}
                onChange={setConfirm}
                error={errors.confirm}
              />
            </>
          )}
          {failure && <Alert tone="error">{failure}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" busy={busy} className="flex-1" variant={mode === 'disable' ? 'danger' : 'primary'}>
              {mode === 'enable' ? 'Activer' : mode === 'change' ? 'Modifier' : 'Désactiver'}
            </Button>
            <Button variant="secondary" onClick={() => reset('idle')} disabled={busy}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      <details className="rounded-xl border border-ink-700 bg-ink-950/60 p-3 text-sm">
        <summary className="min-h-8 cursor-pointer font-medium text-snow">Ce que le verrouillage protège (ou pas)</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-mist">
          <li>Il empêche d’afficher VYRO sans le code, à l’ouverture et après une absence.</li>
          <li>
            Il s’agit d’un <strong className="text-snow">verrouillage visuel</strong> : les données ne sont pas chiffrées
            sur l’appareil. Le chiffrement des sauvegardes arrive à l’étape 9.
          </li>
          <li>Le code n’est jamais enregistré : seule une empreinte (PBKDF2, 600 000 itérations) l’est.</li>
          <li>Face ID n’est pas accessible à une application web dans cette version.</li>
          <li>La meilleure protection reste le code et Face ID de ton iPhone.</li>
        </ul>
      </details>
    </div>
  );
}
