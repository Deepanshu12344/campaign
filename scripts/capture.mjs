import { spawn } from 'child_process';
import fs from 'fs';

async function captureScreen(url, width, height, outputPath, waitMs = 2500, authTokens = null, evaluateFn = null) {
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--user-data-dir=/tmp/chrome-cdp-capture',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  try {
    let versionData;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9224/json/version');
        versionData = await res.json();
        break;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    if (!versionData) throw new Error('Chrome CDP failed to start');

    const newPageRes = await fetch('http://127.0.0.1:9224/json/new', { method: 'PUT' });
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
      await new Promise((r) => setTimeout(r, 1000));
      await send('Runtime.evaluate', {
        expression: `localStorage.setItem('campaigns_access_token', '${authTokens.accessToken}'); localStorage.setItem('campaigns_refresh_token', '${authTokens.refreshToken}');`,
      });
    }

    await send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, waitMs));

    if (evaluateFn) {
      await send('Runtime.evaluate', { expression: evaluateFn });
      await new Promise((r) => setTimeout(r, 800));
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

  // Obtain creator tokens from API
  let authTokens = null;
  try {
    const authRes = await fetch('https://campaign-admj.onrender.com/api/v1/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'creator@demo.com', password: 'Demo@1234' }),
    });
    if (authRes.ok) {
      const data = await authRes.json();
      authTokens = data.tokens;
      console.log('Successfully obtained auth tokens for creator@demo.com from Render');
    }
  } catch (err) {
    console.warn('Failed to obtain auth tokens:', err);
  }

  console.log('Capturing home_after_360x640.png...');
  await captureScreen('http://localhost:4173/', 360, 640, `${artifactDir}/home_after_360x640.png`, 3500);

  console.log('Capturing home_after_390x844.png...');
  await captureScreen('http://localhost:4173/', 390, 844, `${artifactDir}/home_after_390x844.png`, 3500);

  console.log('Capturing home_feed_after_360x640.png (scrolled to cards)...');
  await captureScreen('http://localhost:4173/', 360, 640, `${artifactDir}/home_feed_after_360x640.png`, 3500, null, 'window.scrollTo(0, 520)');

  console.log('Capturing profile_after_360x640.png (authenticated)...');
  await captureScreen('http://localhost:4173/profile', 360, 640, `${artifactDir}/profile_after_360x640.png`, 3500, authTokens);

  console.log('Capturing profile_after_390x844.png (authenticated)...');
  await captureScreen('http://localhost:4173/profile', 390, 844, `${artifactDir}/profile_after_390x844.png`, 3500, authTokens);

  console.log('Capturing campaign_card_buttons_360x640.png (Explore feed with both button types)...');
  await captureScreen('http://localhost:4173/explore', 360, 640, `${artifactDir}/campaign_card_buttons_360x640.png`, 3500);

  console.log('Capturing campaign_detail_bar_360x640.png (FUNDING status detail sticky bottom bar)...');
  await captureScreen('http://localhost:4173/campaign/f47ac10b-58cc-4372-a567-0e02b2c3d479', 360, 640, `${artifactDir}/campaign_detail_bar_360x640.png`, 3500);

  console.log('Capturing campaign_detail_completed_360x640.png (COMPLETED status detail sticky bottom bar)...');
  await captureScreen('http://localhost:4173/campaign/06789012-34ab-4cde-8567-89abcdef0123', 360, 640, `${artifactDir}/campaign_detail_completed_360x640.png`, 3500);

  console.log('Capturing tabs_avatar_activity_360x640.png (Activity tab header avatar & 4 tabs)...');
  await captureScreen('http://localhost:4173/activity', 360, 640, `${artifactDir}/tabs_avatar_activity_360x640.png`, 3500);

  console.log('All screenshots captured successfully.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
