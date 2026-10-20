// Génère les icônes PNG de la PWA à partir de scripts/icon-source.svg.
// Utilise le Chromium de Playwright (déjà présent) : aucune dépendance supplémentaire.
// Usage : npm run icons
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = await readFile(`${root}scripts/icon-source.svg`, 'utf8');

// Les icônes "any" ont des coins arrondis ; iOS et les icônes "maskable" appliquent
// leur propre masque, elles restent donc carrées et pleine surface.
const rounded = source.replace('<rect id="bg"', '<rect id="bg" rx="112"');

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, svg: rounded, transparent: true },
  { file: 'public/icons/icon-512.png', size: 512, svg: rounded, transparent: true },
  { file: 'public/icons/icon-maskable-512.png', size: 512, svg: source, transparent: false },
  { file: 'public/apple-touch-icon.png', size: 180, svg: source, transparent: false },
];

await mkdir(`${root}public/icons`, { recursive: true });
await writeFile(`${root}public/favicon.svg`, rounded);

const browser = await chromium.launch();
try {
  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.size, height: target.size } });
    const svg = target.svg.replace('<svg ', `<svg width="${target.size}" height="${target.size}" `);
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    const png = await page.locator('svg').screenshot({ omitBackground: target.transparent });
    await writeFile(`${root}${target.file}`, png);
    await page.close();
    console.log(`✓ ${target.file}`);
  }
} finally {
  await browser.close();
}
