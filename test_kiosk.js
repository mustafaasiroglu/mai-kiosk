const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const engine = fs.readFileSync(path.join(__dirname, 'kiosk-engine.js'), 'utf8').replace(/\r\n/g, '\n');
const sampleSource = fs.readFileSync(path.join(__dirname, 'samples.js'), 'utf8');
const sourceBetween = (start, end) => {
  const offset = engine.indexOf(start);
  assert.notEqual(offset, -1);
  const finish = engine.indexOf(end, offset);
  assert.notEqual(finish, -1);
  return engine.slice(offset, finish);
};

test('connection selection can repeatedly switch Demo and Live and cancel without changing mode', async () => {
  const nodes = new Map();
  const element = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, {
      listeners: new Map(), open: false, value: '',
      addEventListener(type, handler) {
        const handlers = this.listeners.get(type) || [];
        handlers.push(handler); this.listeners.set(type, handlers);
      },
      async dispatch(type) {
        const event = { prevented: false, preventDefault() { this.prevented = true; } };
        for (const handler of this.listeners.get(type) || []) await handler(event);
        return event;
      },
      focus() {}, showModal() { this.open = true; }, close() { this.open = false; },
    });
    return nodes.get(selector);
  };
  const form = element('#connection-form');
  form.elements = Object.fromEntries(['endpoint', 'key', 'imageModel', 'labModel'].map(name => [name, element(name)]));
  form.reset = () => Object.values(form.elements).forEach(field => { field.value = ''; });
  const config = { ai: { mode: 'mock' } }, stored = new Map(), transitions = [];
  const context = vm.createContext({
    CONFIG: config, $: element, icon: () => '',
    location: { protocol: 'https:', hostname: 'example.test' },
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    FormData: class { constructor(form) { this.form = form; } get(name) { return this.form.elements[name].value; } },
  });
  vm.runInContext(sourceBetween('const FoundrySettings =', 'function boot()'), context);
  const reopen = context.chooseConnection(() => transitions.push(config.ai.mode));
  assert.equal((await element('#connection-dialog').dispatch('cancel')).prevented, true);
  await element('#connection-demo').dispatch('click');
  for (let i = 0; i < 2; i++) {
    reopen();
    await element('#connection-live').dispatch('click');
    Object.entries({
      endpoint: 'https://test-resource.services.ai.azure.com',
      key: 'test-placeholder', imageModel: 'test-image', labModel: 'test-text',
    }).forEach(([name, value]) => { form.elements[name].value = value; });
    await form.dispatch('submit');
    assert.equal(config.ai.mode, 'live');
    reopen();
    assert.equal((await element('#connection-dialog').dispatch('cancel')).prevented, false);
    element('#connection-dialog').close();
    assert.equal(config.ai.mode, 'live');
    reopen();
    await element('#connection-demo').dispatch('click');
    assert.equal(config.ai.mode, 'mock');
    assert.equal(element('#connection-dialog').open, false);
  }
  assert.deepEqual(transitions, ['mock', 'live', 'mock', 'live', 'mock']);
  assert.equal(form.listeners.get('submit').length, 1);
  assert.equal(element('#connection-demo').listeners.get('click').length, 1);
});

test('settings reflect sound and busy state and report fullscreen failures explicitly', async () => {
  const nodes = new Map();
  const element = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } });
    return nodes.get(selector);
  };
  const config = { sound: true, ai: { mode: 'mock' } }, app = { cur: { def: {} } };
  const labels = [{}, {}], notifications = [], errors = [];
  const document = {
    fullscreenElement: null,
    documentElement: { requestFullscreen: async () => { document.fullscreenElement = {}; } },
    exitFullscreen: async () => { document.fullscreenElement = null; },
  };
  const context = vm.createContext({
    CONFIG: config, App: app, document, $: element, $$: () => labels,
    API: { get live() { return config.ai.mode === 'live'; } },
    Toast: { show: message => notifications.push(message) },
    console: { error: (...args) => errors.push(args) },
  });
  vm.runInContext(sourceBetween('function modeLabel()', '/* ---------- Açılış') + '\nglobalThis.settings = Settings;', context);
  const settings = context.settings;
  settings.el = {};
  settings.refresh();
  assert.equal(element('[data-settings="sound"]').attributes['aria-checked'], 'true');
  assert.equal(element('#settings-sound-state').textContent, 'Açık');
  assert.equal(labels[0].textContent, 'Demo Modu');
  config.sound = false;
  config.ai.mode = 'live';
  app.cur.def.noIdle = true;
  settings.refresh();
  assert.equal(element('[data-settings="sound"]').attributes['aria-checked'], 'false');
  assert.equal(element('#settings-sound-state').textContent, 'Kapalı');
  assert.equal(element('[data-settings="mode"]').disabled, true);
  assert.equal(element('#settings-busy').hidden, false);
  assert.ok(labels.every(label => label.textContent === 'Live Mode'));
  app.cur.def.noIdle = false;
  await settings.toggleFullscreen();
  assert.equal(element('#settings-fullscreen-label').textContent, 'Tam ekrandan çık');
  await settings.toggleFullscreen();
  assert.equal(element('#settings-fullscreen-label').textContent, 'Tam ekran yap');
  document.documentElement.requestFullscreen = async () => { throw new Error('Permission denied'); };
  await settings.toggleFullscreen();
  assert.equal(errors.length, 1);
  assert.match(notifications[0], /Tam ekran değiştirilemedi/);
  assert.equal(element('[data-settings="mode"]').disabled, false);
});

test('career native name input and virtual keyboard stay synchronized without double typing', () => {
  const nodes = new Map(), transitions = [];
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      value: '', listeners: {}, classList: { add() {}, remove() {}, toggle() {} },
      attributes: {}, setAttribute(k, v) { this.attributes[k] = v; },
      addEventListener(type, fn) { this.listeners[type] = fn; },
    });
    return nodes.get(selector);
  };
  let onKey;
  const context = vm.createContext({
    SCREENS: {}, STATE: { career: {} }, CONFIG: { ai: {} }, API: { live: false },
    $: node, Modal: { cur: null }, Sound: { key() {}, tap() {} },
    App: { go: id => transitions.push(id) }, setTimeout: fn => fn(),
    window: { addEventListener: (_type, fn) => { onKey = fn; }, removeEventListener() {} },
  });
  vm.runInContext(sourceBetween('const trUp =', 'function slugTR('), context);
  vm.runInContext(sourceBetween('const KB_ROWS =', 'const displayName ='), context);
  vm.runInContext(sourceBetween('const nameValid =', 'function avatarHTML('), context);
  vm.runInContext(sourceBetween("SCREENS['career.name'] =", "SCREENS['career.search'] ="), context);
  const el = node('screen');
  context.SCREENS['career.name'].mount(el, { cleanup() {} });
  const input = node('.career-name-entry'), keyboard = node('.kbd');
  input.value = 'Ayşe'; input.listeners.input();
  assert.equal(node('[data-act="search"]').disabled, true);
  input.value = 'ayşe yılmaz'; input.listeners.input();
  assert.equal(node('.key.go').disabled, false);
  onKey({ key: 'z', target: { closest: () => input } });
  assert.equal(context.STATE.career.name, 'ayşe yılmaz');
  const key = node('key'); key.dataset = { key: 'back' };
  keyboard.listeners.pointerdown({ target: { closest: () => key }, preventDefault() {} });
  assert.equal(input.value, 'ayşe yılma');
  key.dataset.key = 'z';
  keyboard.listeners.click({ detail: 0, target: { closest: () => key } });
  keyboard.listeners.click({ detail: 1, target: { closest: () => key } });
  assert.equal(input.value, 'ayşe yılmaz');
  node('.career-name-form').listeners.submit({ preventDefault() {} });
  assert.equal(context.STATE.career.name, 'Ayşe Yılmaz');
  assert.deepEqual(transitions, ['career.search']);
  assert.equal(context.STATE.career.picked, null);
  onKey({ key: 'Enter', target: { closest: () => node('family') } });
  assert.deepEqual(transitions, ['career.search']);
});

test('career choices restore the selected profile and expose the selected style accessibly', () => {
  const nodes = new Map(), cards = [];
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      attributes: {}, classList: { add() {}, toggle() {} },
      setAttribute(k, v) { this.attributes[k] = v; },
    });
    return nodes.get(selector);
  };
  const people = [{ id: 'p0', name: 'Deniz Yıldız', headline: 'Analist' }, { id: 'p1', name: 'Deniz Yıldız', headline: 'Tasarımcı' }];
  const context = vm.createContext({
    SCREENS: {}, STATE: { career: { results: people, picked: people[1], profile: people[1], styleId: 'metro' } },
    API: { live: false },
    $: node, $$: selector => selector === '[data-person]' ? cards : [], icon: () => '', esc: String, avatarHTML: () => '',
    careerSearchIsLive: () => false, Sound: { select() {} },
    CAREER_STYLES: [{ id: 'metro', name: 'Metro', desc: 'Duraklar', thumbnail: 'metro.jpg' }],
  });
  vm.runInContext(sourceBetween("SCREENS['career.pick'] =", "SCREENS['career.analyze'] ="), context);
  vm.runInContext(sourceBetween("SCREENS['career.style'] =", "SCREENS['career.gen'] ="), context);
  const markup = context.SCREENS['career.pick'].render();
  assert.match(markup, /data-person="p1" aria-pressed="true"/);
  assert.doesNotMatch(markup, /data-act="confirm" disabled/);
  assert.match(context.SCREENS['career.style'].render(), /data-style="metro" aria-pressed="true"/);
  cards.push(node('p0'), node('p1'));
  cards[0].dataset = { person: 'p0' }; cards[1].dataset = { person: 'p1' };
  let click;
  context.SCREENS['career.pick'].mount({ addEventListener: (_type, fn) => { click = fn; } });
  click({ target: { closest: selector => selector === '[data-person]' ? cards[0] : null } });
  assert.equal(context.STATE.career.picked, people[0]);
  assert.equal(cards[0].attributes['aria-pressed'], 'true');
  assert.equal(cards[1].attributes['aria-pressed'], 'false');
  assert.equal(node('[data-selected-copy]').textContent, 'Analist');
});

test('career analysis reports failures without automatic profile substitution and handles empty categories', async () => {
  const nodes = new Map(), transitions = [], errors = [];
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      disabled: true, children: [], attributes: {}, classList: { add() {} },
      setAttribute(k, v) { this.attributes[k] = v; },
      replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); },
    });
    return nodes.get(selector);
  };
  const picked = { id: 'p0', name: 'Example' };
  let calls = 0, click;
  const context = vm.createContext({
    SCREENS: {}, STATE: { career: { picked } }, $: node, $$: () => [],
    Sound: { tap() {}, key() {}, success() {} }, icon: () => '', esc: String,
    document: { createElement: () => ({}) }, console: { error: e => errors.push(e) },
    App: { go: id => transitions.push(id) },
    mockPeople: () => assert.fail('Do not silently replace the selected profile'),
    API: { career: {
      profile: async () => { calls++; throw new Error('Offline'); },
      summarize: async () => ({ summary: 'Summary', power: 'Power' }),
    } },
    typeText: async (el, text) => { el.textContent = text; },
  });
  vm.runInContext(sourceBetween("SCREENS['career.analyze'] =", "SCREENS['career.style'] ="), context);
  const el = { addEventListener: (_type, fn) => { click = fn; } };
  const ctx = { alive: true, sleep: async () => {} };
  context.SCREENS['career.analyze'].mount(el, ctx);
  await new Promise(setImmediate);
  assert.equal(calls, 1); assert.equal(errors.length, 1);
  assert.equal(context.STATE.career.picked, picked);
  assert.equal(node('.career-analysis-error').hidden, false);
  assert.equal(node('[data-act="next"]').disabled, true);
  click({ target: { closest: s => s === '[data-act="retry-analysis"]' } });
  assert.deepEqual(transitions, ['career.analyze']);
  nodes.clear();
  context.API.career.profile = async () => ({ ...picked, experience: [], education: [], skills: [], certifications: [] });
  context.SCREENS['career.analyze'].mount(el, ctx);
  await new Promise(setImmediate);
  for (const cat of ['experience', 'education', 'skills', 'certs']) {
    assert.equal(node(`[data-items="${cat}"]`).children[0].textContent, 'Bu başlıkta bilgi yok.');
  }
  assert.equal(node('[data-act="next"]').disabled, false);
  assert.equal(node('.ai-summary').attributes['aria-busy'], 'false');
});

test('four career thumbnails retain matching generation prompts and the same example profile', () => {
  const context = vm.createContext({});
  vm.runInContext(sourceBetween('const CAREER_STYLES =', 'const LAB_BASES =') + '\nglobalThis.styles = CAREER_STYLES;', context);
  vm.runInContext(sourceBetween('function buildInfographicPrompt(', 'async function packagingLogoReference('), context);
  assert.equal(new Set(Array.from(context.styles, s => s.thumbnail)).size, 4);
  let profile;
  for (const style of context.styles) {
    const base = style.thumbnail.replace(/\.jpg$/, '');
    fs.accessSync(path.join(__dirname, style.thumbnail));
    fs.accessSync(path.join(__dirname, base + '-raw.png'));
    const record = JSON.parse(fs.readFileSync(path.join(__dirname, base + '.json'), 'utf8'));
    assert.equal(record.prompt, context.buildInfographicPrompt(record.profile, style));
    if (profile) assert.deepEqual(record.profile, profile);
    profile = record.profile;
  }
});

test('photo prompts preserve the holding-and-pointing pose across styles and variations', () => {
  const context = vm.createContext({ CONFIG: { event: { productBrand: 'Brand' } } });
  vm.runInContext(sourceBetween('function buildPhotoPrompt(', 'function buildInfographicPrompt('), context);
  const product = { name: 'Snack', image: 'reference', ingredientEn: 'coconut and chocolate' };
  for (const id of ['snowglobe', 'adface', 'blocky', 'factory', 'space', 'popart']) {
    const prompt = context.buildPhotoPrompt(product, { id, prompt: 'Scene: {product} with {ingredient}.' }, 1);
    assert.match(prompt, /exactly one hand holds a single product package/);
    assert.match(prompt, /other hand points its index finger/);
    assert.match(prompt, /fingers stay away from the logo and label/);
    if (id === 'blocky') {
      assert.match(prompt, /genuine low-resolution pixel art/);
      assert.match(prompt, /No photographic wrapper/);
      assert.doesNotMatch(prompt, /preserve its exact silhouette/);
    } else assert.match(prompt, /preserve its exact silhouette/);
    assert.match(prompt, /Brand Snack with coconut and chocolate/);
    assert.match(prompt, /keeping the same one-hand-holds, other-hand-points pose/);
    assert.doesNotMatch(prompt, /\{product\}|\{ingredient\}/);
    if (id === 'blocky') assert.match(prompt, /blocky voxel character/);
    else if (id === 'popart') assert.match(prompt, /pop-art comic character/);
    else assert.match(prompt, /3D vinyl\/clay character figurine/);
  }
});

test('photo compositors omit left-hand captions and product thumbnails but retain the signature band', async () => {
  const pack = {};
  const bands = [];
  const canvas = { getContext: () => ({ save() {}, restore() {} }), toDataURL: () => 'image' };
  const context = vm.createContext({
    makeCanvas: () => canvas,
    loadImage: async () => ({}),
    photoPackImage: async () => pack,
    mulberry32: () => () => 0,
    hashStr: () => 0,
    PHOTO_RENDERERS: { snowglobe() {} },
    coverDraw() {},
    drawBrandBand: (_g, _w, _h, options = {}) => bands.push(options),
  });
  vm.runInContext(sourceBetween('async function renderPhotoMock(', '/* ---------- Kariyer infografi'), context);
  await context.renderPhotoMock({ photo: 'reference', product: { id: 'snack' }, theme: { id: 'snowglobe' } });
  await context.composePhoto('generated');
  assert.equal(bands.length, 2);
  for (const options of bands) {
    assert.equal(options.pack, undefined);
    assert.equal(options.title, undefined);
    assert.equal(options.sub, undefined);
  }
});

test('Demo camera uses sample_photo.jpeg without requesting webcam access, including retakes', () => {
  const elements = Object.fromEntries(['video', '.cam-shot', '.cam-count', '.cam-flash'].map(selector => [selector, {}]));
  let click;
  const el = { dataset: {}, classList: { add() {} }, addEventListener: (_type, handler) => { click = handler; } };
  const context = vm.createContext({
    API: { live: false }, STATE: { photo: {} }, SCREENS: {},
    $: selector => elements[selector],
    Camera: { stream: null, start: () => assert.fail('Demo must not request webcam access'), stop() {} },
    Sound: { tap() {} },
  });
  vm.runInContext(sampleSource, context);
  vm.runInContext(sourceBetween('function demoPortrait()', '/* ---------- Fotoğraf temaları'), context);
  vm.runInContext(sourceBetween("SCREENS['photo.camera'] =", "SCREENS['photo.gen'] ="), context);
  context.SCREENS['photo.camera'].mount(el, { alive: true, cleanup() {} });
  assert.equal(context.STATE.photo.photo, 'sample_photo.jpeg');
  assert.equal(elements['.cam-shot'].src, 'sample_photo.jpeg');
  assert.equal(el.dataset.state, 'review');
  click({ target: { closest: () => ({ dataset: { act: 'retake' } }) } });
  assert.equal(context.STATE.photo.photo, 'sample_photo.jpeg');
  assert.equal(el.dataset.state, 'review');
});

test('pose button ignores the document color theme and keeps the selected photo theme', () => {
  let click;
  const next = { disabled: true }, grid = { classList: { add() {} } }, transitions = [];
  const context = vm.createContext({
    SCREENS: {}, STATE: { photo: { productId: 'cocostar' } },
    $: selector => selector === '.theme-grid' ? grid : next,
    $$: () => [], Sound: { tap() {}, select() {} },
    App: { go: id => transitions.push(id) },
  });
  vm.runInContext(sourceBetween("SCREENS['photo.theme'] =", "SCREENS['photo.camera'] ="), context);
  context.SCREENS['photo.theme'].mount({ addEventListener: (_event, handler) => { click = handler; } });
  const theme = { dataset: { theme: 'snowglobe' } };
  click({ target: { closest: selector => selector === 'button[data-theme]' ? theme : null } });
  assert.equal(next.disabled, false);
  for (const colorTheme of ['light', 'dark']) {
    click({ target: { closest: selector => {
      if (selector === '[data-theme]') return { dataset: { theme: colorTheme } };
      return selector === '[data-act="next"]' ? next : null;
    } } });
    assert.equal(context.STATE.photo.themeId, 'snowglobe');
  }
  assert.deepEqual(transitions, ['photo.camera', 'photo.camera']);
});

function cameraHarness(getUserMedia) {
  const context = vm.createContext({
    navigator: { mediaDevices: { getUserMedia } }, DOMException, setTimeout, clearTimeout,
    requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout,
  });
  vm.runInContext(sourceBetween('const Camera = {', '/* Türkçe Q ekran klavyesi */') + '\nglobalThis.camera = Camera;', context);
  return context.camera;
}
const testStream = () => {
  const track = { stopped: 0, stop() { this.stopped++; } };
  return { track, getTracks: () => [track] };
};
const testVideo = play => ({
  srcObject: null, videoWidth: 1080, videoHeight: 1350, readyState: 4,
  setAttribute() {}, play: play || (async () => {}),
});

test('late camera permission cannot revive a closed screen or stop a newer camera', async () => {
  const pending = [];
  const camera = cameraHarness(() => new Promise(resolve => pending.push(resolve)));
  const first = testStream(), second = testStream(), oldVideo = testVideo(), newVideo = testVideo();
  const oldRequest = camera.start(oldVideo);
  camera.stop();
  const newRequest = camera.start(newVideo);
  pending[1](second);
  assert.equal(await newRequest, second);
  pending[0](first);
  await assert.rejects(oldRequest, { name: 'AbortError' });
  assert.equal(first.track.stopped, 1);
  assert.equal(second.track.stopped, 0);
  assert.equal(oldVideo.srcObject, null);
  assert.equal(newVideo.srcObject, second);
  camera.stop();
  assert.equal(second.track.stopped, 1);
  assert.equal(newVideo.srcObject, null);
});

test('camera playback and permission failures propagate and release acquired tracks', async () => {
  const stream = testStream(), video = testVideo(async () => { throw new Error('Playback blocked'); });
  const camera = cameraHarness(async () => stream);
  await assert.rejects(camera.start(video), /Playback blocked/);
  assert.equal(stream.track.stopped, 1);
  assert.equal(video.srcObject, null);
  assert.equal(camera.stream, null);
  await assert.rejects(cameraHarness(async () => { throw new DOMException('Permission denied', 'NotAllowedError'); }).start(testVideo()), { name: 'NotAllowedError' });
  assert.equal(camera.capture({ videoWidth: 1080, videoHeight: 1350, readyState: 1 }), null);
});

test('camera waits for a drawable frame and cancels that wait when its screen closes', async () => {
  const stream = testStream(), camera = cameraHarness(async () => stream), video = testVideo();
  video.readyState = 1;
  let ready = false;
  const opening = camera.start(video).then(() => { ready = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ready, false);
  video.readyState = 2;
  await opening;
  camera.stop();
  const nextStream = testStream(), nextCamera = cameraHarness(async () => nextStream), nextVideo = testVideo();
  nextVideo.readyState = 1;
  const pending = nextCamera.start(nextVideo);
  await new Promise(resolve => setImmediate(resolve));
  nextCamera.stop();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(nextStream.track.stopped, 1);
  assert.equal(nextVideo.srcObject, null);
});

test('failed live capture shows an error without silently substituting the demo photo', async () => {
  const elements = Object.fromEntries(['video', '.cam-shot', '.cam-count', '.cam-flash', '.cam-state.error p']
    .map(selector => [selector, { classList: { add() {}, remove() {} } }]));
  let click, stopped = 0;
  const errors = [], transitions = [];
  const el = { dataset: {}, classList: { add() {} }, addEventListener: (_type, handler) => { click = handler; } };
  const context = vm.createContext({
    SCREENS: {}, API: { live: true }, STATE: { photo: {} },
    $: selector => elements[selector],
    Camera: { start: async () => ({ getVideoTracks: () => [] }), capture: () => null, stop: () => { stopped++; } },
    Sound: { tick() {}, tap() {} }, console: { error: (...args) => errors.push(args) },
    App: { go: id => transitions.push(id) },
    demoPortrait: () => assert.fail('A failed real capture must not become a sample photo'),
  });
  vm.runInContext(sourceBetween("SCREENS['photo.camera'] =", "SCREENS['photo.gen'] ="), context);
  context.SCREENS['photo.camera'].mount(el, { alive: true, cleanup() {}, sleep: async () => {} });
  await new Promise(resolve => setImmediate(resolve));
  click({ target: { closest: () => ({ dataset: { act: 'shoot' } }) } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(el.dataset.state, 'error');
  assert.equal(context.STATE.photo.photo, undefined);
  assert.match(elements['.cam-state.error p'].textContent, /fotoğraf çekmeye hazır değil/);
  assert.equal(stopped, 1);
  assert.equal(errors.length, 1);
  click({ target: { closest: () => ({ dataset: { act: 'start' } }) } });
  assert.deepEqual(transitions, []);
});

test('kiosk and Cowork reuse saved Foundry credentials and local settings override saved values', async () => {
  const stored = new Map(), form = { elements: Object.fromEntries(['endpoint', 'key', 'imageModel', 'labModel'].map(name => [name, { value: '' }])) };
  const context = vm.createContext({
    CONFIG: { ai: {} }, AbortSignal,
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    location: { hostname: 'localhost', protocol: 'http:' },
    fetch: async () => ({ ok: true, json: async () => ({ key: 'local-test-key', labModel: '' }) }),
  });
  vm.runInContext(sourceBetween('const FoundrySettings =', 'function chooseConnection(') + '\nglobalThis.settings = FoundrySettings;', context);
  const settings = { endpoint: 'https://test.services.ai.azure.com', apiKey: 'shared-test-key', imageDeployment: 'test-image', labDeployment: 'test-text' };
  context.settings.save(settings);
  context.settings.loadSaved(form);
  assert.equal(form.elements.key.value, 'shared-test-key');
  assert.equal(form.elements.imageModel.value, 'test-image');
  await context.settings.loadLocal(form);
  assert.equal(form.elements.key.value, 'local-test-key');
  assert.equal(form.elements.labModel.value, '');
  assert.equal(form.elements.endpoint.value, settings.endpoint);
  context.settings.apply(settings);
  assert.equal(context.CONFIG.ai.modelLabel, 'test-image');
  context.fetch = async () => ({ ok: false, status: 500 });
  await assert.rejects(context.settings.loadLocal(form), /HTTP 500/);
  context.localStorage.setItem = () => { throw new Error('Storage blocked'); };
  assert.throws(() => context.settings.save(settings), /Storage blocked/);
});

test('Demo returns saved gallery outputs and matching Lab copy without generating images or text', async () => {
  const record = JSON.parse(fs.readFileSync(path.join(__dirname, 'samples', 'reference-photo', 'pack-cake.json'), 'utf8'));
  const paths = [];
  const context = vm.createContext({
    CONFIG: { ai: { mode: 'mock' }, mock: { speed: 0 } }, sleep: async () => {},
    fetch: async path => {
      paths.push(path);
      return { ok: true, json: async () => record, blob: async () => ({ path, type: 'image/jpeg' }) };
    },
    FileReader: class { readAsDataURL(blob) { this.result = 'saved:' + blob.path; this.onload(); } },
    MAI: { generate: () => assert.fail('No model call in Demo'), edit: () => assert.fail('No model call in Demo') },
    Chat: { json: () => assert.fail('No text model call in Demo') },
    mockConcept: () => assert.fail('Demo must use the copy belonging to its saved output'),
    renderPhotoMock: () => assert.fail('Demo must not draw a synthetic photo'),
    renderInfographic: () => assert.fail('Demo must not draw a synthetic career output'),
    renderPackaging: () => assert.fail('Demo must not draw a synthetic package'),
  });
  vm.runInContext(sampleSource, context);
  vm.runInContext(sourceBetween('const LAB_COPY_LIMITS =', '/* ---------- Mock üreticiler'), context);
  vm.runInContext(sourceBetween('const SavedSamples =', 'function shareUrlFor(') + '\nglobalThis.api = API;', context);
  for (const id of ['snowglobe', 'adface', 'blocky', 'factory', 'space', 'popart']) {
    assert.equal(await context.api.photo.generate({ photo: 'other input', product: {}, theme: { id }, variation: 3 }, { fast: true }), `saved:samples/photo-${id}.jpg`);
  }
  assert.equal(await context.api.career.infographic({ profile: {}, style: {} }, { fast: true }), 'saved:samples/career-styles/constellation.jpg');
  const concept = await context.api.lab.concept({ base: {}, flavors: [], moment: {} });
  assert.equal(concept.name, record.concept.name);
  assert.equal(concept.slogan, record.concept.slogan);
  assert.equal(await context.api.lab.packaging(concept, { fast: true }), 'saved:samples/reference-photo/pack-cake.jpg');
  assert.ok(paths.includes('samples/reference-photo/pack-cake.json'));
  context.fetch = async () => ({ ok: false, status: 404 });
  await assert.rejects(context.api.photo.generate({ theme: { id: 'snowglobe' } }, { fast: true }), /Kayıtlı örnek yüklenemedi/);
  context.fetch = async () => ({ ok: true, blob: async () => ({ type: 'text/html' }) });
  await assert.rejects(context.api.photo.generate({ theme: { id: 'snowglobe' } }, { fast: true }), /bir görsel değil/);
  context.CONFIG.ai.mode = 'live';
  await assert.rejects(context.api.lab.packaging(concept), /Foundry endpoint/);
  await assert.rejects(context.api.career.infographic({ profile: {}, style: {} }), /Foundry endpoint/);
});

test('Minecraft package references become low-resolution pixel images while other themes retain the source', async () => {
  const pack = { naturalWidth: 1000, naturalHeight: 300 };
  let output;
  const context = vm.createContext({
    packImage: async () => pack,
    makeCanvas: (width, height) => {
      const g = { imageSmoothingEnabled: true, drawImage() {} };
      output = { width, height, getContext: () => g };
      return output;
    },
  });
  vm.runInContext(sourceBetween('async function photoPackImage(', '/* Karakter sorusu ikonları'), context);
  assert.equal(await context.photoPackImage({}, { id: 'snowglobe' }), pack);
  const pixel = await context.photoPackImage({}, { id: 'blocky' });
  assert.ok(pixel.width <= 64 && pixel.height <= 64);
  assert.equal(pixel.getContext('2d').imageSmoothingEnabled, false);
  assert.ok(Math.abs(pixel.width / pixel.height - pack.naturalWidth / pack.naturalHeight) < 0.1);
});

test('GPT Lab requests use the OpenAI v1 endpoint and strict structured output; MAI retains its endpoint', async () => {
  for (const model of ['gpt-5.4-mini', 'MAI-Thinking-1']) {
    let request;
    const context = vm.createContext({
      CONFIG: { ai: { labDeployment: model } },
      MAI: { request: async (route, body, api) => {
        request = { route, body, api };
        return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"name":"Test"}' } }] }) };
      } },
    });
    vm.runInContext(sourceBetween('const LAB_COPY_LIMITS =', '/* ---------- Mock üreticiler'), context);
    vm.runInContext(sourceBetween('const Chat = {', 'const Backend = {') + '\nglobalThis.chat = Chat;', context);
    assert.equal((await context.chat.json('Instructions', 'Choices')).name, 'Test');
    if (model.startsWith('gpt-')) {
      assert.equal(request.api, 'openai/v1');
      assert.equal(request.body.messages[0].role, 'developer');
      assert.equal(request.body.response_format.json_schema.strict, true);
      assert.deepEqual(Array.from(request.body.response_format.json_schema.schema.required), ['name', 'slogan', 'story', 'visualDirection']);
      assert.match(request.body.response_format.json_schema.schema.properties.visualDirection.description, /360 characters/);
    } else {
      assert.equal(request.api, 'mai/v1');
      assert.equal(request.body.response_format, undefined);
    }
  }
});

test('Lab copy validates empty and overlong fields instead of truncating or using mock text', async () => {
  const good = { name: 'Fıstık Işığı', slogan: 'Molana çıtır bir ışıltı.', story: 'Fıstık ve karamel, çıtır gofrette buluşur.', visualDirection: 'Green and gold packaging on a warm neutral podium.' };
  let response = good, calls = 0;
  const context = vm.createContext({
    CONFIG: { ai: { labDeployment: 'gpt-5.4-mini' }, event: { productBrand: 'Brand' } },
    Chat: { json: async () => { calls++; return response; } },
    mockConcept: () => ({ name: 'mock-name', slogan: 'mock-slogan', baseEn: 'wafer', flavorEn: 'pistachio' }),
  });
  vm.runInContext(sourceBetween('const LAB_COPY_LIMITS =', '/* ---------- Mock üreticiler'), context);
  const lab = sourceBetween('  lab: {\n    async concept', '  share: {');
  vm.runInContext(`globalThis.API = { get live() { return true; }, ${lab} };`, context);
  const picks = { base: { name: 'Gofret' }, flavors: [{ name: 'Antep Fıstığı' }], moment: { name: 'Mola' } };
  assert.equal((await context.API.lab.concept(picks)).name, good.name);
  assert.equal(context.validateLabCopy({ ...good, name: 'x'.repeat(24) }).name.length, 24);
  response = { ...good, name: 'x'.repeat(25) };
  await assert.rejects(context.API.lab.concept(picks), /karakter sınırını aştı/);
  response = { ...good, story: ' ' };
  await assert.rejects(context.API.lab.concept(picks), /eksik bir konsept/);
  const before = calls;
  context.CONFIG.ai.labDeployment = '';
  await assert.rejects(context.API.lab.concept(picks), /metin modeli dağıtımı seçin/);
  assert.equal(calls, before);
});

test('Laboratory flavor choices render all twelve ingredient illustrations', () => {
  const context = vm.createContext({
    STATE: { lab: { baseId: 'gofret', flavorIds: [] } },
    SCREENS: {},
    esc: value => value,
    icon: () => '',
  });
  vm.runInContext(sourceBetween('const LAB_BASES =', '/* ---------- "Biliyor muydun?"'), context);
  vm.runInContext(sourceBetween('function baseArt(', '/* Kamera kılavuz silueti'), context);
  vm.runInContext(sourceBetween("SCREENS['lab.flavor'] =", "SCREENS['lab.moment'] ="), context);
  const rendered = context.SCREENS['lab.flavor'].render();
  assert.equal([...rendered.matchAll(/data-flavor=/g)].length, 12);
  assert.equal([...rendered.matchAll(/<svg /g)].length, 12);
  assert.doesNotMatch(rendered, /undefined/);
});

test('Laboratory generation waits for copy and never requests an image when copy fails', async () => {
  const order = [];
  let task, releaseCopy;
  const copyReady = new Promise(resolve => { releaseCopy = resolve; });
  const context = vm.createContext({
    DOMException,
    STATE: { lab: {} },
    SCREENS: {},
    $: () => null,
    FlaskViz() {},
    labStages: () => [],
    labPicks: () => ({ base: { name: 'Gofret' }, flavors: [{ name: 'Fıstık', color: 'green' }], moment: { name: 'Mola' } }),
    runGenView: (_el, _ctx, options) => { task = options.task; return new Promise(() => {}); },
    API: { live: true, lab: {
      concept: async () => { order.push('copy'); await copyReady; return { name: 'Generated name' }; },
      packaging: async concept => { assert.equal(concept.name, 'Generated name'); order.push('image'); return 'generated image'; },
    } },
  });
  vm.runInContext(sourceBetween("SCREENS['lab.gen'] =", "SCREENS['lab.result'] ="), context);
  const ctx = { alive: true, tips: [] };
  context.SCREENS['lab.gen'].mount({}, ctx);
  const generation = task();
  assert.deepEqual(order, ['copy']);
  releaseCopy();
  await generation;
  assert.deepEqual(order, ['copy', 'image']);
  context.API.lab.concept = async () => { throw new Error('Copy validation failed'); };
  await assert.rejects(task(), /Copy validation failed/);
  assert.deepEqual(order, ['copy', 'image']);
  let releaseAbandoned;
  context.API.lab.concept = () => new Promise(resolve => { releaseAbandoned = resolve; });
  const abandoned = task();
  ctx.alive = false;
  releaseAbandoned({ name: 'Abandoned copy' });
  await assert.rejects(abandoned, error => error.name === 'AbortError');
  assert.deepEqual(order, ['copy', 'image']);
});

test('live Laboratory packaging passes the official logo to image edits and fails if it cannot load', async () => {
  const logo = { naturalWidth: 1200, naturalHeight: 384 }, ref = new Blob(['logo'], { type: 'image/png' });
  const draws = [], edits = [], concept = { name: 'Test snack', slogan: 'Test slogan', baseEn: 'wafer', flavorEn: 'pistachio' };
  const context = vm.createContext({
    CONFIG: { event: { productBrand: 'Ülker', productLogo: 'assets/ulker-logo.png' }, ai: { endpoint: 'test' } },
    loadImage: async src => { assert.equal(src, 'assets/ulker-logo.png'); return logo; },
    makeCanvas: (width, height) => ({
      width, height, getContext: () => ({ fillRect() {}, drawImage: (...args) => draws.push(args) }),
      toDataURL: type => { assert.equal(type, 'image/png'); return 'png-reference'; },
    }),
    dataUrlToBlob: data => { assert.equal(data, 'png-reference'); return ref; },
    MAI: {
      edit: async (prompt, refs) => { edits.push({ prompt, refs }); return 'generated'; },
      generate: () => assert.fail('Laboratory must use the logo reference, not text-only generation'),
    },
    composePack: async (image, copy) => { assert.equal(copy, concept); return image; },
  });
  vm.runInContext(sourceBetween('async function packagingLogoReference(', 'const LAB_COPY_LIMITS'), context);
  vm.runInContext(`globalThis.API = { live: true, ${sourceBetween('  lab: {\n    async concept', '  share: {')} };`, context);
  assert.equal(await context.API.lab.packaging(concept), 'generated');
  assert.equal(edits[0].refs[0], ref);
  assert.match(edits[0].prompt, /Reference image 1 contains only the official Ülker logo/);
  assert.match(edits[0].prompt, /Do not recreate the brand as typed text/);
  assert.match(edits[0].prompt, /"Test snack"/);
  assert.match(edits[0].prompt, /"Test slogan"/);
  assert.equal(draws[0][0], logo);
  assert.ok(Math.abs(draws[0][3] / draws[0][4] - 1200 / 384) < 0.0001);
  context.loadImage = async () => { throw new Error('Logo unavailable'); };
  await assert.rejects(context.API.lab.packaging(concept), /Logo unavailable/);
  assert.equal(edits.length, 1);
  context.CONFIG.event.productLogo = '';
  await assert.rejects(context.API.lab.packaging(concept), /resmi ürün logosu ayarlanmamış/);
});

test('canvas packaging renderer draws the real logo instead of a typeset imitation', async () => {
  const logo = { naturalWidth: 1200, naturalHeight: 384 }, images = [], text = [];
  const gradient = { addColorStop() {} };
  const g = new Proxy({
    drawImage: (...args) => images.push(args),
    fillText: value => text.push(value),
    measureText: () => ({ width: 20 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  }, { get: (target, name) => target[name] || (() => {}) });
  const context = vm.createContext({
    CONFIG: { event: { productBrand: 'Ülker', productLogo: 'assets/ulker-logo.png' } },
    loadImage: async src => { assert.equal(src, 'assets/ulker-logo.png'); return logo; },
    makeCanvas: () => ({ getContext: () => g, toDataURL: () => 'demo-pack' }),
    mulberry32: () => () => 0.5, hashStr: () => 1, TAU: Math.PI * 2, FONT_T: 'font',
    shade: color => color, trUp: value => value.toUpperCase(), trLow: value => value.toLowerCase(),
    cfont: () => '', wrapLines: (_g, value) => [value],
    rr() {}, softDot() {}, spaced() {}, burstPath() {}, drawBrandBand() {},
  });
  vm.runInContext(sourceBetween('function drawFlowPack(', '/* ==========================================================================\n   Yapay zekâ / servis'), context);
  const concept = { baseId: 'gofret', baseName: 'Gofret', name: 'Test', slogan: 'Slogan', colors: ['red', 'green'], flavorColors: ['green'], flavorText: 'Fıstık' };
  assert.equal(await context.renderPackaging(concept), 'demo-pack');
  assert.equal(images.length, 1);
  assert.equal(images[0][0], logo);
  assert.ok(Math.abs(images[0][3] / images[0][4] - 1200 / 384) < 0.0001);
  assert.ok(!text.includes('ülker'));
});

test('kiosk, gallery and Copilot application scripts parse', () => {
  new vm.Script(engine);
  new vm.Script(sampleSource);
  new vm.Script(fs.readFileSync(path.join(__dirname, 'copilot', 'app.js'), 'utf8'));
  for (const name of ['index.html', 'samples.html', path.join('copilot', 'index.html')]) {
    const content = fs.readFileSync(path.join(__dirname, name), 'utf8');
    for (const match of content.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  }
});

test('stopping a Copilot run aborts its in-flight Foundry request', async () => {
  const context = vm.createContext({
    AbortSignal,
    FormData,
    CONFIG: { ai: { endpoint: 'https://test.services.ai.azure.com', apiKey: 'test' } },
    fetch: (_url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }),
  });
  vm.runInContext(sourceBetween('const MAI = {', 'const Chat = {') + '\nglobalThis.mai = MAI;', context);
  const controller = new AbortController();
  const request = context.mai.request('images/generations', {}, undefined, controller.signal);
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
});

test('gallery shows only the latest attempt per scenario, then applies experience and search filters', () => {
  class Element {
    constructor(value = '') { this.value = value; this.children = []; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    addEventListener() {}
  }
  const content = fs.readFileSync(path.join(__dirname, 'samples.html'), 'utf8');
  const nodes = Object.fromEntries(['kind', 'search', 'gallery', 'count', 'empty']
    .map(id => [`#${id}`, new Element(id === 'kind' ? 'all' : '')]));
  const scripts = [...content.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const context = vm.createContext({ document: {
    querySelector: selector => nodes[selector],
    createElement: () => new Element(),
  } });
  vm.runInContext(sampleSource, context);
  vm.runInContext(scripts.at(-1)[1], context);
  assert.equal(nodes['#gallery'].children.length, 8);
  assert.equal(nodes['#count'].textContent, '8 / 8 örnek');
  const paths = () => nodes['#gallery'].children.map(card => card.children[0].href);
  assert.equal(paths().filter(url => /^samples\/photo-/.test(url)).length, 6);
  assert.ok(paths().includes('samples/reference-photo/pack-cake.jpg'));
  assert.ok(!paths().includes('samples/reference-photo/pack-wafer.jpg'));
  nodes['#kind'].value = 'photo';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 6);
  nodes['#kind'].value = 'pack';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 1);
  nodes['#search'].value = 'Antep';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 0);
  assert.equal(nodes['#empty'].hidden, false);
  nodes['#kind'].value = 'all';
  nodes['#search'].value = 'Reklam';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 1);
  nodes['#kind'].value = 'career';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 0);
  assert.equal(nodes['#empty'].hidden, false);
  nodes['#search'].value = '';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 1);
  assert.equal(nodes['#empty'].hidden, true);
  nodes['#kind'].value = 'all';
  const attemptCount = vm.runInContext('SAMPLE_ATTEMPTS.length', context);
  vm.runInContext("SAMPLE_ATTEMPTS.push({ id: 'lab', title: 'Lezzet Laboratuvarı', product: 'Newest test', kind: 'pack', path: 'samples/new-lab', prompt: 'samples/new-lab.json' });", context);
  context.render();
  assert.equal(nodes['#gallery'].children.length, 8);
  assert.ok(paths().includes('samples/new-lab.jpg'));
  assert.ok(!paths().includes('samples/reference-photo/pack-cake.jpg'));
  assert.equal(vm.runInContext('SAMPLE_ATTEMPTS.length', context), attemptCount + 1);
});
