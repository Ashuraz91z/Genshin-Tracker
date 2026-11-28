// Rend motion/presentation-verticale.html en MP4 vertical 1080×1920, 30 i/s.
// Usage : node motion/render-video.mjs [sortie.mp4] [--stills]
// Nécessite playwright-core (NODE_PATH ou installé) + un Chromium Playwright, et ffmpeg.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(here, 'genshin-tracker-vertical.mp4');
const stills = process.argv.includes('--stills');
const FPS = 30;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(pathToFileURL(path.join(here, 'presentation-verticale.html')).href + '?render');
const DUR = await page.evaluate(() => window.DUR);

if (stills) {
  for (const t of [1, 2.6, 5, 7, 10.5, 15.5, 18.5, 22]) {
    await page.evaluate((t) => window.seek(t), t);
    await page.screenshot({ path: path.join(path.dirname(out), `still-${t}.png`) });
  }
} else {
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let f = 0; f < DUR * FPS; f++) {
    await page.evaluate((t) => window.seek(t), f / FPS);
    if (!ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 95 }))) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
}
await browser.close();
console.log('ok', out);
