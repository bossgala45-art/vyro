import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSettings } from '../../data/hooks';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import { lockoutDelaySeconds } from '../../domain/settings/types';
import { verifyLockCode } from '../../security/lockCode';
import { LogoMark } from '../../ui/Logo';
import { SplashScreen } from '../StatusScreens';
import { LockContext, type LockContextValue, type UnlockResult } from './LockContext';
import { LockScreen } from './LockScreen';

/**
 * Verrouillage VISUEL : quand il est actif, l'application n'est pas affichée du tout
 * (seul l'écran de code l'est). Les données restent lisibles par quiconque accède au
 * stockage de Safari : ce n'est pas un chiffrement.
 */
export function LockProvider({ initiallyLocked, children }: { initiallyLocked: boolean; children: ReactNode }) {
  const settings = useSettings();
  const [lockRequested, setLocked] = useState(initiallyLocked);
  const [obscured, setObscured] = useState(false);
  const hiddenAt = useRef<number | null>(null);
  const verifier = settings?.lock.verifier ?? null;
  // Sans code (désactivé ou données effacées), il n'y a rien à verrouiller.
  const locked = lockRequested && verifier !== null;

  useEffect(() => {
    if (!settings) return;
    const { hideWhenInactive } = settings.privacy;
    const { autoLockMinutes } = settings.lock;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
        if (hideWhenInactive) setObscured(true);
        if (verifier && autoLockMinutes === 0) setLocked(true);
        return;
      }
      setObscured(false);
      const awayMs = hiddenAt.current === null ? 0 : Date.now() - hiddenAt.current;
      hiddenAt.current = null;
      if (verifier && awayMs >= autoLockMinutes * 60_000) setLocked(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [settings, verifier]);

  const unlock = useCallback(async (code: string): Promise<UnlockResult> => {
    const current = await settingsRepository.get();
    const currentVerifier = current.lock.verifier;
    if (!currentVerifier) {
      setLocked(false);
      return { ok: true };
    }
    const waitMs = current.lock.retryAfter ? Date.parse(current.lock.retryAfter) - Date.now() : 0;
    if (waitMs > 0) return { ok: false, reason: 'wait', retryInSeconds: Math.ceil(waitMs / 1000) };

    if (await verifyLockCode(code, currentVerifier)) {
      await settingsRepository.update((s) => ({ ...s, lock: { ...s.lock, failedAttempts: 0, retryAfter: null } }));
      setLocked(false);
      return { ok: true };
    }

    const updated = await settingsRepository.update((s) => {
      const failedAttempts = s.lock.failedAttempts + 1;
      const delay = lockoutDelaySeconds(failedAttempts);
      return {
        ...s,
        lock: {
          ...s.lock,
          failedAttempts,
          retryAfter: delay > 0 ? new Date(Date.now() + delay * 1000).toISOString() : null,
        },
      };
    });
    return { ok: false, reason: 'wrong', retryInSeconds: lockoutDelaySeconds(updated.lock.failedAttempts) };
  }, []);

  const value = useMemo<LockContextValue>(
    () => ({ enabled: verifier !== null, lockNow: () => verifier && setLocked(true), unlock }),
    [verifier, unlock],
  );

  if (settings === undefined) return <SplashScreen />;

  return (
    <LockContext.Provider value={value}>
      {locked ? <LockScreen /> : children}
      {obscured && (
        <div aria-hidden className="fixed inset-0 z-[100] grid place-items-center bg-ink-950">
          <LogoMark className="size-16" />
        </div>
      )}
    </LockContext.Provider>
  );
}
