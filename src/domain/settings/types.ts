/** Empreinte du code de verrouillage : le code lui-même n'est jamais enregistré. */
export interface LockVerifier {
  algorithm: 'PBKDF2-SHA256';
  iterations: number;
  /** Sel aléatoire, encodé en base64. */
  salt: string;
  /** Empreinte dérivée, encodée en base64. */
  hash: string;
}

export const AUTO_LOCK_OPTIONS = [0, 1, 5, 15] as const;
export type AutoLockMinutes = (typeof AUTO_LOCK_OPTIONS)[number];

export interface AppSettings {
  id: 'app';
  privacy: {
    /** Masque l'écran quand VYRO passe en arrière-plan. */
    hideWhenInactive: boolean;
  };
  lock: {
    /** `null` : verrouillage désactivé. */
    verifier: LockVerifier | null;
    /** Délai d'inactivité (en arrière-plan) avant reverrouillage ; 0 = immédiat. */
    autoLockMinutes: AutoLockMinutes;
    failedAttempts: number;
    /** Horodatage ISO avant lequel aucun nouvel essai n'est accepté. */
    retryAfter: string | null;
  };
}

export function defaultSettings(): AppSettings {
  return {
    id: 'app',
    privacy: { hideWhenInactive: true },
    lock: { verifier: null, autoLockMinutes: 1, failedAttempts: 0, retryAfter: null },
  };
}

/**
 * Délai imposé après des essais ratés : libre jusqu'à 4 erreurs, puis 30 s,
 * doublé à chaque erreur supplémentaire (plafonné à 15 min).
 */
export function lockoutDelaySeconds(failedAttempts: number): number {
  const freeAttempts = 4;
  if (failedAttempts <= freeAttempts) return 0;
  return Math.min(30 * 2 ** (failedAttempts - freeAttempts - 1), 15 * 60);
}
