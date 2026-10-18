import { spawn } from 'child_process';
import fs from 'fs';

async function captureScreen(url, width, height, outputPath, waitMs = 2500, authTokens = null, evaluateFn = null) {
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--user-data-dir=/tmp/chrome-cdp-capture-corr',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  try {
    let versionData;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9225/json/version');
        versionData = await res.json();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    if (!versionData) throw new Error('Chrome CDP failed to start');

    const newPageRes = await fetch('http://127.0.0.1:9225/json/new', { method: 'PUT' });
    const pageData = await newPageRes.json();
    const ws = new WebSocket(pageData.webSocketDebuggerUrl);

    let id = 1;
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const reqId = id++;
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === reqId) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });

    await new Promise((r) => (ws.onopen = r));
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: true,
    });

    if (authTokens) {
      await send('Page.navigate', { url: 'http://localhost:4173/' });
      await new Promise((r) => setTimeout(r, 600));
      await send('Runtime.evaluate', {
        expression: `localStorage.setItem('campaigns_access_token', '${authTokens.accessToken}'); localStorage.setItem('campaigns_refresh_token', '${authTokens.refreshToken}');`,
      });
    }

    await send('Page.navigate', { url });
    
    // Wait for dynamic content to finish loading (up to 8s)
    await send('Runtime.evaluate', {
      expression: `new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const body = document.body ? document.body.innerText : '';
          const hasButtons = body.includes('Back This Campaign') || body.includes('View Details') || body.includes('Activity') || body.includes('Explore') || body.includes('Clean Drinking') || body.includes('Clean Energy');
          if (hasButtons || attempts > 50) {
            clearInterval(interval);
            setTimeout(resolve, 600);
          }
        }, 150);
      })`,
      awaitPromise: true,
    });

    if (evaluateFn) {
      await send('Runtime.evaluate', { expression: evaluateFn, awaitPromise: true });
      await new Promise((r) => setTimeout(r, 600));
    }

    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
    console.log(`Saved ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
    ws.close();
  } finally {
    chrome.kill();
  }
}

async function run() {
  const artifactDir = '/home/sam-sepiol/.gemini/antigravity/brain/1c105991-83fb-4325-9fbe-0ee2baa21fc1';

  console.log('1. Capturing campaign_card_buttons_360x640.png (Explore feed cards)...');
  await captureScreen('http://localhost:4173/explore', 360, 640, `${artifactDir}/campaign_card_buttons_360x640.png`, 3000);

  console.log('2. Capturing campaign_detail_bar_360x640.png (Funding detail sticky bottom bar)...');
  await captureScreen('http://localhost:4173/campaign/f47ac10b-58cc-4372-a567-0e02b2c3d479', 360, 640, `${artifactDir}/campaign_detail_bar_360x640.png`, 3000);

  console.log('3. Capturing campaign_detail_completed_360x640.png (Completed detail sticky bottom bar)...');
  await captureScreen('http://localhost:4173/campaign/06789012-34ab-4cde-8567-89abcdef0123', 360, 640, `${artifactDir}/campaign_detail_completed_360x640.png`, 3000);

  console.log('4. Capturing tabs_header_avatar_360x640.png (Activity tab showing header avatar and 4 tabs)...');
  await captureScreen('http://localhost:4173/activity', 360, 640, `${artifactDir}/tabs_header_avatar_360x640.png`, 3000);

  console.log('5. Capturing explore_header_avatar_360x640.png (Explore tab showing search header avatar)...');
  await captureScreen('http://localhost:4173/explore', 360, 640, `${artifactDir}/explore_header_avatar_360x640.png`, 3000, null, 'window.scrollTo(0, 0)');

  console.log('Captures completed successfully.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
