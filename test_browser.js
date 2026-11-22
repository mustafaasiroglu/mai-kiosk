const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { before, after, describe, test } = require('node:test');
const { chromium, webkit } = require('playwright');

const themes = ['snowglobe', 'adface', 'blocky', 'factory', 'space', 'popart'];
const styles = ['constellation', 'metro', 'game', 'magazine'];
const platforms = [
  { name: 'desktop Chromium', browser: 'chromium', viewport: { width: 1440, height: 900 } },
  { name: 'touch mobile Chromium', browser: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'mobile WebKit', browser: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const endpoint = 'https://kiosk-test.services.ai.azure.com';
const key = 'browser-regression-placeholder';
const png = fs.readFileSync(path.join(__dirname, 'assets', 'ulker-logo.png')).toString('base64');
const concept = JSON.parse(fs.readFileSync(path.join(__dirname, 'samples', 'reference-photo', 'pack-cake.json'), 'utf8')).concept;
const browsers = {};
let server, baseURL;

before(async () => {
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  baseURL = `http://localhost:${port}`;
  server = spawn('python', [path.join(__dirname, 'local_server.py'), '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = '';
  server.stderr.on('data', data => { errors = (errors + data).slice(-2000); });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Test server exited (${code}): ${errors}`)));
    server.stdout.once('data', resolve);
  });
  assert.equal((await fetch(baseURL)).status, 200);
  browsers.chromium = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL } : {}),
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  browsers.webkit = await webkit.launch();
}, { timeout: 120000 });

after(async () => {
  await Promise.all(Object.values(browsers).map(browser => browser.close()));
  server?.kill();
});

async function withPage(platform, task) {
  const { name, browser, ...options } = platform;
  const context = await browsers[browser].newContext({ ...options, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const state = { calls: [], errors: [], failure: null };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    window.cameraTest = { calls: 0, streams: [] };
    if (!navigator.mediaDevices) return;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      window.cameraTest.calls++;
      const stream = await original(constraints);
      window.cameraTest.streams.push(stream);
      return stream;
    };
  });
  await page.route('**/local-config', route => route.fulfill({ json: {} }));
  await page.route('https://**/*', async route => {
    const request = route.request();
    assert.ok(request.url().startsWith(endpoint + '/'), 'No real external service may be called by a regression test');
    state.calls.push({ path: new URL(request.url()).pathname, key: request.headers()['api-key'], body: request.postDataBuffer()?.toString('utf8') });
    if (state.failure === 'hold') return;
    if (state.failure === 'network') return route.abort('failed');
    if (state.failure === 'unauthorized') return route.fulfill({ status: 401, json: { error: 'Test authorization failure' } });
    const text = request.url().includes('chat/completions');
    if (text && state.failure === 'invalid-copy') return route.fulfill({ json: { choices: [{ message: { content: '{"name":""}' } }] } });
    await route.fulfill({ json: text
      ? { choices: [{ message: { content: JSON.stringify(concept) } }] }
      : state.failure === 'missing-image' ? { data: [] } : { data: [{ b64_json: png }] } });
  });
  try {
    await task(page, state);
    assert.deepEqual(state.errors, [], `${name}: no uncaught browser exceptions`);
  } catch (error) {
    if (process.env.KIOSK_TEST_ARTIFACTS) {
      fs.mkdirSync(process.env.KIOSK_TEST_ARTIFACTS, { recursive: true });
      await page.screenshot({ path: path.join(process.env.KIOSK_TEST_ARTIFACTS, `failure-${browser}-${Date.now()}.png`), fullPage: true });
    }
    throw error;
  } finally {
    await context.close();
  }
}

async function settingsButton(page) {
  if (await page.locator('#openSidebar').isVisible()) await page.locator('#openSidebar').click();
  await page.locator('[data-action="settings"]').click();
}

async function initialize(page, state, ui, live, scheme = 'light') {
  state.calls.length = 0;
  await page.goto(`${baseURL}/${ui === 'classic' ? '' : 'copilot/'}?scoutTheme=${scheme}`);
  await page.evaluate(() => { CONFIG.sound = false; CONFIG.ambientMotion = false; CONFIG.mock.speed = 0; });
  if (ui === 'classic') {
    if (!live) return page.locator('#connection-demo').click();
    await page.locator('#connection-live').click();
  } else {
    if (ui === 'chat') {
      if (await page.locator('#openSidebar').isVisible()) await page.locator('#openSidebar').click();
      await page.locator('[data-mode="chat"]').click();
      if (await page.evaluate(() => matchMedia('(max-width: 780px)').matches)) {
        await page.locator('#sidebar [data-action="sidebar"]').click();
      }
    }
    if (!live) return;
    await settingsButton(page);
    await page.waitForFunction(() => !document.getElementById('connection').inert);
  }
  const form = page.locator(ui === 'classic' ? '#connection-form' : '#connection');
  await form.locator('[name="endpoint"]').fill(endpoint);
  await form.locator('[name="key"]').fill(key);
  await form.locator('[name="imageModel"]').fill('test-image');
  await form.locator('[name="labModel"]').fill('gpt-test-text');
  await form.locator('[type="submit"]').click();
  await page.waitForFunction(() => CONFIG.ai.mode === 'live');
}

const screen = (page, selector = '') => page.locator(`.screen.is-in${selector ? ' ' + selector : ''}`);
const option = (page, index) => page.locator(`#messages [data-choice="${index}"]`);
const screenIs = (page, id) => page.waitForFunction(value => App.cur.id === value && App.cur.el.classList.contains('is-in'), id);
async function startAgent(page, id) {
  await page.locator(`#cards [data-agent="${id}"]`).click();
  await page.locator('#messages [data-action="start"]').click();
}
async function approve(page, ui, live) {
  if (ui === 'cowork' || live) {
    assert.equal(await page.locator('.artifact').count(), 0);
    await page.locator('#messages [data-action="approve"]').click();
  }
  await page.locator('.artifact img').waitFor();
}
async function output(page, state, ui, live, samplePath) {
  const image = ui === 'classic' ? screen(page, '.res-img') : page.locator('.artifact img').last();
  await image.waitFor();
  await page.waitForFunction(selector => {
    const image = document.querySelector(selector);
    return image?.complete && image.naturalWidth > 0;
  }, ui === 'classic' ? '.screen.is-in .res-img' : '.artifact img');
  assert.equal((await image.getAttribute('src')).startsWith('data:image/jpeg;base64,'), true);
  if (!live) {
    assert.equal(state.calls.length, 0);
    const bytes = Buffer.from((await image.getAttribute('src')).split(',')[1], 'base64');
    assert.deepEqual(bytes, fs.readFileSync(path.join(__dirname, samplePath)));
    assert.equal(await page.evaluate(() => window.cameraTest.calls), 0);
  } else {
    assert.ok(state.calls.length > 0);
    assert.ok(state.calls.every(call => call.key === key));
    assert.deepEqual(await image.evaluate(node => [node.naturalWidth, node.naturalHeight]), [1080, 1350]);
  }
}

async function photoFlow(page, state, ui, live, index) {
  const theme = themes[index];
  await initialize(page, state, ui, live, index % 2 ? 'dark' : 'light');
  if (ui === 'classic') {
    const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
    await screen(page, '[data-go="photo.quiz"]').click();
    await screen(page, '[data-pick]').first().click();
    await screen(page, '[data-go="photo.theme"]').click();
    assert.equal(await screen(page, '[data-act="next"]').isDisabled(), true);
    const card = screen(page, `button[data-theme="${theme}"] .theme-art`);
    await (touch ? card.tap() : card.click());
    if (live) await page.evaluate(() => {
      if (!navigator.mediaDevices) return;
      navigator.mediaDevices.getUserMedia = async () => {
        window.cameraTest.calls++;
        throw new DOMException('Camera permission denied for regression', 'NotAllowedError');
      };
    });
    const next = screen(page, '[data-act="next"]');
    await (touch ? next.tap() : next.click());
    await screenIs(page, 'photo.camera');
    assert.equal(await page.evaluate(() => STATE.photo.themeId), theme);
    if (live) {
      await page.waitForFunction(() => App.cur.el.dataset.state === 'error');
      assert.equal(await page.evaluate(() => STATE.photo.photo || null), null, 'No silent sample substitution');
      await screen(page, '[data-act="demo"]').click();
    } else {
      await screen(page, '[data-act="retake"]').click();
    }
    assert.equal(await page.evaluate(() => STATE.photo.photo), 'sample_photo.jpeg');
    assert.equal(state.calls.length, 0);
    await screen(page, '[data-act="start"]').click();
    await screenIs(page, 'photo.result');
  } else {
    await startAgent(page, 'photo');
    assert.match(await page.locator('#messages .answer-text').last().innerText(), /nasıl bir yıldızsın/);
    assert.equal(await option(page, 0).innerText(), 'Ortama güneş getiren');
    await option(page, 0).click();
    assert.match(await page.locator('#messages .answer-text').last().innerText(), /hangi dünyada/);
    await option(page, index).click();
    assert.match(await page.locator('#messages .answer-text').last().innerText(), live ? /kamerayı açıp/ : /Demo Modu/);
    assert.equal(state.calls.length, 0);
    await page.locator('#messages [data-choice]').filter({ hasText: 'Örnek fotoğrafı kullan' }).click();
    if (ui === 'cowork' || live) assert.equal(state.calls.length, 0, 'No generation before approval');
    await approve(page, ui, live);
  }
  await output(page, state, ui, live, `samples/photo-${theme}.jpg`);
  if (live) {
    assert.equal(state.calls.length, 1);
    assert.equal(state.calls[0].path, '/mai/v1/images/edits');
    assert.match(state.calls[0].body, /name="image"/);
    assert.match(state.calls[0].body, /Cocostar/);
  }
}

async function careerFlow(page, state, ui, live, index) {
  await initialize(page, state, ui, live);
  if (ui === 'classic') {
    await screen(page, '[data-go="career.name"]').click();
    await screen(page, '.career-name-entry').fill('Deniz Yıldız');
    await screen(page, '[data-act="search"]').click();
    await screen(page, '[data-person]').first().click();
    await screen(page, '[data-act="confirm"]').click();
    await screen(page, '[data-act="next"]').click();
    await screen(page, `[data-style="${styles[index]}"]`).click();
    await screen(page, '[data-act="next"]').click();
    await screenIs(page, 'career.result');
  } else {
    await startAgent(page, 'career');
    await option(page, 0).click();
    await option(page, 0).click();
    await option(page, index).click();
    await approve(page, ui, live && ui === 'cowork');
  }
  await output(page, state, ui, live, 'samples/career-styles/constellation.jpg');
  if (live) {
    assert.equal(state.calls.length, 1);
    assert.equal(state.calls[0].path, '/mai/v1/images/generations');
    assert.equal(JSON.parse(state.calls[0].body).model, 'test-image');
  }
}

async function labFlow(page, state, ui, live, index) {
  await initialize(page, state, ui, live);
  const picks = await page.evaluate(index => ({
    base: LAB_BASES[index % LAB_BASES.length].id,
    flavors: LAB_FLAVORS.slice(index * 2, index * 2 + 2).map(item => ({ id: item.id, name: item.name })),
    moment: LAB_MOMENTS[index].id,
  }), index);
  if (ui === 'classic') {
    await screen(page, '[data-go="lab.base"]').click();
    await screen(page, `[data-base="${picks.base}"]`).click();
    for (const flavor of picks.flavors) await screen(page, `[data-flavor="${flavor.id}"]`).click();
    assert.match(await screen(page, '.pick-count').innerText(), /2 \/ 2/);
    await screen(page, '[data-act="next"]').click();
    await screen(page, `[data-moment="${picks.moment}"]`).click();
    await screen(page, '[data-act="next"]').click();
    await screenIs(page, 'lab.result');
  } else {
    await startAgent(page, 'lab');
    await option(page, index % 4).click();
    await page.locator('#message').fill(picks.flavors.map(flavor => flavor.name).join(' ve '));
    await page.locator('#send').click();
    await option(page, index).click();
    await approve(page, ui, live && ui === 'cowork');
  }
  await output(page, state, ui, live, 'samples/reference-photo/pack-cake.jpg');
  if (live) {
    assert.deepEqual(state.calls.map(call => call.path), ['/openai/v1/chat/completions', '/mai/v1/images/edits']);
    const text = JSON.parse(state.calls[0].body);
    assert.equal(text.model, 'gpt-test-text');
    assert.equal(text.response_format.type, 'json_schema');
    for (const flavor of picks.flavors) assert.ok(text.messages.at(-1).content.includes(flavor.name));
  }
}

describe('complete kiosk, Chat and Cowork scenario matrix', { concurrency: 3 }, () => {
  for (const platform of platforms) for (const ui of ['classic', 'cowork', 'chat']) for (const live of [false, true]) {
    const label = `${platform.name} / ${ui} / ${live ? 'Live (intercepted)' : 'Demo'}`;
    for (const [name, flow, count] of [['six photo themes', photoFlow, 6], ['four career styles', careerFlow, 4], ['twelve flavors, six moments and four bases', labFlow, 6]]) {
      test(`${label}: ${name}`, { timeout: 180000 }, () => withPage(platform, async (page, state) => {
        for (let i = 0; i < count; i++) await flow(page, state, ui, live, i);
      }));
    }
  }
});

describe('home card layout', { concurrency: 3 }, () => {
  for (const platform of [
    ...platforms,
    { name: 'wide desktop Chromium', browser: 'chromium', viewport: { width: 1920, height: 1080 } },
    { name: 'short landscape Chromium', browser: 'chromium', viewport: { width: 812, height: 375 } },
  ]) {
    test(`${platform.name}: equal inset thumbnails and a centered start hint`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'classic', false);
      await page.waitForFunction(() => App.cur.el.classList.contains('is-settled'));
      const measure = () => page.evaluate(() => {
        const cards = [...App.cur.el.querySelectorAll('.exp-card')].map(card => {
          const bounds = card.getBoundingClientRect();
          const art = card.querySelector('.exp-art').getBoundingClientRect();
          const cta = card.querySelector('.exp-cta').getBoundingClientRect();
          return {
            height: bounds.height, artHeight: art.height, inset: art.left - bounds.left,
            rightInset: bounds.right - art.right, topInset: art.top - bounds.top,
            ctaBottom: bounds.bottom - cta.bottom, ctaVisible: cta.bottom <= bounds.bottom,
          };
        });
        const hint = App.cur.el.querySelector('.tap-hint'), bounds = hint.getBoundingClientRect();
        return {
          cards, center: bounds.left + bounds.width / 2, viewport: innerWidth,
          font: parseFloat(getComputedStyle(hint).fontSize), bottom: bounds.bottom, viewportHeight: innerHeight,
          notices: App.cur.el.querySelectorAll('.home-foot .fine').length,
          portrait: matchMedia('(orientation: portrait)').matches,
        };
      });
      const check = data => {
        assert.equal(data.cards.length, 3);
        assert.ok(Math.max(...data.cards.map(card => card.height)) - Math.min(...data.cards.map(card => card.height)) < 1);
        assert.ok(Math.max(...data.cards.map(card => card.artHeight)) - Math.min(...data.cards.map(card => card.artHeight)) < 1);
        assert.ok(Math.max(...data.cards.map(card => card.ctaBottom)) - Math.min(...data.cards.map(card => card.ctaBottom)) < 1);
        for (const card of data.cards) {
          assert.ok(card.inset >= 10 && card.topInset >= 10);
          if (!data.portrait) {
            assert.ok(card.rightInset >= 10);
            assert.ok(card.artHeight / card.height < 0.4, 'Landscape thumbnails occupy less than 40% of the card');
          }
          assert.equal(card.ctaVisible, true);
        }
        assert.ok(Math.abs(data.center - data.viewport / 2) < 1);
        assert.ok(data.font >= 14);
        assert.ok(data.bottom <= data.viewportHeight);
        assert.equal(data.notices, 0);
      };
      check(await measure());
      if (process.env.KIOSK_TEST_ARTIFACTS) {
        fs.mkdirSync(process.env.KIOSK_TEST_ARTIFACTS, { recursive: true });
        const name = platform.name.toLowerCase().replaceAll(' ', '-');
        await page.screenshot({ path: path.join(process.env.KIOSK_TEST_ARTIFACTS, `home-${name}.png`) });
      }
      await page.waitForTimeout(3700);
      check(await measure());
      await screen(page, '[data-go="photo.quiz"]').click();
      await screenIs(page, 'photo.quiz');
    }));
  }
});

describe('camera, approval and failure regressions', { concurrency: 3 }, () => {
  for (const platform of platforms.filter(platform => platform.browser === 'chromium')) {
    for (const ui of ['classic', 'cowork', 'chat']) {
      test(`${platform.name} / ${ui}: video capture with a synthetic device, retake and stream cleanup`, { timeout: 45000 }, () => withPage(platform, async (page, state) => {
        await initialize(page, state, ui, true);
        if (ui === 'classic') {
          await screen(page, '[data-go="photo.quiz"]').click();
          await screen(page, '[data-pick]').first().click();
          await screen(page, '[data-go="photo.theme"]').click();
          await screen(page, '[data-theme="snowglobe"]').click();
          await screen(page, '[data-act="next"]').click();
          await page.waitForFunction(() => App.cur.el.dataset.state === 'live');
          await screen(page, '[data-act="shoot"]').click();
          await page.waitForFunction(() => App.cur.el.dataset.state === 'review');
          assert.match(await page.evaluate(() => STATE.photo.photo), /^data:image\/jpeg;base64,/);
          await screen(page, '[data-act="retake"]').click();
          await page.waitForFunction(() => App.cur.el.dataset.state === 'live');
          await page.locator('#topbar [data-act="home"]').click();
        } else {
          await startAgent(page, 'photo');
          await option(page, 0).click();
          await option(page, 0).click();
          await option(page, 0).click();
          await page.locator('#cameraShot').waitFor();
          await page.evaluate(() => {
            const preview = document.getElementById('cameraPreview');
            const nativeReady = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'readyState').get;
            let delayed = true;
            Object.defineProperty(preview, 'readyState', { get: () => delayed ? 1 : nativeReady.call(preview) });
            window.releaseFrame = () => { delayed = false; };
          });
          await page.locator('#cameraShot').click();
          assert.equal(await page.locator('#cameraShot').isDisabled(), true, 'An early tap must wait for image data');
          await page.evaluate(() => window.releaseFrame());
          await page.locator('#photoDialog').waitFor({ state: 'hidden' });
          assert.equal(await page.locator('#photoDialog').isVisible(), false);
          assert.match(await page.locator('#attachment').innerText(), /Kamera fotoğrafı/);
          await page.locator('#send').click();
          assert.equal(state.calls.length, 0);
          await page.locator('[data-action="approve"]').click();
          await output(page, state, ui, true);
        }
        assert.ok(await page.evaluate(() => window.cameraTest.calls > 0));
        assert.equal(await page.evaluate(() => window.cameraTest.streams.every(stream => stream.getTracks().every(track => track.readyState === 'ended'))), true);
      }));
    }
    test(`${platform.name}: closing Cowork camera cancels late permission`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'cowork', true);
      await page.evaluate(() => {
        const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {
          window.resolveCamera = async () => resolve(await original({ video: true, audio: false }));
        });
      });
      await startAgent(page, 'photo');
      await option(page, 0).click();
      await option(page, 0).click();
      await option(page, 0).click();
      await page.locator('[data-action="closePhoto"]').click();
      await page.evaluate(() => window.resolveCamera());
      await page.waitForFunction(() => window.cameraTest.streams.length === 1 &&
        window.cameraTest.streams[0].getTracks().every(track => track.readyState === 'ended'));
      assert.equal(await page.locator('#photoDialog').isVisible(), false);
      assert.equal(await page.locator('#cameraPreview').evaluate(video => video.srcObject), null);
      assert.equal(state.calls.length, 0);
    }));
    test(`${platform.name}: a failed camera snapshot releases the device and allows reopening`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'cowork', true);
      await startAgent(page, 'photo');
      await option(page, 0).click();
      await option(page, 0).click();
      await option(page, 0).click();
      await page.locator('#cameraShot').waitFor();
      await page.evaluate(() => { Camera.capture = () => { throw new Error('Snapshot regression failure'); }; });
      await page.locator('#cameraShot').click();
      await page.waitForFunction(() => !document.getElementById('cameraStart').disabled);
      assert.match(await page.locator('#cameraStatus').innerText(), /Snapshot regression failure/);
      assert.equal(await page.locator('#cameraPreview').isVisible(), false);
      assert.equal(await page.evaluate(() => window.cameraTest.streams.every(stream => stream.getTracks().every(track => track.readyState === 'ended'))), true);
      assert.equal(state.calls.length, 0);
    }));
  }
  for (const platform of platforms) {
    test(`${platform.name}: shared key survives kiosk ↔ Cowork navigation and reload`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'classic', true);
      await page.goto(`${baseURL}/copilot/`);
      await settingsButton(page);
      await page.waitForFunction(() => !document.getElementById('connection').inert);
      assert.equal(await page.locator('#connection [name="key"]').inputValue(), key);
      await page.locator('#connection [name="key"]').fill('second-regression-placeholder');
      await page.locator('#connection [type="submit"]').click();
      await page.reload();
      await settingsButton(page);
      await page.waitForFunction(() => !document.getElementById('connection').inert);
      assert.equal(await page.locator('#connection [name="key"]').inputValue(), 'second-regression-placeholder');
      await page.goto(baseURL);
      await page.locator('#connection-live').click();
      assert.equal(await page.locator('#connection-form [name="key"]').inputValue(), 'second-regression-placeholder');
      assert.equal(state.calls.length, 0);
    }));

    for (const failure of ['unauthorized', 'missing-image', 'network']) {
      test(`${platform.name}: Cowork ${failure} is visible and retry works`, () => withPage(platform, async (page, state) => {
        await initialize(page, state, 'cowork', true);
        await startAgent(page, 'photo');
        await option(page, 0).click();
        await option(page, 0).click();
        await option(page, 2).click();
        state.failure = failure;
        await page.locator('[data-action="approve"]').click();
        await page.locator('#messages [data-choice="1"]').waitFor();
        assert.equal(await page.locator('.artifact').count(), 0);
        assert.match(await page.locator('#messages .answer-text').last().innerText(), failure === 'network' ? /bağlantısı kurulamadı/ : failure === 'missing-image' ? /görsel yok/ : /401/);
        state.failure = null;
        await option(page, 1).click();
        await page.locator('[data-action="approve"]').click();
        await output(page, state, 'cowork', true);
        assert.equal(state.calls.length, 2);
      }));
    }
    test(`${platform.name}: invalid Lab copy prevents image generation`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'cowork', true);
      await startAgent(page, 'lab');
      await option(page, 0).click();
      await option(page, 0).click();
      await option(page, 0).click();
      state.failure = 'invalid-copy';
      await page.locator('[data-action="approve"]').click();
      await page.locator('#messages [data-choice="1"]').waitFor();
      assert.equal(await page.locator('.artifact').count(), 0);
      assert.deepEqual(state.calls.map(call => call.path), ['/openai/v1/chat/completions']);
    }));
    test(`${platform.name}: cancel, upload, download and changing selections`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'cowork', true);
      await startAgent(page, 'photo');
      await option(page, 0).click();
      await option(page, 0).click();
      await page.locator('#photoInput').setInputFiles(path.join(__dirname, 'sample_photo.jpeg'));
      await page.locator('#send').click();
      await page.locator('[data-action="cancelPlan"]').click();
      assert.equal(state.calls.length, 0);
      await option(page, 1).click();
      await page.locator('[data-action="approve"]').click();
      await output(page, state, 'cowork', true);
      const download = page.waitForEvent('download');
      await page.locator('.artifact a[download]').click();
      assert.equal((await download).suggestedFilename(), 'copilot-photo.jpg');
      await option(page, 0).click();
      assert.match(await page.locator('#messages .answer-text').last().innerText(), /nasıl bir yıldızsın/);
    }));
    test(`${platform.name}: stopping a generation restores composer without an output`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'cowork', true);
      await startAgent(page, 'photo');
      await option(page, 0).click();
      await option(page, 0).click();
      await option(page, 2).click();
      state.failure = 'hold';
      await page.locator('[data-action="approve"]').click();
      await page.waitForFunction(() => document.getElementById('stop').hidden === false);
      await page.locator('#stop').click();
      await page.locator('#messages [data-choice="1"]').waitFor();
      assert.match(await page.locator('#messages .answer-text').last().innerText(), /İşlem durduruldu/);
      assert.equal(await page.locator('.artifact').count(), 0);
      assert.equal(await page.locator('#message').getAttribute('readonly'), null);
    }));
  }
});
