const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { before, after, describe, test } = require('node:test');
const { chromium, webkit } = require('playwright');

const themes = ['snowglobe', 'adface', 'blocky', 'factory', 'space', 'popart'];
const platforms = [
  { name: 'desktop Chromium', browser: 'chromium', viewport: { width: 1440, height: 900 } },
  { name: 'touch mobile Chromium', browser: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'mobile WebKit', browser: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const endpoint = 'https://kiosk-test.services.ai.azure.com';
const key = 'browser-regression-placeholder';
const png = fs.readFileSync(path.join(__dirname, 'assets', 'ulker-logo.png')).toString('base64');
const concept = JSON.parse(fs.readFileSync(path.join(__dirname, 'samples', 'reference-photo', 'pack-cake.json'), 'utf8')).concept;
const podcastMP3 = () => fs.readFileSync(path.join(__dirname, 'samples', 'podcast', 'radio-memory.mp3'));
const podcastStory = { title: 'Paylaşılan küçük mutluluk', contextLead: 'serin bir okul çıkışında gazeteler usulca hışırdıyor',
  memorySentence: 'Kahramanımız okul kapısında en yakın arkadaşlarını beklerken çantasından gofretini çıkarmış, çıtır katmanları özenle bölerek herkese küçük bir pay uzatmış ve birlikte geçirilen bu sıradan molanın sıcaklığını yıllar sonra bile hatırlamıştı.',
  endingSentence: 'Arkadaşlarıyla aynı okul kapısından ağır ağır uzaklaşırken avucunda kalan kırıntılara gülümseyen kahramanımız, paylaşmanın küçücük bir gofreti nasıl kocaman bir hatıraya dönüştürdüğünü o an anlamıştı.',
  memoryVisual: 'Younger selfie person sharing a wafer at a schoolyard.', endingVisual: 'Same person, clothes and schoolyard, continuing the memory.' };
function podcastResearchFixture(body, verified = true) {
  const year = JSON.parse(body.input).start;
  const facts = [15, 13].map((day, index) => ({ year, text: `${year} yılında okul takviminde ${day} ${index ? 'Eylül' : 'Haziran'} tarihi yer aldı.`, url: 'https://example.test/school-calendar', title: 'Intercepted test archive', evidence: `${year} okul takvimi.` }));
  return { status: 'completed', output: [
    { type: 'web_search_call', status: 'completed', action: { sources: [{ url: facts[0].url }] } },
    { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ verified, facts: verified ? facts : [] }) }] },
  ] };
}
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
  const state = { calls: [], errors: [], localFailures: [], failure: null, hasTouch: Boolean(options.hasTouch), windowsWebKit: process.platform === 'win32' && browser === 'webkit' };
  page.on('pageerror', error => state.errors.push(error.message));
  page.on('requestfailed', request => {
    if (request.url().startsWith(baseURL)) state.localFailures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText });
  });
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
    state.calls.push({ path: new URL(request.url()).pathname, key: request.headers()['api-key'] || request.headers()['ocp-apim-subscription-key'], body: request.postDataBuffer()?.toString('utf8'), bytes: request.postDataBuffer(), contentType: request.headers()['content-type'] });
    if (state.failure === 'hold') return;
    if (state.failure === 'network') return route.abort('failed');
    if (state.failure === 'unauthorized') return route.fulfill({ status: 401, json: { error: 'Test authorization failure' } });
    if (request.url().endsWith('/responses')) {
      const body = request.postDataJSON();
      if (body.text) return route.fulfill({ json: podcastResearchFixture(body, state.failure !== 'unverified') });
      const text = '- Okullar 2004 yılında haziranda kapandı. [1]\n- Okullar 2004 yılında eylülde açıldı. [2]';
      return route.fulfill({ json: { status: 'completed', output: [
        { type: 'web_search_call', status: 'completed' },
        { type: 'message', content: [{ type: 'output_text', text, annotations: state.failure === 'no-sources' ? [] : [1, 2].map(index => ({ type: 'url_citation', start_index: text.indexOf(`[${index}]`), end_index: text.indexOf(`[${index}]`) + 3, url: 'https://example.test/school-calendar', title: 'Intercepted test archive' })) }] },
      ] } });
    }
    if (request.url().endsWith('/tts/cognitiveservices/v1')) {
      if (state.holdSpeech) return;
      if (state.failure === 'speech') return route.fulfill({ status: 503, body: 'Speech unavailable' });
      return route.fulfill({ contentType: 'audio/mpeg', body: state.failure === 'invalid-audio' ? Buffer.from('Not an MP3') : podcastMP3().subarray(0, 24000) });
    }
    const text = request.url().includes('chat/completions');
    if (text && request.postDataJSON().response_format?.json_schema?.name === 'podcast_age') return route.fulfill({ json: { choices: [{ message: { content: JSON.stringify(state.ageResponse || { hasSingleFace: true, estimatedAge: 80 }) } }] } });
    if (!text && state.holdImage) return;
    if (text && state.failure === 'invalid-copy') return route.fulfill({ json: { choices: [{ message: { content: '{"name":""}' } }] } });
    await route.fulfill({ json: text
      ? { choices: [{ message: { content: JSON.stringify(state.copy || (request.postDataJSON().response_format?.json_schema?.name === 'radio_theater' ? podcastStory : concept)) } }] }
      : state.failure === 'missing-image' ? { data: [] } : { data: [{ b64_json: state.png || png }] } });
  });
  try {
    await task(page, state);
    assert.deepEqual(state.errors, [], `${name}: no uncaught browser exceptions`);
  } catch (error) {
    if (state.localFailures.length) console.error('Local asset failures:', JSON.stringify(state.localFailures));
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
    await page.locator('#connection-demo').setChecked(!live);
    if (!live) { await page.locator('#connection-continue').click(); return; }
    await page.waitForFunction(() => !document.getElementById('connection-form').inert);
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

describe('opening mode and interface choices', { concurrency: 3 }, () => {
  for (const platform of platforms) for (const live of [false, true]) for (const ui of ['kiosk', 'chat']) {
    test(`${platform.name}: opening ${live ? 'Live' : 'Demo'} / ${ui} applies only after Continue`, { timeout: 30000 }, () => withPage(platform, async (page, state) => {
      await page.goto(`${baseURL}/?scoutTheme=light`);
      assert.equal(await page.locator('.connection-group').count(), 1);
      assert.equal(await page.locator('#connection-demo').isChecked(), true);
      assert.equal(await page.locator('#connection-voice').isVisible(), false);
      await page.locator('#connection-demo').setChecked(!live);
      await page.locator(ui === 'chat' ? '#connection-chat' : '#connection-kiosk').click();
      assert.equal(await page.locator('#connection-dialog').evaluate(node => node.open), true);
      assert.equal(await page.evaluate(() => CONFIG.ai.mode), 'mock');
      assert.equal(await page.locator('#connection-form').isVisible(), live);
      if (live) {
        await page.waitForFunction(() => !document.getElementById('connection-form').inert);
        assert.equal(await page.locator('#connection-voice').isVisible(), true);
        await page.locator('#connection-demo').check();
        assert.equal(await page.locator('#connection-form').isVisible(), false);
        assert.equal(await page.locator(ui === 'chat' ? '#connection-chat' : '#connection-kiosk').getAttribute('aria-pressed'), 'true');
        await page.locator('#connection-demo').uncheck();
        await page.waitForFunction(() => !document.getElementById('connection-form').inert);
        const form = page.locator('#connection-form');
        await form.locator('[name="endpoint"]').fill(endpoint);
        await form.locator('[name="key"]').fill(key);
        await form.locator('[name="imageModel"]').fill('test-image');
        await form.locator('[name="labModel"]').fill('gpt-test-text');
        await form.locator('[type="submit"]').click();
      } else await page.locator('#connection-continue').click();
      if (ui === 'chat') {
        await page.waitForURL('**/copilot/?ui=chat');
        await page.waitForFunction(live => CONFIG.ai.mode === (live ? 'live' : 'mock'), live);
        assert.equal(await page.locator('[data-mode="chat"]').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('#modeBadge').isVisible(), !live);
        assert.equal(await page.evaluate(() => sessionStorage.getItem('mai-kiosk-launch')), null);
        if (live) {
          assert.deepEqual(await page.evaluate(() => ({ endpoint: CONFIG.ai.endpoint, key: CONFIG.ai.apiKey, image: CONFIG.ai.imageDeployment })), { endpoint, key, image: 'test-image' });
        }
      } else {
        await page.waitForFunction(() => !document.getElementById('connection-dialog').open);
        await screenIs(page, 'home');
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
        assert.equal(await page.evaluate(() => CONFIG.ai.mode), live ? 'live' : 'mock');
        assert.equal(await screen(page, '.home-top .live-chip').isVisible(), !live);
      }
      assert.equal(state.calls.length, 0, 'Choosing an interface does not start generation');
    }));
  }
});

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
    const touch = state.hasTouch;
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
    assert.equal(await page.evaluate(() => STATE.photo.photo), 'samples/reference.jpg');
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

async function labFlow(page, state, ui, live, index) {
  await initialize(page, state, ui, live);
  const rdNote = index % 2 ? 'Fıstık tadı öne çıksın; ambalajda "sade" bir görünüm olsun.' : '';
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
    await screenIs(page, 'lab.note');
    assert.equal(await screen(page).getByRole('heading', { name: 'Ar-Ge ekibine özel bir notunuz var mı?' }).count(), 1);
    assert.equal(state.calls.length, 0);
    if (rdNote) {
      await screen(page, '[data-note-choice="custom"]').click();
      const input = screen(page, '.lab-note-entry'), generate = screen(page, '[data-act="generate"]');
      assert.equal(await generate.isDisabled(), true);
      await input.fill('   ');
      assert.equal(await generate.isDisabled(), true);
      await input.fill(rdNote);
      if (await screen(page, '.kbd').isVisible()) {
        await screen(page, '[data-key="x"]').click();
        assert.equal(await input.inputValue(), rdNote + 'x');
        await screen(page, '[data-key="back"]').click();
        assert.equal(await input.inputValue(), rdNote);
      }
      assert.equal(await generate.isEnabled(), true);
      await generate.click();
    } else await screen(page, '[data-note-choice="trust"]').click();
    await screenIs(page, 'lab.result');
  } else {
    await startAgent(page, 'lab');
    await option(page, index % 4).click();
    for (const [ingredientIndex, flavor] of picks.flavors.entries()) {
      assert.match(await page.locator('#messages .answer-text').last().innerText(), ingredientIndex ? /İkinci malzeme/ : /İlk malzemeni/);
      await page.locator('#message').fill(flavor.name);
      await page.locator('#send').click();
    }
    await option(page, index).click();
    assert.equal(state.calls.length, 0);
    assert.match(await page.locator('#messages .answer-text').last().innerText(), /Ar-Ge ekibine özel bir notunuz var mı/);
    await option(page, rdNote ? 1 : 0).click();
    if (rdNote) {
      await page.locator('#message').fill(rdNote);
      await page.locator('#send').click();
    }
    await approve(page, ui, live && ui === 'cowork');
  }
  await output(page, state, ui, live, 'samples/reference-photo/pack-cake.jpg');
  if (live) {
    assert.deepEqual(state.calls.map(call => call.path), ['/openai/v1/chat/completions', '/mai/v1/images/edits']);
    const text = JSON.parse(state.calls[0].body);
    assert.equal(text.model, 'gpt-test-text');
    assert.equal(text.response_format.type, 'json_schema');
    for (const flavor of picks.flavors) assert.ok(text.messages.at(-1).content.includes(flavor.name));
    assert.equal(JSON.parse(text.messages.at(-1).content).rdNote, rdNote);
  }
}

describe('complete kiosk, Chat and Cowork scenario matrix', { concurrency: 3 }, () => {
  for (const platform of platforms) for (const ui of ['classic', 'cowork', 'chat']) for (const live of [false, true]) {
    const label = `${platform.name} / ${ui} / ${live ? 'Live (intercepted)' : 'Demo'}`;
    for (const [name, flow, count] of [['six photo themes', photoFlow, 6], ['twelve flavors, six moments and four bases', labFlow, 6]]) {
      test(`${label}: ${name}`, { timeout: 180000 }, () => withPage(platform, async (page, state) => {
        for (let i = 0; i < count; i++) await flow(page, state, ui, live, i);
      }));
    }
  }
});

describe('laboratory sequential ingredient questions', { concurrency: 3 }, () => {
  for (const platform of platforms) for (const ui of ['chat', 'cowork']) {
    test(`${platform.name} / ${ui}: separate ingredient prompts reject duplicates and allow one ingredient`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, ui, false);
      const names = await page.evaluate(() => LAB_FLAVORS.map(flavor => flavor.name));
      await page.evaluate(() => {
        const concept = API.lab.concept;
        API.lab.concept = function (values, opts) {
          window.selectedLabFlavors = values.flavors.map(flavor => flavor.name);
          return concept.call(this, values, opts);
        };
      });
      await startAgent(page, 'lab');
      await option(page, 0).click();
      assert.match(await page.locator('#messages .answer-text').last().innerText(), /İlk malzemeni/);
      await page.locator('#message').fill(names.slice(0, 2).join(' ve '));
      await page.locator('#send').click();
      assert.match(await page.locator('#messages .answer-text').last().innerText(), /bu adımda tek bir malzeme/);
      await option(page, 0).click();
      assert.match(await page.locator('#messages .answer-text').last().innerText(), /İkinci malzeme/);
      assert.equal((await page.locator('#messages [data-choice]').allTextContents()).includes(names[0]), false);
      await page.locator('#message').fill(names[0]);
      await page.locator('#send').click();
      assert.match(await page.locator('#messages .answer-text').last().innerText(), /zaten seçtin/);
      await page.locator('#messages [data-choice]').filter({ hasText: 'Tek malzemeyle devam et' }).click();
      assert.match(await page.locator('#messages .answer-text').last().innerText(), /hangi anda/);
      await option(page, 0).click();
      await option(page, 0).click();
      await approve(page, ui, false);
      await output(page, state, ui, false, 'samples/reference-photo/pack-cake.jpg');
      assert.deepEqual(await page.evaluate(() => window.selectedLabFlavors), [names[0]]);
      assert.equal(state.calls.length, 0);
    }));
  }
});

async function podcastFlow(page, state, ui, live, index = 0) {
  await initialize(page, state, ui, live, index % 2 ? 'dark' : 'light');
  const eraIndex = index % 6, momentIndex = index % 5;
  const memory = 'Okul çıkışı arkadaşlarımla gofretimi paylaşırdım.';
  if (ui === 'classic') {
    await screen(page, '[data-go="podcast.product"]').click();
    await screenIs(page, 'podcast.product');
    await screen(page, 'button[data-product]').nth(index % 6).click();
    await screenIs(page, 'podcast.era');
    await screen(page, 'button[data-era]').nth(eraIndex).click();
    if (eraIndex === 5) {
      await screenIs(page, 'podcast.date');
      await screen(page, '#podcast-input').fill('31.02.2004');
      await screen(page, '[type="submit"]').click();
      assert.ok((await screen(page, '.podcast-input-error').innerText()).length > 0);
      await screen(page, '#podcast-input').fill('');
      if (!state.hasTouch) {
        for (const digit of '2004') await screen(page, `.key[data-key="${digit}"]`).click();
        assert.equal(await screen(page, '#podcast-input').inputValue(), '2004');
      } else await screen(page, '#podcast-input').fill('2004');
      await screen(page, '[type="submit"]').click();
    }
    await screenIs(page, 'podcast.moment');
    await screen(page, 'button[data-moment]').nth(momentIndex).click();
    if (momentIndex === 4) {
      await screenIs(page, 'podcast.other');
      await screen(page, '[data-go="podcast.moment"]').click();
      await screenIs(page, 'podcast.moment');
      await screen(page, 'button[data-moment]').nth(4).click();
      await screenIs(page, 'podcast.other');
      await screen(page, '#podcast-input').fill('Yaz tatilinin ilk günü');
      await screen(page, '[type="submit"]').click();
    }
    await screenIs(page, 'podcast.camera');
    if (live && !state.windowsWebKit) {
      await screen(page, '[data-act="shoot"]').click();
      await page.waitForFunction(() => document.querySelector('.screen.is-in')?.dataset.state === 'review');
    } else if (live) await screen(page, '[data-act="demo"]').click();
    await screen(page, '[data-act="start"]').click();
    if (state.windowsWebKit && live) { await screenIs(page, 'podcast.age'); await screen(page, '.podcast-age-error').filter({ hasText: 'canlı video oluşturmayı desteklemiyor' }).waitFor(); return; }
    await screenIs(page, 'podcast.memory');
    assert.equal(await screen(page, '.kbd .key').first().isVisible(), !state.hasTouch);
    assert.equal(await screen(page, '[type="submit"]').isDisabled(), true);
    await screen(page, '#podcast-input').fill('Bir anı. İkinci anı.');
    await screen(page, '[type="submit"]').click();
    assert.match(await screen(page, '.podcast-input-error').innerText(), /tek bir cümle/);
    await screen(page, '#podcast-input').fill(memory);
    const submit = screen(page, '[type="submit"]');
    await submit.scrollIntoViewIfNeeded();
    await submit.click();
  } else {
    await startAgent(page, 'podcast');
    await option(page, index % 6).click();
    await option(page, eraIndex).click();
    if (eraIndex === 5) {
      await page.locator('#message').fill('31.02.2004');
      await page.locator('#send').click();
      assert.match(await page.locator('#messages').innerText(), /geçerli bir yıl veya tarih/);
      await page.locator('#message').fill('2004');
      await page.locator('#send').click();
    }
    await option(page, momentIndex).click();
    if (momentIndex === 4) {
      await page.locator('#podcastBack').click();
      await option(page, 4).click();
      await page.locator('#message').fill('Yaz tatilinin ilk günü');
      await page.locator('#send').click();
    }
    await page.getByRole('button', { name: 'Örnek fotoğrafı kullan', exact: true }).click();
    if (state.windowsWebKit && live) { await page.locator('#messages').filter({ hasText: 'canlı video oluşturmayı desteklemiyor' }).waitFor(); return; }
    await page.locator('#messages').filter({ hasText: 'Anını tek cümleyle anlat.' }).waitFor();
    await page.locator('#message').fill('Bir anı. İkinci anı.');
    await page.locator('#send').click();
    assert.match(await page.locator('#messages').innerText(), /tek bir cümle/);
    await page.locator('#message').fill(memory);
    await page.locator('#send').click();
    if (ui === 'cowork' || live) {
      assert.ok(state.calls.every(call => call.path.endsWith('/chat/completions') && JSON.parse(call.body).response_format?.json_schema?.name === 'podcast_age'), 'Only separately consented selfie analysis may run before final generation consent');
      await page.locator('#messages [data-action="approve"]').click();
    }
  }
}

async function podcastResult(page, state, ui, live) {
  if (live && state.windowsWebKit) {
    await (ui === 'classic' ? screen(page, '.podcast-age-error') : page.locator('#messages').filter({ hasText: 'canlı video oluşturmayı desteklemiyor' })).waitFor();
    assert.equal(state.calls.length, 0, 'Unsupported recording must fail before paid services are called');
    return;
  }
  if (ui === 'classic') await screenIs(page, 'podcast.result');
  const root = ui === 'classic' ? screen(page, '.podcast-output') : page.locator('.artifact .podcast-output').last();
  await root.waitFor();
  const audio = root.locator('video');
  assert.equal(await audio.getAttribute('autoplay'), null);
  assert.equal(await audio.evaluate(node => node.paused), true);
    await page.waitForFunction(() => {
      const audio = [...document.querySelectorAll('.podcast-output video')].at(-1);
      return Number.isFinite(audio?.duration) && audio.duration > 0;
    });
    await audio.evaluate(node => node.play());
    await page.waitForFunction(() => [...document.querySelectorAll('.podcast-output video')].at(-1).currentTime > 0.05);
    await audio.evaluate(node => node.pause());
  const size = await audio.evaluate(node => ({ width: node.videoWidth, height: node.videoHeight }));
  assert.ok(size.width > 0 && size.height > 0);
  assert.ok(Math.abs(size.width / size.height - .8) < .005);
  // Windows WebKit reports its scaled decoding size rather than the coded dimensions.
  if (!state.windowsWebKit) assert.deepEqual(size, { width: 720, height: 900 });
  assert.equal(await root.locator('details').count(), 3);
  await root.locator('summary').first().click();
  assert.ok(await root.locator('li a').count() >= 2);
  assert.match(await root.innerText(), /Hayal edilen sahne/);
  const download = page.waitForEvent('download');
  await root.locator('a[download]').click();
  assert.match((await download).suggestedFilename(), /^bir-isirikla-o-yila-don\.(mp4|webm)$/);
  const bytes = fs.readFileSync(await (await download).path());
  assert.ok(bytes.length > 1024);
  if (!live) assert.equal(createHash('sha256').update(bytes).digest('hex'), createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'samples', 'podcast', 'radio-memory.mp4'))).digest('hex'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (!live) assert.equal(state.calls.length, 0);
  for (const call of state.calls) assert.equal(call.key, key);
  if (live) {
    assert.equal(state.calls.filter(call => call.path.endsWith('/responses')).length, 2);
    assert.equal(state.calls.filter(call => call.path.endsWith('/tts/cognitiveservices/v1')).length, 3);
    assert.equal(state.calls.filter(call => call.path.endsWith('/images/edits')).length, 2);
    const speech = state.calls.find(call => call.path.endsWith('/tts/cognitiveservices/v1'));
    assert.ok(speech.body.includes('en-US-Harper:MAI-Voice-2-Flash'));
    assert.equal(speech.contentType, 'application/ssml+xml');
    for (const call of state.calls.filter(call => call.path.endsWith('/responses'))) {
      assert.ok(!call.body.includes('arkadaşlarımla'));
      assert.ok(!call.body.includes('Yaz tatilinin ilk günü'));
    }
  }
}

describe('nostalgia visual choices', { concurrency: 3 }, () => {
  for (const platform of platforms) for (const ui of ['classic', 'cowork', 'chat']) {
    test(`${platform.name} / ${ui}: six large illustrated product choices are centered and fit the viewport`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, ui, false);
      if (ui === 'classic') {
        await screen(page, '[data-go="podcast.product"]').click();
        await screenIs(page, 'podcast.product');
      } else await startAgent(page, 'podcast');
      const container = ui === 'classic' ? screen(page) : page.locator('#messages .choice-answer').last();
      const buttons = container.locator(ui === 'classic' ? '.podcast-options button' : '.choice-option');
      assert.equal(await buttons.count(), 6);
      for (const name of ['Hanımeller', 'Çokoprens']) assert.equal(await container.getByRole('button', { name, exact: true }).count(), 1);
      const geometry = await container.evaluate((el, classic) => {
        const root = el.getBoundingClientRect();
        const boxes = [...el.querySelectorAll(classic ? '.scr-head,.podcast-options' : '.answer-header,.answer-text,.pills')].map(child => child.getBoundingClientRect());
        const choices = [...el.querySelectorAll(classic ? '.podcast-options button' : '.choice-option')].map(button => {
          const rect = button.getBoundingClientRect();
          return { height: rect.height, left: rect.left, right: rect.right };
        });
        return { centerOffset: Math.abs((Math.min(...boxes.map(b => b.top)) + Math.max(...boxes.map(b => b.bottom))) / 2 - (root.top + root.bottom) / 2), choices, viewport: innerWidth };
      }, ui === 'classic');
      assert.ok(geometry.centerOffset < 40, `Question and choices center offset: ${geometry.centerOffset}`);
      assert.ok(geometry.choices.every(button => button.height >= (ui === 'classic' ? 120 : 64) && button.left >= 0 && button.right <= geometry.viewport));
      if (process.env.KIOSK_TEST_ARTIFACTS) await page.screenshot({ path: path.join(process.env.KIOSK_TEST_ARTIFACTS, `nostalgia-choices-${ui}-${platform.browser}-${platform.viewport.width}.png`), fullPage: true });
      assert.equal(state.calls.length, 0);
    }));
  }
});

describe('podcast flow, sources and native video matrix', { concurrency: 3 }, () => {
  for (const [platformIndex, platform] of platforms.entries()) for (const [uiIndex, ui] of ['classic', 'cowork', 'chat'].entries()) for (const live of [false, true]) {
    test(`${platform.name} / ${ui} / ${live ? 'Live (intercepted)' : 'Demo'}: podcast choices, consent, sources and video`, { timeout: 60000 }, () => withPage(platform, async (page, state) => {
      await podcastFlow(page, state, ui, live, platformIndex * 6 + uiIndex * 2 + Number(live));
      await podcastResult(page, state, ui, live);
      assert.equal(await page.evaluate(() => window.cameraTest.calls), ui === 'classic' && live && !state.windowsWebKit ? 1 : 0);
      if (process.env.KIOSK_TEST_ARTIFACTS) await page.screenshot({ path: path.join(process.env.KIOSK_TEST_ARTIFACTS, `podcast-${ui}-${platform.browser}-${platform.viewport.width}-${live ? 'live' : 'demo'}.png`), fullPage: true });
    }));
  }
});

async function podcastVideoHash(page) {
  return page.locator('.podcast-output video').evaluate(async node => {
    const bytes = await (await fetch(node.src)).arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  });
}

describe('podcast errors, retry, cancellation and retained output', { concurrency: 3 }, () => {
  for (const platform of platforms.filter(platform => platform.name !== 'touch mobile Chromium')) for (const ui of ['classic', 'cowork', 'chat']) {
    test(`${platform.name} / ${ui}: podcast research failure, Speech cancellation, retry and previous-result preservation`, { timeout: 60000 }, () => withPage(platform, async (page, state) => {
      state.failure = 'no-sources';
      await podcastFlow(page, state, ui, true, 5);
      if (state.windowsWebKit) { await podcastResult(page, state, ui, true); return; }
      if (ui === 'classic') await screen(page, '.gen-error.show').waitFor();
      else await page.locator('#messages').filter({ hasText: 'WebIQ en az iki' }).waitFor();
      assert.equal(state.calls.some(call => call.path.includes('images') || call.path.includes('/tts/')), false);
      state.failure = null;
      const retry = async () => {
        if (ui === 'classic') await screen(page, '[data-act="gen-retry"]').click();
        else {
          await option(page, 1).click();
          await page.locator('#messages [data-action="approve"]').click();
        }
      };
      await retry();
      if (ui === 'classic') await screenIs(page, 'podcast.result');
      await page.locator('.podcast-output video').waitFor();
      await page.locator('.podcast-output video').evaluate(node => {
        window.previousPodcastAudio = node;
        if (document.querySelector('.screen[data-screen="podcast.result"]')) window.previousPodcastResult = STATE.podcast.result;
        return node.play();
      });
      const oldVideo = await podcastVideoHash(page);
      state.holdSpeech = true;
      const speechRequest = page.waitForRequest(request => request.url().endsWith('/tts/cognitiveservices/v1'));
      if (ui === 'classic') await screen(page, '[data-act="regen"]').click();
      else await retry();
      await page.waitForFunction(() => window.previousPodcastAudio.paused);
      await speechRequest;
      if (ui === 'classic') await screen(page, '[data-act="cancel-revision"]').click();
      else await page.locator('#stop').click();
      if (ui === 'classic') await screenIs(page, 'podcast.result');
      else await page.locator('#messages').filter({ hasText: 'İşlem durduruldu' }).waitFor();
      assert.equal(await podcastVideoHash(page), oldVideo);
      if (ui !== 'classic') assert.equal(await page.locator('.artifact').count(), 1);
      state.holdSpeech = false;
      state.failure = 'speech';
      if (ui === 'classic') await screen(page, '[data-act="regen"]').click();
      else await retry();
      if (ui === 'classic') await screen(page, '.gen-error.show').waitFor();
      else await page.locator('#messages').filter({ hasText: 'Seslendirme başarısız (HTTP 503)' }).waitFor();
      if (ui === 'classic') assert.equal(await page.evaluate(() => STATE.podcast.result === window.previousPodcastResult), true);
      if (ui !== 'classic') assert.equal(await page.locator('.artifact').count(), 1);
      state.failure = null;
      await retry();
      if (ui === 'classic') await screenIs(page, 'podcast.result');
      else await page.locator('.artifact').nth(1).waitFor();
    }));
  }
});

describe('podcast keyboard back and recording interruptions', { concurrency: 2 }, () => {
  for (const platform of [...platforms, { name: 'short landscape Chromium', browser: 'chromium', viewport: { width: 844, height: 390 } }]) {
    test(`${platform.name}: Other keyboard Back remains reachable after scrolling and retains its draft`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'classic', false);
      await screen(page, '[data-go="podcast.product"]').click();
      await screen(page, 'button[data-product]').first().click();
      await screen(page, 'button[data-era]').first().click();
      await screen(page, 'button[data-moment]').nth(4).click();
      await screenIs(page, 'podcast.other');
      await screen(page, '#podcast-input').fill('Yaz tatilinin ilk günü');
      await screen(page, '[type="submit"]').scrollIntoViewIfNeeded();
      const back = screen(page, '[data-go="podcast.moment"]');
      assert.equal(await back.isVisible(), true);
      assert.equal(await back.evaluate(node => {
        const rect = node.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight && document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('button') === node;
      }), true);
      await back.click();
      await screenIs(page, 'podcast.moment');
      await screen(page, 'button[data-moment]').nth(4).click();
      assert.equal(await screen(page, '#podcast-input').inputValue(), 'Yaz tatilinin ilk günü');
    }));
  }
  test('Chromium: abort and a hidden tab reject actual video encoding and release media tracks', { timeout: 30000 }, () => withPage(platforms[0], async (page, state) => {
    await initialize(page, state, 'classic', false);
    const audio = podcastMP3().subarray(0, 24000).toString('base64');
    for (const interruption of ['abort', 'hidden']) {
      const result = await page.evaluate(async ({ audio, interruption, image }) => {
        const controller = new AbortController(), tracks = [], frames = [];
        const drawFrame = PodcastVideo.drawFrame;
        PodcastVideo.drawFrame = function (...args) {
          frames.push(args[2]);
          return drawFrame.apply(this, args);
        };
        const capture = HTMLCanvasElement.prototype.captureStream;
        HTMLCanvasElement.prototype.captureStream = function (...args) {
          const stream = capture.apply(this, args);
          const add = stream.addTrack.bind(stream);
          tracks.push(...stream.getTracks());
          stream.addTrack = track => { tracks.push(track); add(track); };
          return stream;
        };
        const session = PodcastVideo.prepare(controller.signal);
        const music = await PodcastMusic.load({ start: 2004 }, controller.signal);
        const scenes = ['context', 'memory', 'ending'].map(kind => ({ kind, audio: 'data:audio/mpeg;base64,' + audio, image: 'data:image/png;base64,' + image }));
        const render = PodcastVideo.render({ scenes, signal: controller.signal, session, music });
        const timer = setTimeout(() => {
          if (interruption === 'abort') controller.abort(new Error('Test recording cancelled'));
          else {
            Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            document.dispatchEvent(new Event('visibilitychange'));
          }
        }, 900);
        let error;
        try { await render; } catch (failure) { error = failure.message; }
        finally {
          clearTimeout(timer); await session.dispose();
          HTMLCanvasElement.prototype.captureStream = capture;
          PodcastVideo.drawFrame = drawFrame;
          delete document.hidden;
        }
        return { error, tracks: tracks.map(track => track.readyState), context: session.context.state, frames: frames.length };
      }, { audio, interruption, image: png });
      assert.match(result.error || '', interruption === 'abort' ? /cancelled/ : /sekme/);
      assert.ok(result.tracks.length >= 2);
      assert.ok(result.tracks.every(track => track === 'ended'));
      assert.equal(result.context, 'closed');
      assert.ok(result.frames > 1, 'Film frames must actually render before encoding is interrupted');
    }
  }));
});

test('Chromium: three decoded speech clips produce three timed, distinct movie frames', { timeout: 30000 }, () => withPage(platforms[0], async (page, state) => {
  await initialize(page, state, 'classic', false);
  const result = await page.evaluate(async () => {
    const wave = seconds => {
      const count = Math.round(seconds * 24000), bytes = new Uint8Array(44 + count * 2), view = new DataView(bytes.buffer);
      const text = (offset, value) => [...value].forEach((char, i) => { bytes[offset + i] = char.charCodeAt(0); });
      text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
      text(36, 'data'); view.setUint32(40, count * 2, true);
      for (let i = 0; i < count; i++) view.setInt16(44 + i * 2, Math.sin(i * 2 * Math.PI * 440 / 24000) * 3000, true);
      return 'data:audio/wav;base64,' + btoa(String.fromCharCode(...bytes));
    };
    const images = ['red', 'lime', 'blue'].map(color => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const g = canvas.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, 1, 1); return canvas.toDataURL();
    });
    const scenes = ['context', 'memory', 'ending'].map((kind, i) => ({ kind, image: images[i], audio: wave([.32, .48, .64][i]) }));
    const session = PodcastVideo.prepare(), observations = [], draw = PodcastVideo.drawFrame;
    PodcastVideo.drawFrame = function (...args) { observations.push({ index: images.indexOf(args[1].src), time: args[2] }); return draw.apply(this, args); };
    let url, player;
    try {
      const output = await PodcastVideo.render({ scenes, session, music: await PodcastMusic.load({ start: 2004 }) });
      url = URL.createObjectURL(output.video); player = document.createElement('video'); player.muted = true;
      await new Promise((resolve, reject) => { player.onloadedmetadata = resolve; player.onerror = () => reject(new Error('Encoded movie cannot be decoded')); player.src = url; });
      const colors = [];
      for (const time of [.25, .9, 1.5]) {
        await new Promise((resolve, reject) => { player.onseeked = resolve; player.onerror = () => reject(new Error('Encoded frame cannot be decoded')); player.currentTime = time; });
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const g = canvas.getContext('2d'); g.drawImage(player, 0, 0, 1, 1); colors.push([...g.getImageData(0, 0, 1, 1).data].slice(0, 3));
      }
      return { starts: output.sceneStartTimes, duration: output.videoDuration, observations, colors };
    } finally {
      PodcastVideo.drawFrame = draw; await session.dispose();
      if (player) { player.pause(); player.removeAttribute('src'); player.load(); }
      if (url) URL.revokeObjectURL(url);
    }
  });
  for (const [index, expected] of [0, .48, 1.12].entries()) {
    assert.ok(Math.abs(result.starts[index] - expected) < .002);
    const first = result.observations.find(frame => frame.index === index);
    assert.ok(first && first.time >= expected && first.time < expected + .25, 'A distinct frame must appear at its decoded clip boundary');
  }
  assert.ok(Math.abs(result.duration - 1.76) < .002);
  const brightness = result.colors.map(color => color.reduce((sum, value) => sum + value, 0));
  assert.ok(brightness[1] > brightness[0] + 40 && brightness[0] > brightness[2] + 40, 'The encoded movie, not only the canvas, must contain the three different frames');
}));

describe('podcast automatic selfie processing before memory', { concurrency: 2 }, () => {
  for (const platform of platforms.filter(platform => platform.browser === 'chromium')) for (const ui of ['classic', 'cowork', 'chat']) {
    test(`${platform.name} / ${ui}: a before-birth era automatically continues without an age question`, { timeout: 30000 }, () => withPage(platform, async (page, state) => {
      state.ageResponse = { hasSingleFace: true, estimatedAge: 40 };
      await initialize(page, state, ui, true);
      if (ui === 'classic') {
        await screen(page, '[data-go="podcast.product"]').click(); await screenIs(page, 'podcast.product');
        await screen(page, '[data-product]').first().click(); await screenIs(page, 'podcast.era');
        await screen(page, '[data-era]').first().click(); await screenIs(page, 'podcast.moment');
        await screen(page, '[data-moment]').first().click(); await screenIs(page, 'podcast.camera');
        await screen(page, '[data-act="shoot"]').click();
        await page.waitForFunction(() => document.querySelector('.screen.is-in')?.dataset.state === 'review');
        await screen(page, '[data-act="start"]').click();
        await screenIs(page, 'podcast.memory');
        assert.equal(await page.evaluate(() => STATE.podcast.age.age), 10);
      } else {
        await startAgent(page, 'podcast'); await option(page, 0).click(); await option(page, 0).click(); await option(page, 0).click();
        await page.getByRole('button', { name: 'Örnek fotoğrafı kullan', exact: true }).click();
        await page.locator('#messages').filter({ hasText: 'Anını tek cümleyle anlat.' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Tahmini onayla', exact: true }).count(), 0);
      }
      assert.equal(state.calls.length, 1, 'Preparing the selfie must not start public research');
    }));
  }
});

describe('podcast narrator settings across interfaces', { concurrency: 2 }, () => {
  for (const platform of platforms.filter(platform => platform.name !== 'touch mobile Chromium')) {
    test(`${platform.name}: podcast voice changes persist across classic, Cowork and Chat without replacing the key`, { timeout: 45000 }, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'classic', true);
      await page.locator('.settings-fab').click();
      assert.equal(await page.locator('#settings-voice').count(), 0);
      await page.locator('[data-settings="mode"]').click();
      await page.waitForFunction(() => !document.getElementById('connection-form').inert);
      await page.locator('#connection-voice').fill('invalid voice');
      await page.locator('#connection-form [type="submit"]').click();
      assert.equal(await page.evaluate(() => CONFIG.ai.speechVoice), 'en-US-Harper:MAI-Voice-2-Flash');
      assert.equal(await page.locator('#connection-error').isVisible(), true);
      await page.locator('#connection-voice').fill('en-US-AvaMultilingualNeural');
      await page.locator('#connection-form [type="submit"]').click();
      await initialize(page, state, 'cowork', true);
      assert.equal(await page.evaluate(() => CONFIG.ai.speechVoice), 'en-US-AvaMultilingualNeural');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mai-kiosk-foundry')).key), key);
      await settingsButton(page);
      assert.equal(await page.locator('#connection [name="voice"]').isVisible(), true);
      await page.locator('[data-action="closeSettings"]').click();
      await initialize(page, state, 'chat', true);
      assert.equal(await page.evaluate(() => CONFIG.ai.speechVoice), 'en-US-AvaMultilingualNeural');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mai-kiosk-foundry')).key), key);
    }));
  }
});

async function openLabRevision(page, ui) {
  if (ui === 'classic') {
    await screen(page, '[data-act="revise"]').click();
    await screenIs(page, 'lab.revision');
  } else await page.locator('#messages [data-action="revise"]').click();
}

async function submitLabRevision(page, ui, instruction) {
  if (ui === 'classic') {
    await screen(page, '#lab-revision').fill(instruction);
    await screen(page, '[data-act="submit-revision"]').click();
  } else {
    await page.locator('#message').fill(instruction);
    await page.locator('#send').click();
    if (ui === 'cowork') await page.locator('#messages [data-action="approve"]').click();
  }
}

describe('laboratory design revisions', { concurrency: 3 }, () => {
  const instruction = 'Arka planı sadeleştir; ürün adı ve slogan aynı kalsın.';
  const currentImage = (page, ui) => ui === 'classic' ? screen(page, '.res-img').getAttribute('src') : page.locator('.artifact img').last().getAttribute('src');
  const waitForRevision = async (page, ui) => {
    if (ui === 'classic') await screenIs(page, 'lab.result');
    else await page.waitForFunction(() => document.querySelectorAll('#messages .artifact').length === 2 && !document.getElementById('send').hidden);
  };
  const useDifferentImage = async (page, state) => {
    state.png = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      canvas.getContext('2d').fillRect(0, 0, 64, 64);
      return canvas.toDataURL('image/png').split(',')[1];
    });
  };
  for (const platform of platforms) for (const ui of ['classic', 'cowork', 'chat']) {
    test(`${platform.name} / ${ui}: typed revision uses the current image and preserves previous output`, { timeout: 90000 }, () => withPage(platform, async (page, state) => {
      await labFlow(page, state, ui, true, 0);
      const previous = await currentImage(page, ui);
      const expectedReference = await page.evaluate(async image => (await resizeDataUrl(image, 896, 1120)).split(',')[1], previous);
      await page.evaluate(() => {
        // WebKit interception omits blob bytes; also inspect the real outgoing FormData.
        window.revisionForms = [];
        const request = MAI.request.bind(MAI);
        MAI.request = async (path, body, ...args) => {
          if (path === 'images/edits') window.revisionForms.push({
            prompt: body.get('prompt'),
            images: await Promise.all(body.getAll('image').map(blob => new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result.split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            }))),
          });
          return request(path, body, ...args);
        };
      });
      await openLabRevision(page, ui);
      if (ui === 'classic') {
        assert.equal(await screen(page, '.kbd').isVisible(), platform.viewport.width > 640);
        assert.equal(await screen(page, '[data-act="submit-revision"]').isDisabled(), true);
        await screen(page, '#lab-revision').fill('   ');
        assert.equal(await screen(page, '[data-act="submit-revision"]').isDisabled(), true);
        await screen(page, '#lab-revision').fill(instruction);
        if (await screen(page, '.kbd').isVisible()) {
          await screen(page, '[data-key="x"]').click();
          assert.equal(await screen(page, '#lab-revision').inputValue(), instruction + 'x');
          await screen(page, '[data-key="back"]').click();
        }
        await page.waitForFunction(() => App.cur.el.classList.contains('is-settled'));
      }
      if (process.env.KIOSK_TEST_ARTIFACTS) {
        fs.mkdirSync(process.env.KIOSK_TEST_ARTIFACTS, { recursive: true });
        await page.screenshot({ path: path.join(process.env.KIOSK_TEST_ARTIFACTS, `revision-${ui}-${platform.browser}-${platform.viewport.width}.png`) });
      }
      await useDifferentImage(page, state);
      await submitLabRevision(page, ui, instruction);
      await waitForRevision(page, ui);
      const updated = await currentImage(page, ui);
      assert.notEqual(updated, previous);
      assert.deepEqual(state.calls.map(call => call.path), ['/openai/v1/chat/completions', '/mai/v1/images/edits', '/openai/v1/chat/completions', '/mai/v1/images/edits']);
      const copyRequest = JSON.parse(state.calls[2].body);
      assert.equal(JSON.parse(copyRequest.messages.at(-1).content).instruction, instruction);
      assert.equal(JSON.parse(copyRequest.messages.at(-1).content).previousCopy.name, concept.name);
      const request = state.calls[3], form = await new Response(request.bytes, { headers: { 'Content-Type': request.contentType } }).formData();
      const references = form.getAll('image');
      assert.equal(references.length, 2);
      const hash = bytes => createHash('sha256').update(bytes).digest('hex');
      if (platform.browser !== 'webkit') assert.equal(hash(Buffer.from(await references[0].arrayBuffer())), hash(Buffer.from(expectedReference, 'base64')));
      const outgoing = await page.evaluate(() => window.revisionForms[0]);
      assert.equal(outgoing.images.length, 2);
      assert.equal(hash(Buffer.from(outgoing.images[0], 'base64')), hash(Buffer.from(expectedReference, 'base64')));
      assert.match(form.get('prompt'), /Reference image 2 contains only the official Ülker logo/);
      assert.match(form.get('prompt'), /12-15% of the package front width/);
      assert.ok(state.calls.every(call => call.key === key));
      if (ui !== 'classic') assert.equal(await page.locator('.artifact img').first().getAttribute('src'), previous);
      const latestReference = await page.evaluate(async image => (await resizeDataUrl(image, 896, 1120)).split(',')[1], updated);
      await openLabRevision(page, ui);
      await submitLabRevision(page, ui, 'Fıstıkları sağa taşı.');
      if (ui === 'classic') await screenIs(page, 'lab.result');
      else await page.waitForFunction(() => document.querySelectorAll('#messages .artifact').length === 3 && !document.getElementById('send').hidden);
      const second = state.calls[5], secondForm = await new Response(second.bytes, { headers: { 'Content-Type': second.contentType } }).formData();
      if (platform.browser !== 'webkit') assert.equal(hash(Buffer.from(await secondForm.getAll('image')[0].arrayBuffer())), hash(Buffer.from(latestReference, 'base64')));
      const nextOutgoing = await page.evaluate(() => window.revisionForms[1]);
      assert.equal(hash(Buffer.from(nextOutgoing.images[0], 'base64')), hash(Buffer.from(latestReference, 'base64')));
      if (ui === 'cowork') {
        await option(page, 1).click();
        assert.match(await page.locator('#messages .approval').last().innerText(), /Foundry önce ürün adını/);
        await page.locator('#messages [data-action="cancelPlan"]').click();
      }
    }));
    test(`${platform.name} / ${ui}: Demo explains why revision is unavailable`, { timeout: 60000 }, () => withPage(platform, async (page, state) => {
      await labFlow(page, state, ui, false, 0);
      const button = ui === 'classic' ? screen(page, '[data-act="revise"]') : page.locator('#messages [data-action="revise"]');
      assert.equal(await button.isDisabled(), true);
      assert.match(await (ui === 'classic' ? screen(page) : page.locator('#messages')).innerText(), /Revizyon için Demo Modunu kapat/);
      assert.equal(state.calls.length, 0);
    }));
  }
  for (const ui of ['classic', 'cowork', 'chat']) {
    test(`desktop Chromium / ${ui}: failed revision preserves the old design and retries safely`, { timeout: 90000 }, () => withPage(platforms[0], async (page, state) => {
      await labFlow(page, state, ui, true, 0);
      const previous = await currentImage(page, ui);
      await openLabRevision(page, ui);
      state.failure = 'invalid-copy';
      await submitLabRevision(page, ui, instruction);
      if (ui === 'classic') {
        await screen(page, '.gen-error.show').waitFor();
        assert.equal(await screen(page, '.gen-error [data-act="cancel-revision"]').isVisible(), true);
      }
      else await page.getByText('Metin modeli eksik bir konsept döndürdü: name', { exact: true }).waitFor();
      assert.equal(state.calls.length, 3, 'Invalid copy cannot trigger an image request');
      if (ui === 'classic') assert.equal(await page.evaluate(() => STATE.lab.result), previous);
      else assert.equal(await page.locator('.artifact img').last().getAttribute('src'), previous);
      state.failure = null;
      await useDifferentImage(page, state);
      if (ui === 'classic') await screen(page, '[data-act="gen-retry"]').click();
      else {
        await option(page, 1).click();
        if (ui === 'cowork') await page.locator('#messages [data-action="approve"]').click();
      }
      await waitForRevision(page, ui);
      assert.notEqual(await currentImage(page, ui), previous);
      assert.equal(state.calls.length, 5);
    }));
    test(`desktop Chromium / ${ui}: cancelling an image revision keeps the previous design`, { timeout: 90000 }, () => withPage(platforms[0], async (page, state) => {
      await labFlow(page, state, ui, true, 0);
      const previous = await currentImage(page, ui);
      await openLabRevision(page, ui);
      state.holdImage = true;
      await submitLabRevision(page, ui, instruction);
      await page.waitForFunction(() => document.body.dataset.screen === 'lab.revision.gen' || !document.getElementById('stop')?.hidden);
      const deadline = Date.now() + 15000;
      while (state.calls.length < 4 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(state.calls.length, 4, 'Revision reaches the image edit before cancellation');
      if (ui === 'classic') {
        await screen(page, '.scr-foot [data-act="cancel-revision"]').click();
        await screenIs(page, 'lab.result');
      } else {
        await page.locator('#stop').click();
        await page.getByText('İşlem durduruldu. İstersen yeniden deneyebilir veya seçimleri değiştirebilirsin.', { exact: true }).waitFor();
      }
      assert.equal(await currentImage(page, ui), previous);
      if (ui !== 'classic') assert.equal(await page.locator('.artifact').count(), 1);
    }));
  }
});

describe('laboratory Ar-Ge note', { concurrency: 3 }, () => {
  for (const platform of platforms) for (const ui of ['classic', 'cowork', 'chat']) for (const live of [false, true]) {
    test(`${platform.name} / ${ui} / ${live ? 'Live (intercepted)' : 'Demo'}: trust and custom notes complete the flow`, { timeout: 90000 }, () => withPage(platform, async (page, state) => {
      for (const index of [0, 1]) await labFlow(page, state, ui, live, index);
    }));
  }
  for (const ui of ['classic', 'cowork', 'chat']) {
    test(`desktop Chromium / ${ui}: trusting the team discards an unfinished custom note`, () => withPage(platforms[0], async (page, state) => {
      await initialize(page, state, ui, true);
      if (ui === 'classic') {
        await page.evaluate(() => {
          STATE.lab = { baseId: LAB_BASES[0].id, flavorIds: [LAB_FLAVORS[0].id], momentId: LAB_MOMENTS[0].id };
          App.go('lab.note');
        });
        await screen(page, '[data-note-choice="custom"]').click();
        await screen(page, '.lab-note-entry').fill('Bu taslağı kullanma.');
        await screen(page, '[data-note-choice="trust"]').click();
        await screenIs(page, 'lab.result');
      } else {
        await startAgent(page, 'lab');
        for (let i = 0; i < 3; i++) await option(page, 0).click();
        await option(page, 1).click();
        await page.locator('#message').fill('Bu taslağı kullanma.');
        await option(page, 0).click();
        await approve(page, ui, ui === 'cowork');
        await output(page, state, ui, true);
      }
      assert.equal(state.calls.length, 2);
      assert.equal(JSON.parse(JSON.parse(state.calls[0].body).messages.at(-1).content).rdNote, '');
    }));
  }
});

describe('laboratory note layout', { concurrency: 3 }, () => {
  for (const platform of [
    ...platforms,
    { name: 'short landscape Chromium', browser: 'chromium', viewport: { width: 812, height: 375 } },
  ]) {
    test(`${platform.name}: choices are vertically centered until the editor opens`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'classic', false);
      await page.evaluate(() => {
        STATE.lab = { baseId: LAB_BASES[0].id, flavorIds: [LAB_FLAVORS[0].id], momentId: LAB_MOMENTS[0].id };
        App.go('lab.note');
      });
      await page.waitForFunction(() => App.cur.el.classList.contains('is-settled'));
      const measure = () => page.evaluate(() => {
        const el = App.cur.el, bounds = el.getBoundingClientRect(), css = getComputedStyle(el);
        const head = el.querySelector('.scr-head').getBoundingClientRect();
        const choices = el.querySelector('.lab-note-options').getBoundingClientRect();
        const top = bounds.top + parseFloat(css.paddingTop), bottom = bounds.bottom - parseFloat(css.paddingBottom);
        return { contentCenter: (top + bottom) / 2, choicesCenter: (head.top + choices.bottom) / 2, headTop: head.top + el.scrollTop, top };
      });
      const before = await measure();
      assert.ok(Math.abs(before.contentCenter - before.choicesCenter) < 1, 'Question and choices are centered below the top bar');
      assert.equal(await screen(page, '.lab-note-entry').isVisible(), false);
      if (process.env.KIOSK_TEST_ARTIFACTS) {
        fs.mkdirSync(process.env.KIOSK_TEST_ARTIFACTS, { recursive: true });
        const file = `centered-note-${platform.name.toLowerCase().replaceAll(' ', '-')}.png`;
        await page.screenshot({ path: path.join(process.env.KIOSK_TEST_ARTIFACTS, file) });
      }
      await screen(page, '[data-note-choice="custom"]').click();
      const after = await measure();
      assert.ok(Math.abs(after.headTop - after.top) < 1, 'Opening the editor restores the top-aligned layout');
      assert.equal(await screen(page, '.lab-note-entry').isVisible(), true);
      assert.equal(await screen(page, '.kbd').isVisible(), platform.viewport.width > 640);
      await screen(page, '.lab-note-entry').fill('Sade bir ambalaj olsun.');
      assert.equal(await screen(page, '[data-act="generate"]').isEnabled(), true);
    }));
  }
});

describe('home card layout', { concurrency: 3 }, () => {
  for (const platform of [
    ...platforms,
    { name: 'wide desktop Chromium', browser: 'chromium', viewport: { width: 1920, height: 1080 } },
    { name: 'short landscape Chromium', browser: 'chromium', viewport: { width: 812, height: 375 } },
    { name: 'short portrait Chromium', browser: 'chromium', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
  ]) {
    test(`${platform.name}: compact cards with outer spacing and consistent scenario order`, () => withPage(platform, async (page, state) => {
      await initialize(page, state, 'classic', false);
      await page.waitForFunction(() => App.cur.el.classList.contains('is-settled'));
      const measure = () => page.evaluate(() => {
        const cards = [...App.cur.el.querySelectorAll('.exp-card')].map(card => {
          const bounds = card.getBoundingClientRect();
          const art = card.querySelector('.exp-art').getBoundingClientRect();
          const cta = card.querySelector('.exp-cta').getBoundingClientRect();
          const copy = card.querySelector('p').getBoundingClientRect();
          return {
            height: bounds.height, artHeight: art.height, inset: art.left - bounds.left,
            rightInset: bounds.right - art.right, topInset: art.top - bounds.top,
            ctaBottom: bounds.bottom - cta.bottom, ctaVisible: cta.bottom <= bounds.bottom,
            contentFits: copy.bottom <= cta.top + 1, route: card.dataset.go,
          };
        });
        const hint = App.cur.el.querySelector('.tap-hint'), bounds = hint.getBoundingClientRect();
        const group = App.cur.el.querySelector('.exp-cards').getBoundingClientRect();
        const hero = App.cur.el.querySelector('.home-hero').getBoundingClientRect();
        return {
          cards, center: bounds.left + bounds.width / 2, viewport: innerWidth,
          font: parseFloat(getComputedStyle(hint).fontSize), bottom: bounds.bottom, viewportHeight: innerHeight,
          notice: App.cur.el.textContent.includes('Fotoğrafların ve bilgilerin'),
          group: { left: group.left, right: group.right, top: group.top, bottom: group.bottom, height: group.height },
          heroBottom: hero.bottom, vmin: Math.min(innerWidth, innerHeight) / 100,
          portrait: matchMedia('(orientation: portrait)').matches,
        };
      });
      const check = data => {
        assert.equal(data.cards.length, 3);
        assert.ok(Math.max(...data.cards.map(card => card.height)) - Math.min(...data.cards.map(card => card.height)) < 1);
        assert.ok(Math.max(...data.cards.map(card => card.artHeight)) - Math.min(...data.cards.map(card => card.artHeight)) < 1);
        assert.ok(Math.max(...data.cards.map(card => card.ctaBottom)) - Math.min(...data.cards.map(card => card.ctaBottom)) < 1);
        for (const card of data.cards) {
          assert.ok(card.inset < 2 && card.topInset < 2, 'Spacing surrounds the cards, not their thumbnails');
          if (!data.portrait) assert.ok(card.rightInset < 2);
          assert.equal(card.ctaVisible, true);
          assert.equal(card.contentFits, true, 'Card copy must not overlap its action');
        }
        assert.deepEqual(data.cards.map(card => card.route), ['photo.quiz', 'lab.base', 'podcast.product']);
        assert.ok(data.group.left >= 8.9 * data.vmin);
        assert.ok(data.viewport - data.group.right >= 8.9 * data.vmin);
        assert.ok(data.group.top - data.heroBottom >= 6 * data.vmin);
        assert.ok(data.group.height <= (data.portrait ? 126 : 50) * data.vmin + 1);
        assert.ok(data.viewportHeight - data.group.bottom >= 10 * data.vmin);
        assert.ok(Math.abs(data.center - data.viewport / 2) < 1);
        assert.ok(data.font >= 14);
        assert.ok(data.bottom <= data.viewportHeight - 8 * data.vmin);
        assert.equal(data.notice, false);
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
      for (const ui of ['cowork', 'chat']) {
        await initialize(page, state, ui, false);
        assert.deepEqual(await page.locator('#cards [data-agent]').evaluateAll(cards => cards.map(card => card.dataset.agent)), ['photo', 'lab', 'podcast']);
      }
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
      await page.locator('#connection-demo').uncheck();
      await page.waitForFunction(() => !document.getElementById('connection-form').inert);
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
      assert.match(await page.locator('#messages .answer-text').last().innerText(), /İkinci malzeme/);
      await option(page, 1).click();
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
      await page.locator('#photoInput').setInputFiles(path.join(__dirname, 'samples', 'reference.jpg'));
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
