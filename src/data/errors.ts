export type StorageErrorKind = 'quota' | 'unavailable' | 'version' | 'integrity' | 'conflict' | 'unknown';

const MESSAGES: Record<StorageErrorKind, string> = {
  quota:
    'Espace de stockage insuffisant (iPhone plein ou limite de Safari atteinte). Rien n’a été enregistré : libère de l’espace puis réessaie.',
  unavailable:
    'Le stockage local est indisponible (navigation privée ou erreur de Safari). Rien n’a été enregistré : ferme complètement VYRO puis rouvre-le.',
  version:
    'Ces données ont été créées par une version plus récente de VYRO. Recharge l’application pour obtenir la mise à jour.',
  integrity: 'Des données enregistrées semblent abîmées. Elles n’ont pas été modifiées ni effacées.',
  conflict: 'Cet élément existe déjà : rien n’a été remplacé.',
  unknown: 'Erreur de stockage inattendue. Rien n’a été enregistré.',
};

/** Erreur de stockage avec un message compréhensible et une catégorie exploitable par l'interface. */
export class StorageError extends Error {
  constructor(
    readonly kind: StorageErrorKind,
    options?: { cause?: unknown; detail?: string },
  ) {
    super(options?.detail ? `${MESSAGES[kind]} (${options.detail})` : MESSAGES[kind], { cause: options?.cause });
    this.name = 'StorageError';
  }
}

/** Noms d'erreurs IndexedDB / Dexie, y compris celles imbriquées (`inner`, `cause`). */
function errorNames(error: unknown, depth = 0): string[] {
  if (typeof error !== 'object' || error === null || depth > 4) return [];
  const { name, inner, cause } = error as { name?: unknown; inner?: unknown; cause?: unknown };
  return [...(typeof name === 'string' ? [name] : []), ...errorNames(inner, depth + 1), ...errorNames(cause, depth + 1)];
}

export function toStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  const names = errorNames(error);
  const has = (...candidates: string[]) => candidates.some((candidate) => names.includes(candidate));

  if (has('QuotaExceededError')) return new StorageError('quota', { cause: error });
  if (has('VersionError', 'UpgradeError')) return new StorageError('version', { cause: error });
  if (has('ConstraintError')) return new StorageError('conflict', { cause: error });
  if (has('DataError', 'DataCloneError')) return new StorageError('integrity', { cause: error });
  if (
    has('MissingAPIError', 'OpenFailedError', 'InvalidStateError', 'DatabaseClosedError', 'UnknownError', 'SecurityError')
  ) {
    return new StorageError('unavailable', { cause: error });
  }
  return new StorageError('unknown', { cause: error });
}

/** Exécute une opération de stockage et convertit toute erreur en `StorageError`. */
export async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toStorageError(error);
  }
}
