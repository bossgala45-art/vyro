import { createContext, useContext } from 'react';

export type UnlockResult = { ok: true } | { ok: false; reason: 'wrong' | 'wait'; retryInSeconds: number };

export interface LockContextValue {
  /** Un code est configuré. */
  enabled: boolean;
  lockNow: () => void;
  unlock: (code: string) => Promise<UnlockResult>;
}

export const LockContext = createContext<LockContextValue | null>(null);

export function useLock(): LockContextValue {
  const value = useContext(LockContext);
  if (!value) throw new Error('useLock doit être utilisé dans <LockProvider>');
  return value;
}
