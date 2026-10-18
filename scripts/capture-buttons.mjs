import { spawn } from 'child_process';
import fs from 'fs';

async function captureScreen(url, width, height, outputPath, waitMs = 2500, evaluateFn = null) {
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--user-data-dir=/tmp/chrome-cdp-capture-btn',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  try {
    let versionData;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9227/json/version');
        versionData = await res.json();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    if (!versionData) throw new Error('Chrome CDP failed to start');

    const newPageRes = await fetch('http://127.0.0.1:9227/json/new', { method: 'PUT' });
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

    await send('Page.navigate', { url });

    // Wait for content
    await send('Runtime.evaluate', {
      expression: `new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const body = document.body ? document.body.innerText : '';
          const ready = body.includes('Back This Campaign') || body.includes('View Details') || body.includes('Create Campaign');
          if (ready || attempts > 50) {
            clearInterval(interval);
            setTimeout(resolve, 500);
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

  // 1. Capture View Details button (Completed campaign) in Explore feed
  console.log('1. Capturing card_view_details_button_360x640.png...');
  await captureScreen(
    'http://localhost:4173/explore',
    360,
    640,
    `${artifactDir}/card_view_details_button_360x640.png`,
    2000,
    `(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const btn = allDivs.find(e => e.innerText && e.innerText.trim() === 'View Details');
      if (btn) {
        btn.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    })()`
  );

  // 2. Capture Back This Campaign button (Funding campaign) in Explore feed
  console.log('2. Capturing card_back_campaign_button_360x640.png...');
  await captureScreen(
    'http://localhost:4173/explore',
    360,
    640,
    `${artifactDir}/card_back_campaign_button_360x640.png`,
    2000,
    `(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const btn = allDivs.find(e => e.innerText && e.innerText.trim() === 'Back This Campaign');
      if (btn) {
        btn.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    })()`
  );

  // 3. Capture Create tab header avatar
  console.log('3. Capturing tabs_header_avatar_create_360x640.png...');
  await captureScreen(
    'http://localhost:4173/create',
    360,
    640,
    `${artifactDir}/tabs_header_avatar_create_360x640.png`,
    2000
  );

  console.log('Done!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
