import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom n'implémente pas le défilement (utilisé par ScrollRestoration).
// Remplacement direct (et non vi.spyOn) pour survivre à vi.restoreAllMocks().
Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true });

// WebCrypto (crypto.subtle) est fourni par Node dans l'environnement de test.
if (!globalThis.crypto?.subtle) throw new Error('WebCrypto indisponible dans l’environnement de test');

afterEach(() => {
  cleanup();
});
