import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom n'implémente pas le défilement (utilisé par ScrollRestoration).
vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
});
