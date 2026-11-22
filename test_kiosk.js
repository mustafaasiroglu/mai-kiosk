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

const podcastSource = fs.readFileSync(path.join(__dirname, 'podcast.js'), 'utf8');
const podcastVoice = 'en-US-Harper:MAI-Voice-2-Flash';
test('decade music validates selections and files, fades, resamples, ducks and clips the original bed', async () => {
  let response = new Response(fs.readFileSync(path.join(__dirname, 'assets', 'podcast-music', '2000.wav')));
  const context = vm.createContext({ Uint8Array, fetch: async () => response });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'podcast-music.js'), 'utf8') + '\nglobalThis.music = PodcastMusic;', context);
  const music = context.music;
  for (const [year, decade] of [[1944, 1940], [1969, 1960], [2004, 2000], [2020, 2020]]) assert.equal(music.decade({ start: year }), decade);
  for (const year of [1943, '2004', new Date().getFullYear() + 1]) assert.throws(() => music.decade({ start: year }), /geçerli/);
  assert.ok((await music.load({ start: 2004 })).byteLength > 44);
  response = new Response('missing', { status: 404 });
  await assert.rejects(music.load({ start: 2004 }), /HTTP 404/);
  response = new Response(new Uint8Array(44));
  await assert.rejects(music.load({ start: 2004 }), /geçerli bir ses/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(music.load({ start: 2004 }, controller.signal), /abort/i);
  const buffer = value => {
    const samples = new Float32Array(400).fill(value);
    return { sampleRate: 100, duration: 4, getChannelData: () => samples };
  };
  const bed = { sampleRate: 50, getChannelData: () => new Float32Array([1, -.5]) };
  const quiet = buffer(0), speaking = buffer(.5);
  music.mix(quiet, bed);
  music.mix(speaking, bed);
  const samples = quiet.getChannelData();
  assert.equal(samples[0], 0);
  assert.ok(samples[200] > 0 && samples[202] < 0);
  assert.ok(Math.abs(samples[399]) < .001);
  assert.ok(speaking.getChannelData()[200] - .5 < samples[200]);
  const loud = buffer(.999);
  music.mix(loud, { sampleRate: 100, getChannelData: () => new Float32Array([1]) });
  assert.ok(loud.getChannelData().every(value => Number.isFinite(value) && value <= 1 && value >= -1));
});
function groundedPodcastResponse() {
  const lines = ['2003–2004 öğretim yılı 15 Haziran 2004 tarihinde sona erdi.', '2004–2005 öğretim yılı 13 Eylül 2004 tarihinde başladı.'];
  const text = lines.map((line, index) => `- ${line} [${index + 1}]`).join('\n');
  return { status: 'completed', output: [
    { type: 'web_search_call', status: 'completed' },
    { type: 'message', content: [{ type: 'output_text', text, annotations: lines.map((_, index) => ({
      type: 'url_citation', start_index: text.indexOf(`[${index + 1}]`), end_index: text.indexOf(`[${index + 1}]`) + 3,
      url: 'https://example.test/2004-school-calendar', title: 'Test archive',
    })) }] },
  ] };
}
function verifiedPodcastResponse() {
  return { status: 'completed', output: [
    { type: 'web_search_call', status: 'completed', action: { sources: [{ url: 'https://example.test/2004-school-calendar' }] } },
    { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ verified: true, facts: [
      { year: 2004, text: '2003–2004 öğretim yılı 15 Haziran 2004 tarihinde sona erdi.', url: 'https://example.test/2004-school-calendar', title: 'Test archive', evidence: 'Öğretim yılı 15 Haziran 2004 tarihinde sona erdi.' },
      { year: 2004, text: '2004–2005 öğretim yılı 13 Eylül 2004 tarihinde başladı.', url: 'https://example.test/2004-school-calendar', title: 'Test archive', evidence: 'Öğretim yılı 13 Eylül 2004 tarihinde başladı.' },
    ] }) }] },
  ] };
}
function podcastHarness(overrides = {}) {
  const calls = [], stages = [], sessions = [];
  const input = { product: { id: 'gofret' }, era: { id: 'custom', name: '2004' }, moment: { id: 'school' }, memory: 'Arkadaşlarımla gofretimi paylaşırdım.', photo: 'test-selfie', currentAge: 80 };
  const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'samples', 'podcast', 'radio-memory.json'), 'utf8'));
  const mp3 = fs.readFileSync(path.join(__dirname, 'samples', 'podcast', 'radio-memory.mp3'));
  const config = { ai: { endpoint: 'https://test.services.ai.azure.com', apiKey: 'test-placeholder', labDeployment: 'gpt-test', speechVoice: podcastVoice } };
  const context = vm.createContext({
    URL: class extends URL {}, AbortController, AbortSignal, Blob, Uint8Array, atob,
    CONFIG: config, API: { live: true }, SCREENS: {}, STATE: { podcast: {} },
    PodcastMusic: { load: async (_era, signal) => { signal?.throwIfAborted(); return new ArrayBuffer(44); }, decade: era => Math.floor(era.start / 10) * 10 },
    PodcastVideo: {
      format() { return 'video/mp4'; },
      prepare() { const session = { ready: Promise.resolve(), disposed: false, async dispose() { this.disposed = true; } }; sessions.push(session); return session; },
      async render(options) { calls.push(['video', options]); options.signal?.throwIfAborted(); return { video: new Blob(['test movie'], { type: 'video/mp4' }), videoPoster: 'radio-poster', sceneStartTimes: [0, 1, 2], videoDuration: 3 }; },
      async validate(blob) { return blob; },
    },
    PRODUCTS: [{ id: 'gofret', name: 'Çikolatalı Gofret', ingredientEn: 'chocolate' }],
    byId: (items, id) => items.find(item => item.id === id),
    icon: () => '', keyboardHTML: () => '',
    FoundrySettings: { voice: value => { if (!/^[a-z0-9:._-]{1,120}$/i.test(value)) throw new Error('Invalid voice'); return value; } },
    esc: value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
    FileReader: class {
      readAsDataURL(blob) {
        blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`; this.onload(); }).catch(error => { this.error = error; this.onerror(); });
      }
    },
    MAI: {
      request: async (...args) => { calls.push(['research', ...args]); return { ok: true, json: async () => args[1].text ? verifiedPodcastResponse() : groundedPodcastResponse() }; },
      generate: async (...args) => { calls.push(['image', ...args]); return 'generated-image'; },
      edit: async (...args) => { calls.push(['edit', ...args]); return 'generated-image'; },
    },
    Chat: { json: async (...args) => {
      if (args[3]?.json_schema?.name === 'podcast_age') { calls.push(['age', ...args]); return { hasSingleFace: true, estimatedAge: 80 }; }
      calls.push(['story', ...args]); return { title: 'Paylaşılan mutluluk', contextLead: 'serin bir okul çıkışında gazeteler usulca hışırdıyor',
        memorySentence: 'Kahramanımız okul kapısında en yakın arkadaşlarını beklerken çantasından gofretini çıkarmış, çıtır katmanları özenle bölerek herkese küçük bir pay uzatmış ve birlikte geçirilen bu sıradan molanın sıcaklığını yıllar sonra bile hatırlamıştı.',
        endingSentence: 'Arkadaşlarıyla aynı okul kapısından ağır ağır uzaklaşırken avucunda kalan kırıntılara gülümseyen kahramanımız, paylaşmanın küçücük bir gofreti nasıl kocaman bir hatıraya dönüştürdüğünü o an anlamıştı.',
        memoryVisual: 'Schoolyard scene with the younger selfie person.', endingVisual: 'Same person, clothes and schoolyard, continuing the scene.' };
    } },
    createCameraScreen: () => ({}), resizeDataUrl: async () => 'prepared-selfie', dataUrlToBlob: data => new Blob([data], { type: 'image/jpeg' }), loadImage: async () => ({ width: 896, height: 1120 }),
    composePhoto: async image => { calls.push(['compose', image]); return 'composed-image'; },
    fetch: async (...args) => { calls.push(['speech', ...args]); return new Response(mp3, { headers: { 'content-type': 'audio/mpeg' } }); },
    sampleFor: () => ({ prompt: 'sample.json', video: 'sample.mp4', poster: 'radio-poster.png' }),
    SavedSamples: { response: async (_path, signal) => { signal?.throwIfAborted(); return { json: async () => sample, blob: async () => new Blob([Buffer.alloc(128)], { type: _path.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4' }) }; }, image: async () => 'saved-image' },
    ...overrides,
  });
  vm.runInContext(podcastSource, context);
  context.podcastComposeFrame = async raw => { calls.push(['compose', raw]); return 'composed-image'; };
  return { context, calls, stages, sessions, input, config, sample, mp3 };
}

test('podcast validates all periods, calendar dates, Other and a single bounded memory', () => {
  const { context, input } = podcastHarness();
  assert.match(context.SCREENS['podcast.product'].render(), /data-product="gofret"/);
  assert.match(context.SCREENS['podcast.other'].render(), /data-go="podcast.moment"/);
  for (const id of ['1960', '1970', '1980', '1990', '2000']) assert.equal(context.validatePodcastInput({ ...input, era: { id } }).era.start, Number(id));
  assert.equal(context.podcastDate('29.02.2004').start, 2004);
  assert.equal(context.podcastDate('23/04/2004').name, '23/04/2004');
  for (const date of ['1943', '2999', '29.02.2003', '31.04.2004', '1.1.2004', '2004-04-23']) assert.throws(() => context.podcastDate(date));
  for (const id of ['school', 'family', 'work', 'travel']) assert.equal(context.validatePodcastInput({ ...input, moment: { id } }).moment.id, id);
  assert.equal(context.validatePodcastInput({ ...input, moment: { id: 'other', name: 'Yaz tatili' } }).moment.name, 'Yaz tatili');
  for (const memory of ['', 'a'.repeat(241), 'Bir anı. İkinci anı.', 'İlk satır\nİkinci satır']) assert.throws(() => context.validatePodcastInput({ ...input, memory }));
  assert.throws(() => context.validatePodcastInput({ ...input, moment: { id: 'other', name: 'a'.repeat(81) } }));
  assert.throws(() => context.validatePodcastInput({ ...input, product: { id: 'unknown' } }));
});

test('both new nostalgia products enter the shared story and illustration generation', async () => {
  for (const [id, name] of [['hanimeller', 'Hanımeller'], ['cokoprens', 'Çokoprens']]) {
    const { context, input, calls } = podcastHarness();
    await context.API.podcast.generate({ ...input, product: { id } });
    const story = calls.find(call => call[0] === 'story');
    assert.equal(JSON.parse(story[2]).product.name, name);
    assert.ok(calls.find(call => call[0] === 'image')[1].includes(name));
    assert.match(context.SCREENS['podcast.product'].render(), new RegExp(`data-product="${id}"`));
  }
});

test('podcast privately projects approximate age onto the selected era with a minimum of ten', () => {
  const { context, input } = podcastHarness();
  const age = context.podcastAge({ start: 1960, end: 1969 }, 80);
  assert.equal(age.birthYear, 1946); assert.equal(age.year, 1964); assert.equal(age.age, 18);
  assert.equal(age.min, 14); assert.equal(age.max, 23);
  const overlap = context.podcastAge({ start: 2000, end: 2009 }, 22);
  assert.equal(overlap.year, 2004); assert.equal(overlap.min, 10); assert.equal(overlap.max, 10);
  assert.equal(context.podcastAge({ start: 2004, end: 2004 }, 22).age, 10);
  assert.equal(context.podcastAge({ start: 1960, end: 1969 }, 40).age, 10);
  for (const invalid of [0, 111, 2.5, '40', NaN]) assert.throws(() => context.podcastAge({ start: 2004, end: 2004 }, invalid));
  assert.throws(() => context.validatePodcastInput({ ...input, photo: '' }), /selfie/);
});

test('selfie analysis uses vision and rejects unclear faces, invalid ages, cancellation and unsupported recording', async () => {
  const { context, calls, input } = podcastHarness();
  assert.equal(await context.API.podcast.estimateAge(input.photo), 80);
  assert.equal(calls[0][2][1].image_url.url, 'prepared-selfie');
  assert.equal(calls[0][4].json_schema.name, 'podcast_age');
  let resized;
  context.loadImage = async () => ({ width: 2000, height: 1000 });
  context.resizeDataUrl = async (_photo, width, height) => { resized = [width, height]; return 'prepared-selfie'; };
  await context.API.podcast.estimateAge(input.photo);
  assert.deepEqual(resized, [768, 384], 'Vision must see the entire photo, not crop other faces out');
  for (const result of [{ hasSingleFace: false, estimatedAge: 80 }, { hasSingleFace: true, estimatedAge: 0 }, { hasSingleFace: true, estimatedAge: '40' }]) {
    context.Chat.json = async () => result;
    await assert.rejects(context.API.podcast.estimateAge(input.photo), /Tek ve net/);
  }
  const controller = new AbortController();
  context.Chat.json = async () => { controller.abort(new Error('Stopped')); return { hasSingleFace: true, estimatedAge: 80 }; };
  await assert.rejects(context.API.podcast.estimateAge(input.photo, controller.signal), /Stopped/);
  context.PodcastVideo.format = () => { throw new Error('Unsupported recording'); };
  await assert.rejects(context.API.podcast.estimateAge(input.photo), /Unsupported recording/);
});

test('a late selfie estimate cannot repopulate a closed or retaken kiosk screen', async () => {
  const { context } = podcastHarness();
  let resolve;
  const waiting = new Promise(done => { resolve = done; }), cleanups = [];
  context.STATE.podcast = { photo: 'old-photo', era: { start: 2004, end: 2004 }, estimatedAge: null };
  context.API.podcast.estimateAge = () => waiting;
  const control = () => ({ addEventListener() {}, disabled: true, value: '', textContent: '' });
  const nodes = { '.podcast-prep': control(), '.podcast-age-error': control() };
  context.$ = selector => nodes[selector];
  const ctx = { alive: true, cleanup: action => cleanups.push(action) };
  context.SCREENS['podcast.age'].mount(control(), ctx);
  ctx.alive = false; cleanups.forEach(action => action());
  context.STATE.podcast.photo = 'new-photo';
  resolve(80);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(context.STATE.podcast.estimatedAge, null);
  assert.equal(context.STATE.podcast.photo, 'new-photo');
});

test('radio theater requires three long sentences, preserves the exact date and rejects short or multi-sentence copy', async () => {
  const { context, input } = podcastHarness();
  const copy = await context.Chat.json('', '');
  const facts = [{ text: '2004 yılında bir kültür etkinliği düzenlendi.' }, { text: '2004 yılında bir bilim etkinliği duyuruldu.' }];
  const values = context.validatePodcastInput({ ...input, era: { id: 'custom', name: '23.04.2004' } });
  const theater = context.podcastTheater(copy, facts, values);
  assert.equal(theater.scenes.length, 3);
  assert.match(theater.scenes[0].text, /23 Nisan 2004/);
  assert.equal(theater.narration, theater.scenes.map(scene => scene.text).join(' '));
  assert.throws(() => context.podcastTheater({ ...copy, endingSentence: 'Kısa bir anıydı.' }, facts, values), /20 kelimelik/);
  assert.throws(() => context.podcastTheater({ ...copy, memorySentence: copy.memorySentence + ' Sonra eve gitti.' }, facts, values), /tek uzun cümle/);
});

test('verified agenda dates must be real calendar dates and not later than an exact memory date', () => {
  const { context } = podcastHarness();
  const response = verifiedPodcastResponse(), record = JSON.parse(response.output[1].content[0].text);
  const verify = () => { response.output[1].content[0].text = JSON.stringify(record); return context.podcastVerifiedFacts(response, { start: 2004, end: 2004 }, '2004-02-29'); };
  record.facts[0].date = '2004-01-23'; record.facts[1].date = '2004-02-29';
  assert.equal(verify().length, 2);
  record.facts[1].date = '2004-02-30'; assert.throws(verify, /tarihi geçersiz/);
  record.facts[1].date = '2004-03-01'; assert.throws(verify, /anının tarihinden önce/);
  record.facts[1].date = null; assert.throws(verify, /anının tarihinden önce/);
});

test('podcast requires completed research, two cited facts and safe, bounded citations', () => {
  const { context } = podcastHarness();
  assert.equal(context.podcastFacts(groundedPodcastResponse()).length, 2);
  for (const broken of [{ status: 'incomplete' }, { status: 'completed', output: {} }, { status: 'completed', output: [] }]) assert.throws(() => context.podcastFacts(broken));
  for (const mutation of [
    part => { part.annotations.length = 1; },
    part => { part.annotations[0].url = 'javascript:alert(1)'; },
    part => { part.annotations[0].url = 'https://user:password@example.test'; },
    part => { part.annotations[0].start_index = -1; },
    part => { part.annotations[0].end_index = part.text.length + 1; },
  ]) {
    const response = groundedPodcastResponse();
    mutation(response.output[1].content[0]);
    assert.throws(() => context.podcastFacts(response));
  }
});

test('podcast verifies public sources before fiction, image and same-endpoint Speech with a snapshot voice', async () => {
  const { context, input, calls, config } = podcastHarness();
  const stages = [];
  const result = await context.API.podcast.generate(input, { onStage: index => { stages.push(index); if (index === 2) config.ai.speechVoice = 'en-US-AvaMultilingualNeural'; } });
  assert.deepEqual(stages, [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(calls.map(call => call[0]), ['research', 'research', 'story', 'image', 'compose', 'edit', 'compose', 'edit', 'compose', 'speech', 'speech', 'speech', 'video']);
  for (const call of calls.filter(call => call[0] === 'research')) {
    assert.equal(call[1], 'responses');
    assert.equal(call[2].store, false);
    assert.equal(call[2].tools[0].type, 'web_search');
    assert.ok(!JSON.stringify(call[2]).includes(input.memory), 'Personal memory must not be sent to public web research');
  }
  const speech = calls.find(call => call[0] === 'speech');
  assert.equal(speech[1], `${config.ai.endpoint}/tts/cognitiveservices/v1`);
  assert.equal(speech[2].headers['Ocp-Apim-Subscription-Key'], config.ai.apiKey);
  assert.match(speech[2].body, /xml:lang="tr-TR"/);
  assert.ok(speech[2].body.includes(podcastVoice));
  assert.equal(result.voice, podcastVoice);
  assert.equal(result.image, 'composed-image');
  assert.match(result.scenes[0].text, /^Takvimler 2004/);
  assert.equal(result.scenes.length, 3);
  assert.deepEqual(Array.from(result.scenes, scene => scene.kind), ['context', 'memory', 'ending']);
  assert.equal(result.narration, result.scenes.map(scene => scene.text).join(' '));
  const edits = calls.filter(call => call[0] === 'edit');
  assert.equal(edits[0][2].length, 1);
  assert.equal(edits[1][2].length, 2);
  assert.equal(await edits[1][2][1].text(), 'generated-image');
  assert.equal(result.video.type, 'video/mp4');
  assert.equal(calls.filter(call => call[0] === 'speech').every(call => call[2].body.includes(podcastVoice)), true);
});

test('podcast stops before fiction and images when research or source verification fails', async () => {
  for (const failureAt of [0, 1]) {
    const harness = podcastHarness();
    let count = 0;
    harness.context.MAI.request = async (_path, body) => ({ ok: true, json: async () => count++ === failureAt ? { status: 'completed', output: [] } : body.text ? verifiedPodcastResponse() : groundedPodcastResponse() });
    await assert.rejects(harness.context.API.podcast.generate(harness.input), /WebIQ/);
    assert.equal(harness.calls.length, 0);
  }
  const harness = podcastHarness();
  harness.context.Chat.json = async () => ({ title: 'a'.repeat(81), scene: 'Anı', visualDirection: 'Art' });
  await assert.rejects(harness.context.API.podcast.generate(harness.input), /Başlık/);
  assert.deepEqual(harness.calls.map(call => call[0]), ['research', 'research']);
});

test('podcast rejects unverified findings, out-of-period dates and URLs absent from actual search sources', () => {
  const { context } = podcastHarness();
  for (const mutation of [
    record => { record.verified = false; },
    record => { record.facts[0].year = 1927; },
    record => { record.facts[0].url = 'https://invented.test/archive'; },
    record => { record.facts[0].evidence = ''; },
  ]) {
    const response = verifiedPodcastResponse(), part = response.output[1].content[0];
    const record = JSON.parse(part.text);
    mutation(record);
    part.text = JSON.stringify(record);
    assert.throws(() => context.podcastVerifiedFacts(response, { start: 2004, end: 2004 }));
  }
});

test('podcast Speech escapes SSML and surfaces service and malformed-audio errors', async () => {
  const { context, calls } = podcastHarness();
  await context.podcastAudio('<anı & "dün">');
  assert.match(calls[0][2].body, /&lt;anı &amp; &quot;dün&quot;&gt;/);
  context.fetch = async () => new Response('Denied', { status: 403 });
  await assert.rejects(context.podcastAudio('Anı'), /HTTP 403/);
  context.fetch = async () => new Response('Not audio', { headers: { 'content-type': 'audio/mpeg' } });
  await assert.rejects(context.podcastAudio('Anı'), /MP3/);
  context.fetch = async () => { throw new Error('Network failure'); };
  await assert.rejects(context.podcastAudio('Anı'), /Ses servisine bağlanılamadı/);
});

test('podcast cancellation at every stage prevents later requests and successful results', async () => {
  for (const cancelAt of [0, 1, 2, 3, 4, 5, 6]) {
    const { context, input, calls, sessions } = podcastHarness();
    const controller = new AbortController();
    await assert.rejects(context.API.podcast.generate(input, { signal: controller.signal, onStage: index => { if (index === cancelAt) controller.abort(); } }), /abort/i);
    assert.equal(calls.filter(call => call[0] === 'speech').length, cancelAt === 6 ? 3 : 0);
    if (cancelAt <= 2) assert.equal(calls.filter(call => call[0] === 'image').length, 0);
    assert.equal(sessions.every(session => session.disposed), true);
  }
});

test('podcast Demo reads the saved video, rejects malformed metadata and honors cancellation', async () => {
  const { context, input, calls, sample } = podcastHarness();
  const copy = await context.Chat.json('', '');
  const theater = context.podcastTheater(copy, sample.facts, context.validatePodcastInput(input));
  Object.assign(sample, { format: 'radio-theater-v1', narration: theater.narration, scene: theater.scenes.slice(1).map(scene => scene.text).join(' '),
    scenes: theater.scenes.map((scene, index) => ({ ...scene, image: `samples/podcast/${['radio-context', 'radio-memory', 'radio-ending'][index]}.jpg` })) });
  calls.length = 0;
  context.API.live = false;
  const result = await context.API.podcast.generate(input);
  assert.equal(result.demo, true);
  assert.equal(result.image, 'saved-image');
  assert.equal(result.narration, sample.narration);
  assert.equal(calls.length, 0);
  sample.facts[0].url = 'javascript:bad';
  await assert.rejects(context.API.podcast.generate(input), /kaynak/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(context.API.podcast.generate(input, { signal: controller.signal }), /abort/i);
});

test('legacy Demo is explicitly unavailable rather than passed off as a new selfie theater', async () => {
  const { context, sample, input } = podcastHarness();
  context.API.live = false; delete sample.format;
  await assert.rejects(context.API.podcast.estimateAge(input.photo), /henüz hazır değil/);
  await assert.rejects(context.API.podcast.sample(), /üç sahne/);
});

test('image policy refusal remains an explicit failure, not a replacement image', async () => {
  const response = new Response(JSON.stringify({ error: { code: 'content_safety_violation', message: 'Output content violated safety policies.' } }), { status: 400, headers: { 'content-type': 'application/json' } });
  const context = vm.createContext({ response });
  vm.runInContext(sourceBetween('const MAI =', 'const Chat ='), context);
  await assert.rejects(vm.runInContext('MAI.parse(response)', context), /content_safety_violation/);
});

test('saving narrator voice preserves shared credentials and rejects invalid names and storage failures', () => {
  const saved = { endpoint: 'https://test.services.ai.azure.com', key: 'test-placeholder', imageModel: 'image', labModel: 'text' };
  let record = JSON.stringify(saved);
  const config = { ai: { speechVoice: podcastVoice } };
  const storage = { getItem: () => record, setItem: (_key, value) => { record = value; } };
  const context = vm.createContext({ CONFIG: config, localStorage: storage });
  vm.runInContext(sourceBetween('const FoundrySettings =', 'function boot()') + '\nglobalThis.foundry = FoundrySettings;', context);
  context.foundry.saveVoice('en-US-AvaMultilingualNeural');
  assert.deepEqual(JSON.parse(record), { ...saved, voice: 'en-US-AvaMultilingualNeural' });
  assert.equal(config.ai.speechVoice, 'en-US-AvaMultilingualNeural');
  assert.throws(() => context.foundry.saveVoice('<voice>'), /Speech/);
  storage.setItem = () => { throw new Error('Storage full'); };
  assert.throws(() => context.foundry.saveVoice(podcastVoice));
  assert.equal(config.ai.speechVoice, 'en-US-AvaMultilingualNeural');
});

test('podcast video players use managed media URLs and release them exactly once when the view closes', () => {
  const { context } = podcastHarness();
  let paused = 0, loaded = 0, removed = 0, disposed;
  const revoked = [];
  context.URL.createObjectURL = blob => { assert.equal(blob.type, 'video/mp4'); return 'blob:test-podcast'; };
  context.URL.revokeObjectURL = url => revoked.push(url);
  const audio = { addEventListener() {}, removeEventListener() {}, pause() { paused++; }, load() { loaded++; }, removeAttribute() { removed++; } };
  const root = { querySelector: selector => selector === 'video' ? audio : null };
  context.mountPodcastMedia(root, { cleanup: fn => { disposed = fn; } }, { video: new Blob(['movie'], { type: 'video/mp4' }) });
  assert.equal(audio.src, 'blob:test-podcast');
  disposed(); disposed();
  assert.deepEqual(revoked, ['blob:test-podcast']);
  assert.deepEqual([paused, loaded, removed], [1, 1, 1]);
});

test('classic Laboratory still renders selected ingredients, moments and generation after replacing the third experience', () => {
  const context = vm.createContext({
    SCREENS: {}, API: { live: false }, tipsFor: () => [],
    STATE: { lab: { baseId: 'base', flavorIds: ['flavor'], momentId: 'moment' } },
    LAB_BASES: [{ id: 'base', name: 'Selected base' }], LAB_FLAVORS: [{ id: 'flavor', name: 'Selected flavor' }], LAB_MOMENTS: [{ id: 'moment', name: 'Moment', story: 'Story', icon: 'flask' }],
    byId: (items, id) => items.find(item => item.id === id), esc: value => value, icon: () => '',
    genViewHTML: ({ stages }) => { assert.ok(stages.length > 0); return 'generation-screen'; },
  });
  vm.runInContext(sourceBetween('const labStages =', "SCREENS['lab.result']"), context);
  assert.match(context.SCREENS['lab.moment'].render(), /Selected base/);
  assert.match(context.SCREENS['lab.moment'].render(), /Selected flavor/);
  assert.match(context.SCREENS['lab.moment'].render(), /data-moment="moment"/);
  assert.equal(context.SCREENS['lab.gen'].render({}), 'generation-screen');
});

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
      setAttribute(name, value) { this[name] = value; },
      focus() {}, showModal() { this.open = true; }, close() { this.open = false; },
    });
    return nodes.get(selector);
  };
  const form = element('#connection-form');
  form.elements = Object.fromEntries(['endpoint', 'key', 'imageModel', 'labModel', 'voice'].map(name => [name, element(name)]));
  form.reset = () => Object.values(form.elements).forEach(field => { field.value = ''; });
  const config = { ai: { mode: 'mock', speechVoice: podcastVoice } }, stored = new Map(), transitions = [], launches = [], session = new Map();
  let blockSession = false;
  const context = vm.createContext({
    CONFIG: config, $: element, icon: () => '',
    document: { documentElement: { setAttribute() {} } },
    location: { protocol: 'https:', hostname: 'example.test', assign: url => launches.push(url) },
    sessionStorage: { setItem(key, value) { if (blockSession) throw new Error('Storage blocked'); session.set(key, value); } },
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    FormData: class { constructor(form) { this.form = form; } get(name) { return this.form.elements[name].value; } },
  });
  vm.runInContext(sourceBetween('const BlobShare =', 'function boot()'), context);
  const reopen = context.chooseConnection(() => transitions.push(config.ai.mode));
  assert.equal((await element('#connection-dialog').dispatch('cancel')).prevented, true);
  element('#connection-demo').checked = true;
  await element('#connection-demo').dispatch('change');
  assert.equal(element('#connection-dialog').open, true);
  await element('#connection-continue').dispatch('click');
  for (let i = 0; i < 2; i++) {
    reopen();
    element('#connection-demo').checked = false;
    await element('#connection-demo').dispatch('change');
    assert.equal(form.hidden, false);
    assert.equal(config.ai.mode, 'mock');
    await element('#connection-continue').dispatch('click');
    Object.entries({
      endpoint: 'https://test-resource.services.ai.azure.com',
      key: 'test-placeholder', imageModel: 'test-image', labModel: 'test-text', voice: 'en-US-Harper:MAI-Voice-2-Flash',
    }).forEach(([name, value]) => { form.elements[name].value = value; });
    await form.dispatch('submit');
    assert.equal(config.ai.mode, 'live');
    reopen();
    assert.equal((await element('#connection-dialog').dispatch('cancel')).prevented, false);
    element('#connection-dialog').close();
    assert.equal(config.ai.mode, 'live');
    reopen();
    element('#connection-demo').checked = true;
    await element('#connection-demo').dispatch('change');
    assert.equal(config.ai.mode, 'live');
    await element('#connection-continue').dispatch('click');
    assert.equal(config.ai.mode, 'mock');
    assert.equal(element('#connection-dialog').open, false);
  }
  assert.deepEqual(transitions, ['mock', 'live', 'mock', 'live', 'mock']);
  assert.equal(form.listeners.get('submit').length, 1);
  assert.equal(element('#connection-demo').listeners.get('change').length, 1);
  reopen();
  await element('#connection-chat').dispatch('click');
  blockSession = true;
  await element('#connection-continue').dispatch('click');
  assert.equal(element('#connection-dialog').open, true);
  assert.equal(element('#connection-error').hidden, false);
  assert.equal(launches.length, 0);
  blockSession = false;
  await element('#connection-continue').dispatch('click');
  assert.deepEqual(launches, ['copilot/?ui=chat']);
  assert.deepEqual(JSON.parse(session.get('mai-kiosk-launch')), { mode: 'mock' });
  assert.deepEqual(transitions, ['mock', 'live', 'mock', 'live', 'mock'], 'Copilot navigation does not also start the classic kiosk');
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
  assert.ok(labels.every(label => label.textContent === '' && label.hidden));
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

test('photo prompts preserve the holding-and-pointing pose across styles and variations', () => {
  const context = vm.createContext({ CONFIG: { event: { productBrand: 'Brand' } } });
  vm.runInContext(sourceBetween('function buildPhotoPrompt(', 'async function packagingLogoReference('), context);
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
  vm.runInContext(sourceBetween('async function renderPhotoMock(', '/* ---------- Lezzet laboratuvarı ambalajı'), context);
  await context.renderPhotoMock({ photo: 'reference', product: { id: 'snack' }, theme: { id: 'snowglobe' } });
  await context.composePhoto('generated');
  assert.equal(bands.length, 2);
  for (const options of bands) {
    assert.equal(options.pack, undefined);
    assert.equal(options.title, undefined);
    assert.equal(options.sub, undefined);
  }
});

test('Demo camera uses samples/reference.jpg without requesting webcam access, including retakes', () => {
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
  vm.runInContext(sourceBetween("function createCameraScreen(", "SCREENS['photo.gen'] ="), context);
  context.SCREENS['photo.camera'].mount(el, { alive: true, cleanup() {} });
  assert.equal(context.STATE.photo.photo, 'samples/reference.jpg');
  assert.equal(elements['.cam-shot'].src, 'samples/reference.jpg');
  assert.equal(el.dataset.state, 'review');
  click({ target: { closest: () => ({ dataset: { act: 'retake' } }) } });
  assert.equal(context.STATE.photo.photo, 'samples/reference.jpg');
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
  vm.runInContext(sourceBetween("function createCameraScreen(", "SCREENS['photo.gen'] ="), context);
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
    renderPackaging: () => assert.fail('Demo must not draw a synthetic package'),
  });
  vm.runInContext(sampleSource, context);
  vm.runInContext(sourceBetween('const LAB_COPY_LIMITS =', '/* ---------- Mock üreticiler'), context);
  vm.runInContext(sourceBetween('const SavedSamples =', 'function shareUrlFor(') + '\nglobalThis.api = API;', context);
  for (const id of ['snowglobe', 'adface', 'blocky', 'factory', 'space', 'popart']) {
    assert.equal(await context.api.photo.generate({ photo: 'other input', product: {}, theme: { id }, variation: 3 }, { fast: true }), `saved:samples/photo-${id}.jpg`);
  }
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
});

function blobShareHarness() {
  let now = Date.now();
  const calls = [];
  const context = vm.createContext({
    URL, Blob, Uint8Array, atob, AbortSignal,
    Date: class extends Date { static now() { return now; } },
    crypto: require('node:crypto').webcrypto,
    fetch: async (url, options) => { calls.push({ url, options }); return new Response('', { status: 201 }); },
  });
  vm.runInContext(sourceBetween('function dataUrlToBlob(', 'function makeCanvas('), context);
  vm.runInContext(sourceBetween('const BlobShare =', 'const FoundrySettings =') + '\nglobalThis.share = BlobShare;', context);
  const url = new URL('https://kioskupload.blob.core.windows.net/kiosk-results');
  url.search = new URLSearchParams({ sv: '2023-11-03', sr: 'c', sp: 'rc', spr: 'https', se: new Date(now + 3600000).toISOString(), sig: 'unit-test-placeholder' }).toString();
  return { context, calls, sas: url.href, expire: () => { now += 3600001; } };
}

test('Azure single SAS upload uses GUID names, correct image bytes and the same token in the download link', async () => {
  const { context, calls, sas } = blobShareHarness();
  const form = { elements: { blobSas: { value: sas } } };
  context.share.settings = context.share.readForm(form);
  for (const [mime, extension] of [['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/webp', 'webp']]) {
    const result = await context.share.publish(`data:${mime};base64,aW1hZ2U=`);
    const call = calls.at(-1);
    assert.match(new URL(call.url).pathname, new RegExp(`^/kiosk-results/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.${extension}$`));
    assert.equal(call.url, result.url);
    assert.equal(new URL(result.url).search, new URL(sas).search);
    assert.equal(call.options.method, 'PUT');
    assert.equal(call.options.headers['x-ms-blob-type'], 'BlockBlob');
    assert.equal(call.options.headers['If-None-Match'], '*');
    assert.equal(call.options.headers['x-ms-blob-cache-control'], 'private, no-store');
    assert.equal(call.options.credentials, 'omit');
    assert.equal(call.options.referrerPolicy, 'no-referrer');
    assert.equal(call.options.headers['Content-Type'], mime);
    assert.equal(await call.options.body.text(), 'image');
    assert.equal(result.expires, new URL(sas).searchParams.get('se'));
  }
  assert.equal(new Set(calls.map(call => call.url)).size, 3);
  form.elements.blobSas.value = '';
  assert.equal(context.share.readForm(form), null);
  form.elements.blobSas.value = 'must not persist';
  context.share.fill(form);
  assert.equal(form.elements.blobSas.value, sas);
});

test('Azure rejects invalid or expired SAS and surfaces HTTP and network upload failures without leaking the token', async () => {
  const { context, calls, sas, expire } = blobShareHarness();
  for (const edit of [
    url => { url.protocol = 'http:'; },
    url => { url.hostname = 'untrusted.example'; },
    url => { url.pathname += '/file.jpg'; },
    url => { url.searchParams.set('sp', 'r'); },
    url => { url.searchParams.set('sp', 'rcwdl'); },
    url => { url.searchParams.set('sr', 'b'); },
    url => { url.searchParams.set('spr', 'https,http'); },
    url => { url.searchParams.set('srt', 'o'); },
    url => { url.searchParams.set('si', 'stored-policy'); },
    url => { url.searchParams.delete('sig'); },
    url => { url.searchParams.append('sp', 'rc'); },
    url => { url.searchParams.set('se', 'invalid'); },
    url => { url.searchParams.set('st', new Date(Date.now() + 86400000).toISOString()); },
  ]) {
    const url = new URL(sas);
    edit(url);
    assert.throws(() => context.share.readForm({ elements: { blobSas: { value: url.href } } }));
  }
  context.share.settings = { sas };
  await assert.rejects(context.share.publish('data:text/html;base64,aW1hZ2U='), /PNG, JPEG/);
  await assert.rejects(context.share.publish('data:image/png;base64,'), /boş/);
  assert.equal(calls.length, 0);
  context.fetch = async () => new Response('', { status: 403 });
  await assert.rejects(context.share.publish('data:image/png;base64,aW1hZ2U='), /HTTP 403/);
  context.fetch = async () => { throw new Error(sas); };
  await assert.rejects(context.share.publish('data:image/png;base64,aW1hZ2U='), error => /CORS/.test(error.message) && !error.message.includes('unit-test-placeholder'));
  expire();
  await assert.rejects(context.share.publish('data:image/png;base64,aW1hZ2U='), /süresi dolmuş/);
});

test('Demo sharing uses static repository files and Live without SAS never fabricates a download URL', async () => {
  const context = vm.createContext({
    URL, document: { baseURI: 'https://example.test/mai-kiosk/' },
    CONFIG: { ai: { mode: 'mock' } },
    BlobShare: { enabled: false },
  });
  vm.runInContext(sampleSource, context);
  vm.runInContext(sourceBetween('const SavedSamples =', 'function shareUrlFor(') + '\nglobalThis.api = API;', context);
  for (const theme of ['snowglobe', 'popart']) {
    const result = await context.api.share.publish('photo', '', { theme });
    assert.equal(result.url, `https://example.test/mai-kiosk/samples/photo-${theme}.jpg`);
    assert.equal(result.demo, true);
  }
  assert.equal((await context.api.share.publish('lab', '')).url, 'https://example.test/mai-kiosk/samples/reference-photo/pack-cake.jpg');
  assert.equal((await context.api.share.publish('podcast', '')).url, 'https://example.test/mai-kiosk/samples/podcast/radio-memory.mp4');
  context.CONFIG.ai.mode = 'live';
  await assert.rejects(context.api.share.publish('photo', ''), /Azure SAS/);
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
      assert.match(request.body.response_format.json_schema.schema.properties.name.description, /one short word/);
      assert.match(request.body.response_format.json_schema.schema.properties.slogan.description, /never more than three/);
    } else {
      assert.equal(request.api, 'mai/v1');
      assert.equal(request.body.response_format, undefined);
    }
  }
});

test('Lab copy validates character and word limits instead of truncating or using mock text', async () => {
  const good = { name: 'Fıstıra', slogan: 'Molana çıtır ışıltı.', story: 'Fıstık ve karamel, çıtır gofrette buluşur.', visualDirection: 'Green and gold packaging on a warm neutral podium.' };
  let response = good, calls = 0, instructions, choices;
  const context = vm.createContext({
    CONFIG: { ai: { labDeployment: 'gpt-5.4-mini' }, event: { productBrand: 'Brand' } },
    Chat: { json: async (system, input) => { calls++; instructions = system; choices = JSON.parse(input); return response; } },
    mockConcept: () => ({ name: 'mock-name', slogan: 'mock-slogan', baseEn: 'wafer', flavorEn: 'pistachio' }),
  });
  vm.runInContext(sourceBetween('const LAB_COPY_LIMITS =', '/* ---------- Mock üreticiler'), context);
  const lab = sourceBetween('  lab: {\n    async concept', '  share: {');
  vm.runInContext(`globalThis.API = { get live() { return true; }, ${lab} };`, context);
  const picks = { base: { name: 'Gofret' }, flavors: [{ name: 'Antep Fıstığı' }], moment: { name: 'Mola' } };
  assert.equal((await context.API.lab.concept(picks)).name, good.name);
  assert.equal(choices.rdNote, '');
  const note = 'Ambalajda "sade" bir görünüm olsun.\nFıstık tadı öne çıksın.';
  await context.API.lab.concept({ ...picks, rdNote: `  ${note}  ` });
  assert.equal(choices.rdNote, note);
  assert.equal(choices.base, picks.base.name);
  assert.deepEqual(choices.flavors, picks.flavors.map(flavor => flavor.name));
  assert.equal(choices.moment, picks.moment.name);
  assert.match(instructions, /Ar-Ge notunu ek tasarım tercihi/);
  await context.API.lab.concept({ ...picks, rdNote: 'x'.repeat(500) });
  assert.equal(choices.rdNote.length, 500);
  const beforeInvalidNote = calls;
  await assert.rejects(context.API.lab.concept({ ...picks, rdNote: 'x'.repeat(501) }), /en fazla 500 karakter/);
  await assert.rejects(context.API.lab.concept({ ...picks, rdNote: null }), /metin olmalıdır/);
  assert.equal(calls, beforeInvalidNote);
  assert.equal(context.validateLabCopy({ ...good, name: 'x'.repeat(16) }).name.length, 16);
  assert.equal(context.validateLabCopy({ ...good, slogan: 'Çıtır mola' }).slogan, 'Çıtır mola');
  assert.equal(context.validateLabCopy({ ...good, slogan: '  Molana\tçıtır\nışıltı.  ' }).slogan, 'Molana\tçıtır\nışıltı.');
  response = { ...good, name: 'x'.repeat(17) };
  await assert.rejects(context.API.lab.concept(picks), /karakter sınırını aştı/);
  response = { ...good, name: 'Fıstık Işığı' };
  await assert.rejects(context.API.lab.concept(picks), /name alanı için kelime sınırını aştı/);
  response = { ...good, slogan: 'Molana çıtır bir ışıltı.' };
  await assert.rejects(context.API.lab.concept(picks), /slogan alanı için kelime sınırını aştı/);
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
  assert.match(edits[0].prompt, /12-15% of the package front width/);
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
  assert.ok(images[0][3] / 880 >= 0.12 && images[0][3] / 880 <= 0.15, 'Logo remains subordinate to the product name');
  assert.ok(!text.includes('ülker'));
});

test('Laboratory revisions send the existing design and logo without replacing the old concept on failures', async () => {
  const previous = JSON.parse(fs.readFileSync(path.join(__dirname, 'samples', 'reference-photo', 'pack-wafer.json'), 'utf8')).concept;
  const original = JSON.stringify(previous), previousBlob = new Blob(['previous']), logoBlob = new Blob(['logo']);
  const edits = [], textCalls = [];
  let response = { ...previous, visualDirection: 'Use a calmer background; preserve the package and ingredients.' };
  const context = vm.createContext({
    CONFIG: { ai: { endpoint: 'https://test.example' }, event: { productBrand: 'Ülker' } },
    Chat: { json: async (system, user, signal) => { textCalls.push({ system, input: JSON.parse(user), signal }); return response; } },
    resizeDataUrl: async (image, width, height) => { assert.equal(image, 'previous-image'); assert.deepEqual([width, height], [896, 1120]); return 'previous-blob'; },
    dataUrlToBlob: image => { assert.equal(image, 'previous-blob'); return previousBlob; },
    packagingLogoReference: async () => logoBlob,
    MAI: { edit: async (prompt, refs, signal) => { edits.push({ prompt, refs, signal }); return 'revised-raw'; } },
    composePack: async (image, concept) => { assert.equal(image, 'revised-raw'); assert.equal(concept.name, previous.name); return 'revised-image'; },
  });
  vm.runInContext(sourceBetween('function packLogoPrompt(', '/* ---------- Mock üreticiler'), context);
  vm.runInContext(`globalThis.API = { live: true, ${sourceBetween('  lab: {\n    async concept', '  share: {')} };`, context);
  const request = { image: 'previous-image', concept: previous, instruction: '  Arka planı sadeleştir.  ' };
  const controller = new AbortController();
  const result = await context.API.lab.revise(request, { signal: controller.signal });
  assert.equal(result.img, 'revised-image');
  assert.equal(result.concept.name, previous.name);
  assert.equal(JSON.stringify(previous), original);
  assert.deepEqual(textCalls[0].input.previousCopy, Object.fromEntries(['name', 'slogan', 'story', 'visualDirection'].map(key => [key, previous[key]])));
  assert.equal(textCalls[0].input.instruction, 'Arka planı sadeleştir.');
  assert.deepEqual(Array.from(edits[0].refs), [previousBlob, logoBlob]);
  assert.equal(edits[0].signal, controller.signal);
  assert.match(edits[0].prompt, /Reference image 1 is the user's existing snack design/);
  assert.match(edits[0].prompt, /Reference image 2 contains only the official Ülker logo/);
  assert.match(edits[0].prompt, /12-15% of the package front width/);
  for (const instruction of ['', '   ', null, 'x'.repeat(501)]) {
    await assert.rejects(context.API.lab.revise({ ...request, instruction }), /değişikliği yaz|en fazla 500/);
  }
  assert.equal(textCalls.length, 1);
  response = { ...previous, slogan: 'Bu slogan dört kelime' };
  await assert.rejects(context.API.lab.revise(request), /kelime sınırını aştı/);
  assert.equal(edits.length, 1);
  response = previous;
  await assert.rejects(context.API.lab.revise(request, { signal: controller.signal, onCopy: () => controller.abort() }), { name: 'AbortError' });
  assert.equal(edits.length, 1);
  context.API.live = false;
  await assert.rejects(context.API.lab.revise(request), /Demo Modunu kapat/);
  assert.equal(textCalls.length, 3);
  assert.equal(JSON.stringify(previous), original);
});

test('podcast recording setup rejects blocked audio or cancellation and closes its context', async () => {
  let timeout, closed = 0;
  class AudioContextStub {
    state = 'suspended';
    resume() { return new Promise(() => {}); }
    async close() { this.state = 'closed'; closed++; }
  }
  const context = vm.createContext({
    window: { AudioContext: AudioContextStub },
    HTMLCanvasElement: { prototype: { captureStream() {} } },
    MediaRecorder: { isTypeSupported: () => true },
    setTimeout(callback) { timeout = callback; return 1; },
    clearTimeout() {},
  });
  new vm.Script(fs.readFileSync(path.join(__dirname, 'podcast-video.js'), 'utf8') + '\nthis.Video = PodcastVideo;').runInContext(context);
  for (const mode of ['timeout', 'cancel']) {
    const controller = new AbortController();
    const session = context.Video.prepare(controller.signal);
    const rejected = assert.rejects(session.ready, mode === 'timeout' ? /Video sesi başlatılamadı/ : /cancelled/);
    if (mode === 'timeout') timeout();
    else controller.abort(new Error('Test setup cancelled'));
    await rejected;
    await session.dispose();
    assert.equal(session.context.state, 'closed');
  }
  assert.equal(closed, 2);
});

test('kiosk, gallery and Copilot application scripts parse', () => {
  new vm.Script(engine);
  new vm.Script(sampleSource);
  new vm.Script(fs.readFileSync(path.join(__dirname, 'podcast.js'), 'utf8'));
  new vm.Script(fs.readFileSync(path.join(__dirname, 'podcast-video.js'), 'utf8'));
  new vm.Script(fs.readFileSync(path.join(__dirname, 'podcast-music.js'), 'utf8'));
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
    setAttribute() {}
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
  nodes['#kind'].value = 'podcast';
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
