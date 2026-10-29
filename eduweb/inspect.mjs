import { chromium } from 'playwright-core';

async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', msg => {
    if (msg.type() !== 'warning') console.log('[BROWSER]', msg.type(), msg.text());
  });
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const HEADER_H = 60;

  async function scrollToChapter(id) {
    if (id === 'khoi-nguon') {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    } else {
      await page.evaluate(({ id, HEADER_H }) => {
        const el = document.getElementById(id);
        if (el) window.scrollTo({ top: Math.max(0, el.offsetTop - HEADER_H), behavior: 'instant' });
      }, { id, HEADER_H });
    }
    await page.waitForTimeout(400);
  }

  // 0. Hero
  await scrollToChapter('khoi-nguon');
  await page.screenshot({ path: 'shot_00_hero.png' });
  console.log('✓ shot_00_hero.png');

  // 1. Quang Học
  await scrollToChapter('quang-hoc');
  await page.screenshot({ path: 'shot_01_optics.png' });
  console.log('✓ shot_01_optics.png');

  // 2. Ánh Sáng
  await scrollToChapter('anh-sang');
  await page.screenshot({ path: 'shot_02_lighting.png' });
  console.log('✓ shot_02_lighting.png');

  // 3. Dàn Cảnh
  await scrollToChapter('dan-canh');
  await page.screenshot({ path: 'shot_03_blocking.png' });
  console.log('✓ shot_03_blocking.png');

  // 4. Khí Tài
  await scrollToChapter('khi-tai');
  await page.screenshot({ path: 'shot_04_gear.png' });
  console.log('✓ shot_04_gear.png');

  // 5. Tuyển Sinh
  await scrollToChapter('tuyen-sinh');
  await page.screenshot({ path: 'shot_05_admissions.png' });
  console.log('✓ shot_05_admissions.png');

  // Mobile viewport
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(600);

  for (const [id, label] of [
    ['khoi-nguon', 'hero'],
    ['quang-hoc', 'optics'],
    ['anh-sang', 'lighting'],
    ['dan-canh', 'blocking'],
    ['khi-tai', 'gear'],
    ['tuyen-sinh', 'admissions'],
  ]) {
    if (id === 'khoi-nguon') {
      await mobile.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    } else {
      await mobile.evaluate(({ id, HEADER_H }) => {
        const el = document.getElementById(id);
        if (el) window.scrollTo({ top: Math.max(0, el.offsetTop - HEADER_H), behavior: 'instant' });
      }, { id, HEADER_H });
    }
    await mobile.waitForTimeout(300);
    await mobile.screenshot({ path: `mobile_${label}.png` });
    console.log(`✓ mobile_${label}.png`);
  }

  await browser.close();
  console.log('\n✅ All screenshots captured with exact chapter offsets.');
}

main().catch(console.error);
