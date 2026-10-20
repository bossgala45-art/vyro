import { describe, expect, it } from 'vitest';
import { lockoutDelaySeconds } from '../domain/settings/types';
import { DEFAULT_ITERATIONS, createLockVerifier, validateLockCode, verifyLockCode } from './lockCode';

// Peu d'itérations pour garder des tests rapides ; la valeur réelle est testée à part.
const FAST = 1_000;

describe('code de verrouillage', () => {
  it('utilise 600 000 itérations PBKDF2 par défaut', () => {
    expect(DEFAULT_ITERATIONS).toBe(600_000);
  });

  it('accepte le bon code et refuse un mauvais', async () => {
    const verifier = await createLockVerifier('basket2027', FAST);
    expect(await verifyLockCode('basket2027', verifier)).toBe(true);
    expect(await verifyLockCode('basket2028', verifier)).toBe(false);
    expect(await verifyLockCode('', verifier)).toBe(false);
  });

  it('ne stocke jamais le code en clair', async () => {
    const verifier = await createLockVerifier('monCodeSecret', FAST);
    expect(JSON.stringify(verifier)).not.toContain('monCodeSecret');
    expect(verifier.algorithm).toBe('PBKDF2-SHA256');
  });

  it('utilise un sel aléatoire : deux empreintes du même code diffèrent', async () => {
    const a = await createLockVerifier('basket2027', FAST);
    const b = await createLockVerifier('basket2027', FAST);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('refuse les codes trop faibles', async () => {
    expect(validateLockCode('12345')).toContain('6');
    expect(validateLockCode('111111')).toBeDefined();
    expect(validateLockCode('123456')).toBeDefined();
    expect(validateLockCode('482913')).toBeUndefined();
    await expect(createLockVerifier('123')).rejects.toThrow();
  });
});

describe('délai après des essais ratés', () => {
  it('laisse 4 essais libres puis double le délai, plafonné à 15 minutes', () => {
    expect([0, 4].map(lockoutDelaySeconds)).toEqual([0, 0]);
    expect(lockoutDelaySeconds(5)).toBe(30);
    expect(lockoutDelaySeconds(6)).toBe(60);
    expect(lockoutDelaySeconds(50)).toBe(900);
  });
});
