import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Les tests tournent sur Chromium avec l'émulation d'un iPhone (taille d'écran, tactile,
// user agent). Les parcours marqués @webkit tournent aussi sur WebKit, le moteur de Safari,
// dans la CI (VYRO_WEBKIT=1). Ce n'est toujours pas un iPhone réel : la validation finale
// se fait sur l'appareil (voir README).
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
    ...(process.env.VYRO_WEBKIT
      ? [{ name: 'iphone-webkit', grep: /@webkit/, use: { ...devices['iPhone 15 Pro'], browserName: 'webkit' as const } }]
      : []),
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
