/**
 * Screenshots der fünf Presets nach docs/screenshots/ plus Kernabläufe der UI.
 * Die Bilder werden mit reference/bestaetigte-skizzen/ verglichen (von Hand).
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const SHOTS = 'docs/screenshots';
/** Zeile der Liste „Aufbau“ aufklappen */
const openRow = (page: Page, id: string) => page.getByTestId(`row-${id}`).locator('summary').click();
const PRESETS = [
  { button: '18S2P', file: '18S2P' },
  { button: '32S1P', file: '32S1P' },
  { button: '20S2P', file: '20S2P' },
  { button: '20S2P Splitpack (18S2P + 2S2P)', file: '20S2P_Splitpack' },
  { button: '30S1P', file: '30S1P' },
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
  await openRow(page, 'stacking');
  await page.getByRole('radio', { name: 'Raster' }).check();
  await openRow(page, 'spacing');
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
  await openRow(page, 'layers');
  await page.getByLabel('Zellen je Lage manuell').check();
  await page.getByLabel('Zellen je Lage', { exact: true }).fill('7');
  await expect(page.locator('.stale-banner')).toContainText('nicht in volle Lagen à 7');
  await expect(page.locator('.panel.is-stale')).toHaveCount(1);
  await page.getByLabel('S gesamt').fill('abc');
  await expect(page.locator('.field--error')).toHaveCount(1);
});

test('URL-Hash ist teilbar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '32S1P', exact: true }).click();
  await expect(page).toHaveURL(/#c2=/);
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
  await openRow(page, 'booster');
  await expect(page.getByTestId('booster-rows')).toHaveText('Booster: 2 Lagen wie Pack B (hinten) → 2 Zellen je Lage');
  await page.getByLabel('Booster S', { exact: true }).fill('3');
  await page.getByLabel('S gesamt').fill('21');
  await expect(page.getByTestId('booster-rows')).toContainText('3 Zellen je Lage');
  await page.screenshot({ path: `${SHOTS}/booster.png`, fullPage: true });
});

const SPLIT_PRESET = '20S2P Splitpack (18S2P + 2S2P)';

test('Booster teilen: Einzelpacks, Brücke im Booster, eigene Lagenzahl', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: SPLIT_PRESET, exact: true }).click();
  await openRow(page, 'booster');
  const row = page.getByTestId('row-booster');
  await expect(row.getByRole('radio', { name: 'innen' })).toHaveCount(0);
  await page.getByLabel('Einzelpacks im Booster').fill('2');
  await expect(row.locator('summary')).toContainText('+ 2S (1 + 1) am Hauptplus');
  await expect(row.getByRole('radio', { name: 'innen' })).toBeChecked();
  await expect(row.getByRole('radio', { name: 'außen' })).toBeDisabled();
  await expect(row.getByText('2S: zu wenige Gruppen für eine andere Aufteilung')).toBeVisible();
  await expect(page.getByTestId('booster-rows')).toHaveText('Booster: 2 Lagen wie Pack B (hinten) → 1 Zelle je Lage');
  await expect(page.locator('figure[data-pack="BOOST0"][data-face="V"]')).toBeVisible();
  await expect(page.locator('figure[data-pack="BOOST1"][data-face="H"]')).toBeVisible();
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  // 4S: Brücke wählbar, natürlich außen (2 + 2), innen teilt 3 + 1
  await page.getByLabel('Booster S', { exact: true }).fill('4');
  await expect(row.getByText('gleichmäßig 2 + 2')).toBeVisible();
  await expect(row.getByRole('radio', { name: 'außen' })).toBeChecked();
  await row.getByRole('radio', { name: 'innen' }).check();
  await expect(row.getByText('ungleich 3 + 1 – Einzelpacks unterschiedlich breit')).toBeVisible();
  await expect(row.locator('summary')).toContainText('+ 4S (3 + 1) am Hauptplus');
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  // nur die Einzelpacks des Boosters sind ungleich breit: Auswahl „Bündig“ erscheint
  await expect(page.getByRole('group', { name: 'Ausrichtung ungleich breiter Teilpacks' })).toBeVisible();
  // eigene Lagenzahl
  await page.getByLabel('Lagen im Booster selbst festlegen').check();
  await page.getByLabel('Lagen im Booster', { exact: true }).fill('1');
  await expect(page.getByTestId('booster-rows')).toHaveText('Booster: 1 Lage → 6 / 2 Zellen je Lage');
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Stücklisten' }).click();
  await expect(page.getByText('Booster gesamt (inkl. 0,5 mm Zwischenlage)')).toBeVisible();
});

test('Booster teilen: Fehler klappt die Zeile „Splitpack“ auf', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: SPLIT_PRESET, exact: true }).click();
  await openRow(page, 'booster');
  await page.getByLabel('Einzelpacks im Booster').fill('2');
  await page.getByTestId('row-booster').locator('summary').click();
  await expect(page.getByTestId('row-booster')).toHaveJSProperty('open', false);
  // 1P: je Einzelpack 1 Zelle, das passt nicht auf 2 Lagen
  await page.getByLabel('P', { exact: true }).fill('1');
  await expect(page.getByTestId('booster-error')).toBeVisible();
  await expect(page.getByTestId('booster-error')).toHaveText(
    'Booster A: 1 Zellen (1S1P) lassen sich nicht auf 2 Lagen aufteilen.',
  );
  await expect(page.locator('.stale-banner')).toContainText(
    'Booster A: 1 Zellen (1S1P) lassen sich nicht auf 2 Lagen aufteilen.',
  );
  await expect(page.locator('.stale-banner')).not.toContainText('Booster-Einzelpack');
  await expect(page.locator('.stale-banner')).not.toContainText('Booster: Zellen je Lage');
  await page.getByLabel('Lagen im Booster selbst festlegen').check();
  await page.getByLabel('Lagen im Booster', { exact: true }).fill('1');
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  // Booster-S kleiner als die Zahl der Einzelpacks: Meldung des Kerns, Zeile trägt die Fehlermarke
  await page.getByLabel('Booster S', { exact: true }).fill('1');
  await expect(page.locator('.stale-banner')).toContainText('Booster: zu wenige Seriengruppen für die Anzahl der Einzelpacks.');
  await expect(page.getByTestId('row-booster')).toHaveClass(/section--error/);
});

for (const shot of [
  {
    file: 'booster-2x1S2P',
    boosterS: '2',
    hint: '2S: zu wenige Gruppen für eine andere Aufteilung',
    summary: '+ 2S (1 + 1) am Hauptplus',
  },
  { file: 'booster-2x2S2P', boosterS: '4', hint: 'gleichmäßig 2 + 2', summary: '+ 4S (2 + 2) am Hauptplus' },
]) {
  test(`Abnahme ${shot.file}`, async ({ page }) => {
    // hoch genug, damit die ganze Zeile „Splitpack“ im Panel sichtbar ist
    await page.setViewportSize({ width: 1600, height: 1400 });
    await page.goto('/');
    await page.getByRole('button', { name: SPLIT_PRESET, exact: true }).click();
    await openRow(page, 'booster');
    const row = page.getByTestId('row-booster');
    await page.getByLabel('Booster S', { exact: true }).fill(shot.boosterS);
    await page.getByLabel('Einzelpacks im Booster').fill('2');
    await expect(row.getByText(shot.hint)).toBeVisible();
    await expect(row.locator('summary')).toContainText(shot.summary);
    await expect(page.locator('.stale-banner')).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/${shot.file}.png`, fullPage: true });
  });
}

test('30S1P: Brücke innen; „außen“ teilt 16 + 14, „innen“ stellt 15 + 15 wieder her', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: '30S1P', exact: true }).click();
  await expect(page.getByTestId('summary')).toContainText('30S1P');
  await expect(page.getByRole('radio', { name: 'innen' })).toBeChecked();
  await expect(page.getByText('gleichmäßig 15 + 15')).toBeVisible();
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  await page.getByRole('radio', { name: 'außen' }).check();
  await expect(page.getByText('ungleich 16 + 14 – Teilpacks unterschiedlich breit')).toBeVisible();
  await expect(page.getByRole('button', { name: '30S1P', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('radio', { name: 'innen' }).check();
  await expect(page.getByRole('button', { name: '30S1P', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('Aufbau-Liste: Zeilen zugeklappt mit Kurzwert, Details klappen auf', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await expect(page.getByTestId('row-packs')).toContainText('2 · 9 + 9');
  await expect(page.getByTestId('row-layers')).toContainText('2 · 9 je Lage');
  await expect(page.getByTestId('row-terminals')).toContainText('− vorne rechts · + hinten rechts');
  await expect(page.getByLabel('Teilpacks im Hauptpack')).toBeHidden();
  await openRow(page, 'packs');
  await expect(page.getByLabel('Teilpacks im Hauptpack')).toBeVisible();
  await page.getByRole('button', { name: '30S1P', exact: true }).click();
  await expect(page.getByTestId('row-layers')).toContainText('2 · 8 + 7');
  await openRow(page, 'layers');
  await expect(page.getByRole('radio', { name: 'oben' })).toBeChecked();
  await page.screenshot({ path: `${SHOTS}/aufbau.png`, fullPage: true });
});

test('„angepasst“ und „Zurück auf Standard“', async ({ page }) => {
  await page.goto('/');
  await openRow(page, 'stacking');
  await page.getByRole('radio', { name: 'nach rechts' }).check();
  await expect(page.getByTestId('row-stacking')).toContainText('angepasst');
  await page.getByTestId('row-stacking').getByRole('button', { name: 'Zurück auf Standard' }).click();
  await expect(page.getByTestId('row-stacking')).not.toContainText('angepasst');
  await expect(page.getByRole('radio', { name: 'nach links' })).toBeChecked();
});

test('Fehler klappt die Zeile von selbst auf', async ({ page }) => {
  await page.goto('/');
  await openRow(page, 'stacking');
  await page.getByRole('radio', { name: 'Raster' }).check();
  await page.getByLabel('S gesamt').fill('30');
  await expect(page.getByTestId('layers-error')).toBeHidden();
  await page.getByLabel('P', { exact: true }).fill('1');
  await expect(page.getByTestId('layers-error')).toBeVisible();
  await expect(page.getByTestId('layers-error')).toContainText('15 Zellen lassen sich nicht auf 2 Lagen aufteilen');
  await expect(page.locator('.stale-banner')).toContainText('15 Zellen lassen sich nicht auf 2 Lagen aufteilen');
  await expect(page.locator('.stale-banner')).not.toContainText('volle Lagen');
});

test('Fehler nur beim Tippen: „Lagen“ klappt wieder zu; ein Teilpack ohne Gruppen ist kein Lagen-Fehler', async ({ page }) => {
  await page.goto('/');
  const layers = page.getByTestId('row-layers');
  const series = page.getByLabel('S gesamt');
  // 18 -> „1“ -> 16: bei „1“ hat der hintere Teilpack keine Gruppe; das meldet der Kern, nicht die Zeile „Lagen“
  await series.fill('');
  await series.pressSequentially('1');
  await expect(page.locator('.stale-banner')).toContainText('Zu wenige Seriengruppen');
  await expect(layers).toHaveJSProperty('open', false);
  await series.pressSequentially('6');
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  await expect(layers).toHaveJSProperty('open', false);
  // 30S1P -> „3“ -> 32: bei „3“ geht eine einzelne Zelle nicht auf 2 Lagen auf; danach ist die Zeile wieder zu
  await page.getByRole('button', { name: '30S1P', exact: true }).click();
  await series.fill('');
  await series.pressSequentially('3');
  await expect(page.getByTestId('layers-error')).toBeVisible();
  await series.pressSequentially('2');
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  await expect(layers).toHaveJSProperty('open', false);
});

test('Fehler in der Zeile selbst behoben: die Zeile bleibt offen', async ({ page }) => {
  await page.goto('/');
  await openRow(page, 'stacking');
  await page.getByRole('radio', { name: 'Raster' }).check();
  await page.getByLabel('S gesamt').fill('30');
  await page.getByLabel('P', { exact: true }).fill('1');
  await expect(page.getByTestId('layers-error')).toBeVisible();
  await page.getByLabel('Lagen', { exact: true }).fill('1');
  await expect(page.getByTestId('layers-error')).toHaveCount(0);
  await expect(page.getByTestId('row-layers')).toHaveJSProperty('open', true);
  await expect(page.getByLabel('Lagen', { exact: true })).toBeVisible();
});

test('Kurzwert „Anschlüsse“: − und + mit Symbol und Farbe', async ({ page }) => {
  await page.goto('/');
  const row = page.getByTestId('row-terminals');
  await expect(row.locator('summary')).toContainText('− vorne rechts · + hinten rechts');
  await expect(row.locator('.pol-text--minus')).toHaveText('−');
  await expect(row.locator('.pol-text--plus')).toHaveText('+');
  const color = (sel: string) => row.locator(sel).evaluate((el) => getComputedStyle(el).color);
  const muted = await color('.section__aside');
  expect(await color('.pol-text--minus')).not.toBe(muted);
  expect(await color('.pol-text--plus')).not.toBe(muted);
  expect(await color('.pol-text--minus')).not.toBe(await color('.pol-text--plus'));
});
