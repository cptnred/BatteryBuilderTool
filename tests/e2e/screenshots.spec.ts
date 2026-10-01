/**
 * Screenshots der vier Presets nach docs/screenshots/ plus Kernabläufe der UI.
 * Die Bilder werden mit reference/bestaetigte-skizzen/ verglichen (von Hand).
 */
import { expect, test } from '@playwright/test';

const SHOTS = 'docs/screenshots';
const PRESETS = [
  { button: '18S2P', file: '18S2P' },
  { button: '32S1P', file: '32S1P' },
  { button: '20S2P', file: '20S2P' },
  { button: '20S2P Splitpack (18S2P + 2S2P)', file: '20S2P_Splitpack' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('Startseite zeigt 18S2P / Molicel P50B als Standard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('summary')).toHaveText(
    '18S2P · Molicel INR-21700-P50B · 36 Zellen · 64,8 V / 75,6 V · 648 Wh · 120 A · 7,8 kW',
  );
  await expect(page.getByRole('button', { name: '18S2P', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

for (const p of PRESETS) {
  test(`Preset ${p.file}`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');
    await page.getByRole('button', { name: p.button, exact: true }).click();
    await expect(page.getByRole('button', { name: p.button, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: `${SHOTS}/${p.file}.png`, fullPage: true });
  });
}

test('Hover hebt Gruppe in allen Ansichten und Knoten in der Tabelle hervor', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  const cell = page.locator('figure[data-pack="P0"][data-face="V"] g.cell').first();
  await cell.hover();
  // Gruppe erscheint in V und H hervorgehoben (2 Zellen je Ansicht)
  await expect(page.locator('figure[data-pack="P0"][data-face="H"] g.cell.is-hl')).toHaveCount(2);
  await page.screenshot({ path: `${SHOTS}/hover.png`, clip: { x: 0, y: 0, width: 1600, height: 1000 } });
});

test('Fishpaper-, Stücklisten- und Export-Tab', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Fishpaper' }).click();
  await expect(page.locator('.fp__part')).toHaveCount(7);
  await page.screenshot({ path: `${SHOTS}/fishpaper.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Stücklisten' }).click();
  await expect(page.getByText('Balancer-Abgriffe B0…B18')).toBeVisible();
  await expect(page.getByTestId('cell-specs')).toContainText('Original-PDF öffnen');
  await expect(page.getByTestId('usable-energy')).toContainText('60 A');
  await page.screenshot({ path: `${SHOTS}/stuecklisten.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Export' }).click();
  await expect(page.locator('.sheet')).not.toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/export.png`, fullPage: true });
});

test('Raster + Abstandhalter verlangt manuelle Abstände, sonst kein Export', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page.getByRole('radio', { name: 'Raster' }).check();
  await page.getByRole('radio', { name: 'Abstandhalter' }).check();
  await expect(page.locator('.stale-banner')).toContainText('„Spalt Reihe“ ist ein Pflichtfeld');
  await page.getByRole('tab', { name: 'Export' }).click();
  await expect(page.getByRole('button', { name: 'PDF herunterladen' })).toBeDisabled();
  await page.screenshot({ path: `${SHOTS}/fehler_abstandhalter.png`, fullPage: true });
  await page.getByLabel('Spalt Reihe').fill('1,5');
  await page.getByLabel('Spalt Lage').fill('1,5');
  await page.getByLabel('Halter-Außenrand').fill('1,2');
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'PDF herunterladen' })).toBeEnabled();
});

test('Ungültige Eingabe wird am Feld markiert, Ansicht ausgegraut', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Zellen je Lage', { exact: true }).fill('7');
  await expect(page.locator('.stale-banner')).toContainText('nicht in volle Lagen à 7');
  await expect(page.locator('.panel.is-stale')).toHaveCount(1);
  await page.getByLabel('S gesamt').fill('abc');
  await expect(page.locator('.field--error')).toHaveCount(1);
});

test('URL-Hash ist teilbar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '32S1P', exact: true }).click();
  await expect(page).toHaveURL(/#c=/);
  const url = page.url();
  const page2 = await page.context().newPage();
  await page2.goto(url);
  await expect(page2.getByTestId('summary')).toContainText('32S1P');
});

test('Mobil 375 px: kein horizontales Scrollen, Konfiguration ausklappbar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `${SHOTS}/mobil_375.png`, fullPage: true });
  await page.getByRole('button', { name: 'Konfiguration' }).click();
  await expect(page.getByLabel('S gesamt')).toBeVisible();
  for (const tab of ['Fishpaper', 'Stücklisten', 'Export']) {
    await page.getByRole('tab', { name: tab }).click();
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(o, tab).toBeLessThanOrEqual(0);
  }
});

test('Dunkles Farbschema', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page.screenshot({ path: `${SHOTS}/dunkel.png` });
});

test('Zellauswahl: JP30 mit zwei Entladewerten, Original-PDF erreichbar', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page.getByTestId('cell-select').selectOption('ampace-jp30');
  await expect(page.getByTestId('summary')).toContainText('Ampace JP30');
  await expect(page.getByTestId('summary')).toContainText('72–112 A');
  await page.getByRole('tab', { name: 'Stücklisten' }).click();
  const link = page.getByRole('link', { name: 'Original-PDF öffnen' });
  const href = await link.getAttribute('href');
  const res = await page.request.get(new URL(href!, page.url()).toString());
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('pdf');
  await page.screenshot({ path: `${SHOTS}/zellspecs_jp30.png`, fullPage: true });
});

test('Booster: Lagenzahl wie der Teilpack, an dem er hängt', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: '20S2P Splitpack (18S2P + 2S2P)', exact: true }).click();
  await expect(page.getByTestId('booster-rows')).toHaveText('Booster: 2 Lagen wie Pack B (hinten) → 2 Zellen je Lage');
  await page.getByLabel('Booster S').fill('3');
  await page.getByLabel('S gesamt').fill('21');
  await expect(page.getByTestId('booster-rows')).toContainText('3 Zellen je Lage');
  await page.screenshot({ path: `${SHOTS}/booster.png`, fullPage: true });
});
