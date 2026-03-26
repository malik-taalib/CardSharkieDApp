import { chromium } from 'playwright';
import { setTimeout } from 'timers/promises';

const DEMO_DIR = '/Volumes/Viv-Ext-1/Development/repos/CardSharkieDApp/demo';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: DEMO_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  // ===== Scene 1: dApp Landing / Lobby =====
  console.log('Scene 1: dApp lobby...');
  await page.goto('https://dapp.cardsharkiegames.com', { waitUntil: 'networkidle' });
  await setTimeout(3000);

  // Scroll down to show stats bar
  await page.mouse.wheel(0, 200);
  await setTimeout(2000);

  // Scroll back up
  await page.mouse.wheel(0, -200);
  await setTimeout(1000);

  // Click "Connect Wallet" button to show RainbowKit modal
  console.log('Scene 2: Wallet connect modal...');
  const connectBtn = page.locator('button:has-text("Connect Wallet")');
  if (await connectBtn.count() > 0) {
    await connectBtn.first().click();
    await setTimeout(3000);
    // Close the modal by pressing Escape
    await page.keyboard.press('Escape');
    await setTimeout(1000);
  }

  // Click "My Games" nav
  console.log('Scene 3: My Games view...');
  const myGamesBtn = page.locator('button:has-text("my games")');
  if (await myGamesBtn.count() > 0) {
    await myGamesBtn.click();
    await setTimeout(2000);
  }

  // Click "Stats" nav
  console.log('Scene 4: Stats view...');
  const statsBtn = page.locator('button:has-text("stats")');
  if (await statsBtn.count() > 0) {
    await statsBtn.click();
    await setTimeout(2000);
  }

  // Back to lobby
  const lobbyBtn = page.locator('button:has-text("lobby")');
  if (await lobbyBtn.count() > 0) {
    await lobbyBtn.click();
    await setTimeout(1000);
  }

  // ===== Scene 5: Basescan Verified Contract =====
  console.log('Scene 5: Basescan verified contract...');
  await page.goto('https://sepolia.basescan.org/address/0xdd49bcb2cB24d89E876888764c0ABeF7B086dd75#code', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await setTimeout(3000);

  // Scroll to show contract source
  await page.mouse.wheel(0, 400);
  await setTimeout(3000);

  // ===== Scene 6: GitHub Repo =====
  console.log('Scene 6: GitHub repo...');
  await page.goto('https://github.com/malik-taalib/CardSharkieDApp', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await setTimeout(3000);

  // Scroll down to show files
  await page.mouse.wheel(0, 300);
  await setTimeout(2000);

  // ===== Scene 7: Test results (run tests output) =====
  console.log('Scene 7: Contract source file...');
  await page.goto('https://github.com/malik-taalib/CardSharkieDApp/blob/main/contracts/CardSharkieEscrow.sol', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await setTimeout(3000);
  await page.mouse.wheel(0, 300);
  await setTimeout(2000);

  // Done
  console.log('Recording complete. Closing...');
  await setTimeout(1000);
  await context.close();
  await browser.close();

  console.log(`\nVideo saved to: ${DEMO_DIR}/`);
  console.log('Convert to MP4 with: ffmpeg -i <video.webm> -c:v libx264 -preset slow -crf 22 demo.mp4');
}

run().catch(console.error);
