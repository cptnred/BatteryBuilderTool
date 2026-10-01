/**
 * Lädt das PDF über die Oberfläche herunter und rendert es mit pdf.js im Browser.
 * Prüft das Kontrollquadrat auf dem gerenderten Bild (50 mm = 141,73 pt) und legt
 * Bilder der Seiten unter docs/screenshots/pdf_*.png ab.
 */
import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PDFJS = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build');
const SCALE = 2; // CSS-Pixel je pt

async function downloadPdf(
  page: import('@playwright/test').Page,
  setup?: () => Promise<void>,
  button = 'PDF herunterladen',
): Promise<Buffer> {
  await page.goto('/');
  if (setup) await setup();
  await page.getByRole('tab', { name: 'Export' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^fishpaper(_laser)?_\d+S\dP_[\w-]+_\d{4}-\d{2}-\d{2}\.pdf$/);
  return readFileSync(await dl.path());
}

async function renderPdf(page: import('@playwright/test').Page, pdf: Buffer, prefix: string, maxPages = 3) {
  await page.route('http://pdf.local/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/doc.pdf') return route.fulfill({ body: pdf, contentType: 'application/pdf' });
    if (url.pathname === '/')
      return route.fulfill({ body: '<!doctype html><body style="margin:0;background:#888"></body>', contentType: 'text/html' });
    return route.fulfill({ body: readFileSync(join(PDFJS, url.pathname.slice(1))), contentType: 'text/javascript' });
  });
  await page.goto('http://pdf.local/');
  const info = await page.evaluate(
    async ({ scale, maxPages }) => {
      const lib = 'http://pdf.local/pdf.mjs';
      const pdfjs = (await import(/* @vite-ignore */ lib)) as typeof import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = 'http://pdf.local/pdf.worker.mjs';
      const doc = await pdfjs.getDocument({ url: 'http://pdf.local/doc.pdf' }).promise;
      const out: { w: number; h: number; square: number }[] = [];
      for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
        const p = await doc.getPage(i);
        const vp = p.getViewport({ scale });
        const c = document.createElement('canvas');
        c.width = vp.width;
        c.height = vp.height;
        c.id = `p${i}`;
        c.style.display = 'block';
        c.style.marginBottom = '8px';
        document.body.appendChild(c);
        const ctx = c.getContext('2d')!;
        await p.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
        // Kontrollquadrat: linke untere Ecke bei (10 mm, H − 10 mm); dunkle Pixel der Unterkante zählen
        const mm = (72 / 25.4) * scale;
        const y = Math.round(vp.height - 10 * mm);
        const row = ctx.getImageData(0, y - 1, vp.width, 3).data;
        let first = -1;
        let last = -1;
        for (let x = 0; x < vp.width; x++) {
          const dark = [0, 1, 2].some((k) => row[(k * vp.width + x) * 4] < 100);
          if (dark) {
            if (first < 0) first = x;
            last = x;
          }
          if (first >= 0 && x > first + 60 * mm) break;
        }
        out.push({ w: vp.width, h: vp.height, square: (last - first) / mm });
      }
      return { pages: doc.numPages, out };
    },
    { scale: SCALE, maxPages },
  );
  for (let i = 1; i <= info.out.length; i++)
    await page.locator(`#p${i}`).screenshot({ path: `docs/screenshots/${prefix}_seite${i}.png` });
  return info;
}

test('PDF A4 gekachelt: Kontrollquadrat 50 mm auf dem gerenderten Bild', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  const pdf = await downloadPdf(page);
  const info = await renderPdf(page, pdf, 'pdf_a4', 7);
  expect(info.pages).toBe(7);
  for (const p of info.out) expect(Math.abs(p.square - 50)).toBeLessThan(0.6); // ±1 Pixel bei 5,67 px/mm
});

test('PDF eingebogen + Umschlag + A3', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  const pdf = await downloadPdf(page, async () => {
    await page.locator('details.section > summary', { hasText: 'Fishpaper' }).click(); // Abschnitt aufklappen
    const sec = page.locator('details.section', { hasText: 'Umriss Stirnseiten' });
    await sec.getByRole('radio', { name: 'eingebogen' }).first().check();
    await sec.getByRole('radio', { name: 'eingebogen' }).nth(1).check();
    await sec.getByLabel('Umschlag Umwicklung je Seite').fill('8');
    await page.getByRole('tab', { name: 'Export' }).click();
    await page.getByRole('radio', { name: 'A3' }).check();
  });
  const info = await renderPdf(page, pdf, 'pdf_a3_eingebogen', 3);
  for (const p of info.out) expect(Math.abs(p.square - 50)).toBeLessThan(0.6);
});

test('Laser: PDF und SVG eine Seite, Ebenen farbig, eingebogen mit Umschlag', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  const setup = async () => {
    await page.locator('details.section > summary', { hasText: 'Fishpaper' }).click();
    const sec = page.locator('details.section', { hasText: 'Umriss Stirnseiten' });
    await sec.getByRole('radio', { name: 'eingebogen' }).first().check();
    await sec.getByRole('radio', { name: 'eingebogen' }).nth(1).check();
    await sec.getByLabel('Umschlag Umwicklung je Seite').fill('8');
    await page.getByRole('tab', { name: 'Export' }).click();
    await page.getByRole('radio', { name: 'Laser: alle Teile auf einer Seite' }).check();
    await expect(page.getByTestId('laser-preview')).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/export_laser.png', fullPage: true });
  };
  const pdf = await downloadPdf(page, setup, 'Laser-PDF herunterladen');
  const info = await renderPdf(page, pdf, 'pdf_laser', 1);
  expect(info.pages).toBe(1);
  // SVG herunterladen und im Browser darstellen
  await page.goto('/');
  await setup();
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Laser-SVG herunterladen' }).click(),
  ]);
  expect(dl.suggestedFilename()).toMatch(/^fishpaper_laser_.*\.svg$/);
  const svg = readFileSync(await dl.path(), 'utf8');
  expect(svg).toContain('inkscape:label="00 Schnitt"');
  expect(svg).toMatch(/A[\d.]+ [\d.]+ 0 0 [01] /);
  writeFileSync('docs/screenshots/laser.svg', svg);
  await page.setContent(
    `<body style="margin:0;background:#fff">${svg.replace(/^<\?xml[^>]*>/, '').replace(/width="([\d.]+)mm" height="([\d.]+)mm"/, 'width="$1mm" height="$2mm" style="width:1500px;height:auto"')}</body>`,
  );
  await page.locator('svg').screenshot({ path: 'docs/screenshots/svg_laser.png' });
});
