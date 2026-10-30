import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Les tests tournent sur Chromium avec l'émulation d'un iPhone (taille d'écran, tactile,
// user agent). Ce n'est PAS le moteur WebKit de Safari : la validation finale se fait sur
// un vrai iPhone (voir README).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
    // Comme un iPhone réglé en France : fuseau et langue réels de l'utilisateur.
    timezoneId: 'Europe/Paris',
    locale: 'fr-FR',
  },
  projects: [
    {
      name: 'iphone-chromium',
      use: { ...devices['iPhone 15 Pro'], browserName: 'chromium', defaultBrowserType: 'chromium' },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
