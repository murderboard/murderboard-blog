// Screenshot a board route to a wide PNG for Substack.
//   node scripts/shoot-board.mjs <url> [out.png] [width] [scale]
// Run the site first (e.g. `npm run dev`), then point this at the board URL:
//   node scripts/shoot-board.mjs http://localhost:3000/murderboards/rittenhouse-dog-walker/episode-3/ ep3.png
//
// Fits the card bounding box (no empty cork), hides the HUD/legend/controls,
// and captures a retina-crisp image sized to the content's aspect ratio.

import { chromium } from "playwright";

const [, , url, out = "board.png", widthArg = "1600", scaleArg = "2"] = process.argv;
if (!url) {
  console.error("usage: node scripts/shoot-board.mjs <url> [out.png] [width] [scale]");
  process.exit(1);
}
const outW = Number(widthArg);
const scale = Number(scaleArg);
const FIT = 0.94;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: outW, height: outW }, deviceScaleFactor: scale });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-mb="card"]');
  await page.waitForTimeout(600);

  // Measure the card bounding box, size the canvas to its aspect ratio.
  const bbox = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-mb="card"]')];
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const el of cards) {
      const x = el.offsetLeft, y = el.offsetTop;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + el.offsetWidth); maxY = Math.max(maxY, y + el.offsetHeight);
    }
    const pad = 70;
    return { w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
  });
  const outH = Math.round(outW * bbox.h / bbox.w);
  await page.setViewportSize({ width: outW, height: outH });
  await page.waitForTimeout(200);

  await page.evaluate(
    ({ fit }) => {
      const cards = [...document.querySelectorAll('[data-mb="card"]')];
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      for (const el of cards) {
        minX = Math.min(minX, el.offsetLeft); minY = Math.min(minY, el.offsetTop);
        maxX = Math.max(maxX, el.offsetLeft + el.offsetWidth); maxY = Math.max(maxY, el.offsetTop + el.offsetHeight);
      }
      const pad = 70;
      minX -= pad; minY -= pad; maxX += pad; maxY += pad;
      const bw = maxX - minX, bh = maxY - minY;
      const vw = window.innerWidth, vh = window.innerHeight;
      const s = Math.min(vw / bw, vh / bh) * fit;
      const world = document.querySelector('[data-mb="world"]');
      if (world) world.style.transform = `translate(${(vw - bw * s) / 2 - minX * s}px, ${(vh - bh * s) / 2 - minY * s}px) scale(${s})`;
      for (const sel of ['[data-mb="hud"]', '[data-mb="legend"]', '[data-mb="controls"]']) {
        const el = document.querySelector(sel);
        if (el) el.style.display = "none";
      }
    },
    { fit: FIT },
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: out });
  console.log(`Wrote ${out} (${outW}x${outH} @ ${scale}x)`);
} finally {
  await browser.close();
}
