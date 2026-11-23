(() => {
  'use strict';

  const el = id => document.getElementById(id);
  const embeddedSettings = window.parent !== window && new URLSearchParams(location.search).get('settings') === 'embedded';
  const embeddedSamples = window.parent !== window && new URLSearchParams(location.search).get('samples') === 'embedded';
  const fullscreenDocument = embeddedSettings ? window.parent.document : document;
  if (embeddedSettings) document.documentElement.classList.add('settings-embedded');
  if (embeddedSamples) {
    document.documentElement.classList.add('samples-embedded');
    el('closeSamples').hidden = false;
  }
  function closeSettings(launch = false) {
    el('settings').close();
    if (embeddedSettings) window.parent.postMessage({ type: 'kiosk-settings-close', launch }, location.origin);
    else if (launch && FoundrySettings.loadInterface() === 'kiosk') location.assign(new URL('.', document.baseURI).href);
  }
  const uiError = error => ({
    'Geçerli bir Azure container SAS URL’si gir.': 'Enter a valid Azure container SAS URL.',
    'SAS URL’si HTTPS Azure Blob container adresi olmalı; dosya yolu içermemeli.': 'Use an HTTPS Azure Blob container SAS URL without a file path.',
    'HTTPS ile sınırlı, bitiş tarihi olan container SAS kullan; account SAS veya stored access policy kullanma.': 'Use an HTTPS-only container SAS with an expiry date, not an account SAS or stored access policy.',
    'SAS Read ve Create veya Write yetkili olmalı; List ve Delete ekleme.': 'The SAS needs Read and Create or Write permissions, without List or Delete.',
    'SAS süresi dolmuş veya henüz başlamamış. Geçerli bir SAS gir.': 'The SAS has expired or is not active yet. Enter a valid SAS.',
    'Geçerli bir Speech ses adı gir.': 'Enter a valid Speech voice name.',
    'Geçerli ve maskelenmemiş bir WebIQ API anahtarı gir.': 'Enter a valid, unmasked WebIQ API key.',
    'Kamera için HTTPS veya localhost üzerinden desteklenen bir tarayıcı kullan.': 'Use a supported browser over HTTPS or localhost to access the camera.',
    'Kamera isteği iptal edildi.': 'The camera request was cancelled.',
    'Kamera görüntüsü hazırlanamadı. Kamerayı tekrar aç.': 'The camera preview could not be prepared. Reopen the camera.',
  })[error.message] || error.message;
  const paths = {
    layout: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/>',
    plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8m-4-4v8"/>',
    plus: '<path d="M5 12h14m-7-7v14"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    library: '<rect x="3" y="4" width="4" height="16" rx="1"/><rect x="9" y="4" width="4" height="16" rx="1"/><path d="m15 5 4-1 4 15-4 1z"/>',
    agents: '<path d="m8 3-5 9 5 9m8-18 5 9-5 9m-2-18-4 18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-.7 2.3L6 6l-2.2-.4L2.5 8l1.6 1.8v2.5L2.5 14l1.3 2.5 2.3-.5 2.2 1.3L9 20h3l.7-2.7 2.3-1.3 2.5.5 1.5-2.5-1.8-1.7V9.8L19 8l-1.5-2.4-2.5.4-2.3-.7L12 3z" transform="translate(1 1)"/>',
    edit: '<path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M10 14l1-4 8-8 3 3-8 8z"/>',
    photo: '<path d="M3 8a2 2 0 0 1 2-2h3l2-3h4l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
    podcast: '<rect x="3" y="7" width="18" height="14" rx="3"/><circle cx="8" cy="14" r="2"/><path d="m16 7 4-5M13 11h5m-5 4h5"/>',
    lab: '<path d="M9 3h6M10 3v7L4 19a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2l-6-9V3M7 15h10"/><path d="M10 18h.01m4-1h.01"/>',
    sparkle: '<path d="M12 2c0 6 4 10 10 10-6 0-10 4-10 10 0-6-4-10-10-10 6 0 10-4 10-10Z"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    arrowUp: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    loading: '<path d="M12 4a8 8 0 1 1-8 8"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
    chat: '<path d="M21 11a8 8 0 0 1-8 8H8l-5 3v-6a8 8 0 0 1-1-4V10a7 7 0 0 1 7-7h5a7 7 0 0 1 7 7z"/>',
    file: '<path d="M5 3h9l5 5v13H5zM14 3v6h5"/>',
    grid: '<circle cx="5" cy="5" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="19" cy="5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="19" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="19" cy="19" r="1"/>',
    automation: '<path d="m7 3-4 4 4 4M3 7h12a5 5 0 0 1 5 5m-3 9 4-4-4-4m4 4H9a5 5 0 0 1-5-5"/>',
    plug: '<path d="M8 3v5m8-5v5M6 8h12v5a6 6 0 0 1-6 6v3m-6-9V8m12 5V8"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    cloud: '<path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 0 1 0 11H6Zm1 1L18 5"/>',
    filter: '<path d="M4 6h16M7 11h10m-7 5h4"/>',
    gridView: '<rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor"/>',
    listView: '<circle cx="5" cy="5" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="5" cy="19" r="1.5"/><path d="M11 5h10m-10 7h10m-10 7h10"/>',
  };
  const svg = (name, cls = '') => `<svg ${cls ? `class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = svg(node.dataset.icon); });

  const agents = [
    { id: 'photo', name: 'Fotoğraf Stüdyosu', summary: 'Discover your style and create a personalized Ülker portrait.', description: 'Nasıl bir yıldız olduğunu keşfet, temanı seç ve poz ver.', prompt: 'Bir Ülker portresi hazırlayalım' },
    { id: 'lab', name: 'Lezzet Laboratuvarı', summary: 'Invent a new snack with an original name, slogan and package.', description: 'Yeni bir Ülker lezzeti tasarla; adını, sloganını ve ambalajını oluştur.', prompt: 'Yeni bir atıştırmalık tasarlayalım' },
    { id: 'podcast', name: EXPS.podcast.name, summary: 'Turn your memory into a nostalgic, three-scene radio story.', description: EXPS.podcast.desc, prompt: 'Bir ısırıkla o yıla dönelim' },
  ];
  const agentArtwork = {
    photo: '<path class="icon-shadow" d="M6 27h20"/><path class="icon-body" d="M5 9h6l2-3h7l2 3h5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2Z"/><path class="icon-panel" d="M3 14h26v8H3Z"/><circle class="icon-body" cx="16" cy="17" r="7"/><circle class="icon-lens" cx="16" cy="17" r="4.5"/><path class="icon-shine" d="M14 15a3 3 0 0 1 3-1M6 11h3"/><circle class="icon-detail" cx="25" cy="12" r="1"/>',
    lab: '<path class="icon-shadow" d="M7 28h18"/><path class="icon-body" d="M12 5h8v3h-1v7l7 10a2 2 0 0 1-1.7 3H7.7A2 2 0 0 1 6 25l7-10V8h-1Z"/><path class="icon-liquid" d="m10 21-3 4.5a1 1 0 0 0 .8 1.5h16.4a1 1 0 0 0 .8-1.5L22 21c-4 2-8-2-12 0Z"/><path class="icon-shine" d="M15 10v6l-4 6"/><path class="icon-detail" d="M12 5h8M13 8h6"/><circle class="icon-bubble" cx="16" cy="23" r="1.2"/><circle class="icon-bubble" cx="20" cy="25" r=".7"/><circle class="icon-detail" cx="23" cy="9" r="1.2"/><path class="icon-detail" d="M8 12v4m-2-2h4"/>',
    podcast: '<path class="icon-shadow" d="M5 28h22"/><path class="icon-detail" d="m18 8 7-5"/><circle class="icon-detail" cx="25" cy="3" r=".7"/><rect class="icon-body" x="3" y="8" width="26" height="19" rx="4"/><rect class="icon-panel" x="6" y="11" width="11" height="13" rx="3"/><path class="icon-grille" d="M8 14h7M8 17h7M8 20h7"/><rect class="icon-lens" x="20" y="12" width="6" height="3" rx="1"/><path class="icon-shine" d="M21 13.5h2M6 10h8"/><circle class="icon-body" cx="23" cy="21" r="3"/><path class="icon-detail" d="m23 21 1-1"/>',
  };
  const compact = matchMedia('(max-width: 780px)');
  const threads = [];
  let thread = null, mode = new URLSearchParams(location.search).get('ui') === 'chat' ? 'chat' : 'cowork', view = 'catalog', sideOpen = !compact.matches, panelOpen = false;
  let draftPhoto = null, photoRead = 0, cameraRequest = 0, noticeTimer;
  const badge = (agent, small = false) => `<span class="agent-badge agent-${agent.id}${small ? ' small' : ''}"><svg class="agent-artwork" viewBox="0 0 32 32" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${agentArtwork[agent.id]}</svg></span>`;
  const action = (name, label, cls = 'pill') => `<button type="button" class="${cls}" data-action="${name}">${label}</button>`;
  const normalize = value => trLow(value).normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ı', 'i').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const matchOptions = (items, text) => {
    const haystack = ` ${normalize(text)} `;
    return items.filter(item => [item.id, item.name].some(value => haystack.includes(` ${normalize(value)} `)));
  };
  const add = (t, entry) => t.messages.push(entry);
  function turnStart(t) {
    return t.messages.findLast(entry => entry.type === 'user') || t.messages.find(entry => entry.type === 'answer');
  }
  const replying = t => t.messages.some(entry => entry.pending);
  function finishReplies(t) {
    clearTimeout(t.replyTimer);
    t.replyTimer = null;
    for (const entry of t.messages) { entry.pending = false; delete entry.displayText; }
  }
  function scheduleReply(t) {
    if (t.replyTimer != null) return;
    const entry = t.messages.find(message => message.pending);
    if (!entry) return;
    const characters = Array.from(entry.text);
    let end = 0;
    const reveal = () => {
      t.replyTimer = null;
      if (!threads.includes(t)) return;
      const first = end === 0;
      end = Math.min(end + 25, characters.length);
      entry.displayText = characters.slice(0, end).join('');
      entry.pending = end < characters.length;
      if (entry.pending) t.replyTimer = setTimeout(reveal, 80);
      else { delete entry.displayText; scheduleReply(t); }
      if (thread === t && view === 'chat') {
        if (first || !entry.pending) render({ answer: entry });
        else updateReplyText(t, entry);
      }
    };
    t.replyTimer = setTimeout(reveal, 1500);
  }
  const say = (t, text, extra = {}) => {
    add(t, { type: 'answer', text, ...extra, pending: true });
    scheduleReply(t);
  };
  const ask = (t, phase, text, options = [], extra = {}) => {
    t.phase = phase;
    say(t, text, { options, ...extra });
  };

  function renderCards() {
    const filter = normalize(el('catalogInput').value);
    const found = agents.filter(a => normalize(`${a.name} ${a.summary}`).includes(filter));
    el('catalogCount').textContent = found.length;
    el('cards').innerHTML = found.length ? found.map(a =>
      `<button type="button" class="agent-card" data-agent="${a.id}">${badge(a)}<span class="agent-card-body"><strong title="${esc(a.name)}">${esc(a.name)}</strong><span class="agent-card-creator">Microsoft</span><span class="agent-card-description" title="${esc(a.summary)}">${esc(a.summary)}</span></span></button>`
    ).join('') : '<p class="muted">No matching agents.</p>';
  }

  el('catalog').innerHTML = `<div class="catalog-inner">
    <h1>Agents</h1><p class="intro" lang="tr">Bir agent seç ve hemen konuşmaya başla.</p>
    <label class="catalog-search">${svg('search')}<input type="search" id="catalogInput" aria-label="Search agents" placeholder="Search agents"></label>
    <h2 class="section-title">Available (<span id="catalogCount"></span>)</h2><div class="cards" id="cards"></div>
  </div>`;
  el('catalogInput').addEventListener('input', renderCards);
  renderCards();

  let libraryTab = 'outputs', libraryView = 'grid', librarySamples = [], recentOutputs = [];
  let libraryLoading = false, libraryError = '', libraryRequest = 0;
  const libraryUrls = [], previewUrls = [];
  const releaseUrls = urls => { for (const url of urls) URL.revokeObjectURL(url); urls.length = 0; };
  const blobUrl = (blob, urls) => { const url = URL.createObjectURL(blob); urls.push(url); return url; };
  const sampleAgent = sample => byId(agents, sample.agentId || (sample.kind === 'photo' ? 'photo' : sample.kind === 'pack' ? 'lab' : 'podcast'));
  const sampleTitle = sample => [sample.title, sample.product].filter(Boolean).join(' · ');
  function renderLibrary() {
    releaseUrls(libraryUrls);
    const filter = normalize(el('libraryInput').value);
    const libraryKind = el('libraryKind').value;
    const source = libraryTab === 'outputs' ? latestSamples() : recentOutputs.map(record => ({
      title: record.agentName, product: [record.title, record.description].filter(Boolean).join(' · '),
      agentId: record.agentId, kind: record.video ? 'podcast' : record.agentId === 'lab' ? 'pack' : 'photo',
      imageBlob: record.image, videoBlob: record.video, createdAt: record.createdAt, live: record.live,
    }));
    librarySamples = source.filter(sample =>
      (libraryKind === 'all' || sample.kind === libraryKind) &&
      normalize(`${sample.title} ${sample.product}`).includes(filter));
    el('libraryCount').textContent = `${librarySamples.length} outputs`;
    el('libraryStatus').textContent = libraryError || (libraryLoading ? 'Loading recent outputs…' : '');
    el('libraryStatus').setAttribute('role', libraryError ? 'alert' : 'status');
    el('libraryGrid').classList.toggle('list-view', libraryView === 'list');
    document.querySelectorAll('[data-library-tab]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.libraryTab === libraryTab)));
    document.querySelectorAll('[data-library-view]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.libraryView === libraryView)));
    if (libraryLoading || libraryError) { el('libraryGrid').replaceChildren(); return; }
    el('libraryGrid').innerHTML = librarySamples.length ? librarySamples.map((sample, index) =>
      `<button type="button" class="sample-card" data-sample="${index}" aria-label="Open ${esc(sampleTitle(sample))}" title="${esc(sampleTitle(sample))}">
        <span class="sample-heading">${badge(sampleAgent(sample), true)}<strong>${esc(sampleTitle(sample))}</strong></span>
        <span class="sample-thumbnail"><img src="${esc(sample.imageBlob ? blobUrl(sample.imageBlob, libraryUrls) : sample.poster || `${sample.path}.jpg`)}" alt="" loading="lazy">${sample.video || sample.videoBlob ? `<span class="sample-video">${svg('podcast')} Video</span>` : ''}</span>
      </button>`).join('') : `<p class="muted">${libraryTab === 'recents' && !recentOutputs.length ? 'Your generated outputs will appear here.' : 'No matching outputs.'}</p>`;
  }
  async function loadRecents() {
    const request = ++libraryRequest;
    libraryLoading = true;
    libraryError = '';
    renderLibrary();
    try {
      const records = await OutputLibrary.list();
      if (request !== libraryRequest) return;
      recentOutputs = records;
    } catch (error) {
      if (request !== libraryRequest) return;
      console.error('Output history could not be read:', error);
      libraryError = 'Recent outputs could not be loaded. Check browser storage permissions and try again.';
    } finally {
      if (request === libraryRequest) {
        libraryLoading = false;
        if (view === 'library') renderLibrary();
      }
    }
  }
  function openLibrary() {
    clearDraft();
    view = 'library';
    panelOpen = false;
    if (compact.matches) sideOpen = false;
    renderLibrary();
    render();
    if (libraryTab === 'recents') loadRecents();
  }
  function openSample(sample) {
    if (!sample) return notice('This output is no longer available. Reopen Library.');
    releaseUrls(previewUrls);
    const poster = sample.imageBlob ? blobUrl(sample.imageBlob, previewUrls) : sample.poster || `${sample.path}.jpg`;
    const video = sample.videoBlob ? blobUrl(sample.videoBlob, previewUrls) : sample.video;
    const url = video || poster;
    const agent = sampleAgent(sample);
    el('sampleTitle').textContent = sampleTitle(sample);
    const extension = video ? (sample.videoBlob?.type.startsWith('video/webm') ? 'webm' : 'mp4') : sample.imageBlob?.type === 'image/png' ? 'png' : sample.imageBlob?.type === 'image/webp' ? 'webp' : 'jpg';
    el('sampleBody').innerHTML = `${video
      ? `<video controls playsinline preload="metadata" poster="${esc(poster)}" src="${esc(url)}"></video>`
      : `<img src="${esc(url)}" alt="${esc(sampleTitle(sample))}">`}
      <p class="muted">${esc(sample.product)}</p><p id="sampleStatus" role="status"></p>
      ${sample.createdAt ? `<p class="muted">${esc(new Date(sample.createdAt).toLocaleString('en-US'))}${sample.live ? '' : ' · Demo'}</p>` : ''}
      <div class="pills"><a class="pill" href="${esc(url)}" download="output.${extension}">${svg('download')} Download ${video ? 'video' : 'image'}</a><button type="button" class="pill" data-agent="${agent.id}">Start with this agent ${svg('arrow')}</button></div>`;
    const media = el('sampleBody').querySelector('img, video'), status = el('sampleStatus');
    media.addEventListener('error', () => {
      if (!media.isConnected) return;
      console.error('Output preview could not be loaded:', url);
      status.textContent = 'The preview could not be loaded. Refresh the page and try again.';
    }, { once: true });
    el('sampleDialog').showModal();
  }
  el('libraryInput').addEventListener('input', renderLibrary);
  el('libraryKind').addEventListener('change', renderLibrary);
  el('sampleDialog').addEventListener('close', () => {
    if (el('sampleDialog').open) return;
    el('sampleBody').querySelector('video')?.pause();
    el('sampleBody').replaceChildren();
    releaseUrls(previewUrls);
  });

  function threadRows(list) {
    return list.map(t => `<button type="button" class="nav-row" data-thread="${t.id}" ${t === thread && view === 'chat' ? 'aria-current="page"' : ''}><span class="truncate">${esc(t.title)}</span></button>`).join('');
  }

  function renderChrome() {
    const active = view === 'chat';
    el('sidebar').hidden = !sideOpen;
    el('openSidebar').hidden = sideOpen;
    el('catalog').hidden = view !== 'catalog';
    el('library').hidden = view !== 'library';
    el('conversation').hidden = !active;
    el('workspaceButton').hidden = !active;
    el('workspaceButton').setAttribute('aria-expanded', String(active && panelOpen));
    el('workspace').hidden = !(active && panelOpen);
    el('topTitle').textContent = active ? thread.title : '';
    el('modeBadge').textContent = 'Demo Mode';
    el('modeBadge').hidden = API.live;
    document.querySelectorAll('nav [data-action]').forEach(button => {
      const selected = button.dataset.action === 'agents' && view === 'catalog' || button.dataset.action === 'library' && view === 'library';
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    el('pinned').innerHTML = agents.map(a => `<button type="button" class="nav-row" data-agent="${a.id}"${active && thread.agent === a ? ' aria-current="page"' : ''}>${badge(a, true)}<span class="truncate">${a.name}</span></button>`).join('');
    el('recent').innerHTML = threadRows(threads.filter(t => t.messages.length).slice(0, 12)) || '<p class="side-empty">No chats yet</p>';
  }

  function artifactHTML(result, controls = false, revision = false) {
    return `<figure class="artifact">
      ${result.podcast ? '' : `<img src="${esc(result.image)}" alt="${esc(result.title)}">`}
      <figcaption>${result.podcast ? podcastOutputHTML(result.podcast, { showDetails: false, english: true }) : `<strong>${esc(result.title)}</strong>${result.slogan ? `<p>${esc(result.slogan)}</p>` : ''}${result.story ? `<p class="muted">${esc(result.story)}</p>` : ''}`}</figcaption>
      ${result.podcast ? '' : `<a class="artifact-action" href="${esc(result.share?.demo ? result.share.url : result.image)}" download="${result.file}">${svg('download')} Download image</a>`}
      ${result.share ? `<div class="blob-share"><div class="qr-box">${QR.svg(result.share.url, { ecl: 'M', border: 2 })}</div><a class="artifact-action" href="${esc(result.share.url)}" target="_blank" rel="noopener noreferrer">${result.share.demo ? 'Open saved demo file' : 'Open image on your phone'}</a><p class="muted">${result.share.demo ? 'Saved demo file from this repository.' : `SAS expires: ${esc(new Date(result.share.expires).toLocaleString('en-US'))}`}</p></div>` : !result.podcast && result.live && BlobShare.enabled ? `<div class="blob-share"><button type="button" class="pill" data-action="publish" data-output="${thread.messages.findIndex(m => m.result === result)}"${result.publishing ? ' disabled aria-busy="true"' : ''}>Upload &amp; Create QR</button></div>` : result.live ? '<p class="muted">No phone link was created. Download the output on this device.</p>' : ''}
      ${controls ? `<div class="pills artifact-controls">${action('change', 'Change selections')}${revision ? `<button type="button" class="pill" data-action="revise"${result.canRevise ? '' : ' disabled'}>${svg('edit')} Request revision</button>` : ''}${result.live ? action('retry', 'Retry') : ''}${result.podcast ? action('sources', `${svg('file')} Sources`) : ''}</div>${revision && !result.canRevise ? '<p class="muted">Turn off Demo Mode to request a revision.</p>' : ''}` : ''}
    </figure>`;
  }

  function timeline(job, jobIndex) {
    return `<ul class="timeline">${job.steps.map((step, i) => {
      const state = job.stepStates?.[i];
      const complete = state ? state === 'complete' : i < job.step;
      const running = job.status === 'running' && (state ? state === 'running' : i === job.step);
      const icon = complete ? 'check' : running ? 'loading' : state === 'error' ? 'close' : 'circle';
      const output = job.outputs?.[i];
      if (!output?.text && !output?.image) return `<li>${svg(icon, icon === 'loading' ? 'spinner' : '')}<div class="step-detail">${esc(step)}</div></li>`;
      return `<li>${svg(icon, icon === 'loading' ? 'spinner' : '')}<details class="step-detail" data-job-index="${jobIndex}" data-step="${i}"${job.stepExpanded?.[i] ? ' open' : ''}>
        <summary>${esc(step)}</summary><div class="step-output">${output?.text ? `<pre>${esc(output.text)}</pre>` : ''}${output?.image ? `<img src="${esc(output.image)}" alt="Step output" loading="lazy">` : ''}</div>
      </details></li>`;
    }).join('')}</ul>`;
  }
  const jobLabel = job => ({
    running: job.steps[job.step], complete: 'Completed', stopped: 'Stopped', error: 'Could not complete',
  })[job.status];

  function renderMessage(t, entry, i) {
    if (entry.pending) {
      if (t.messages.find(message => message.pending) !== entry) return '';
      return entry.displayText === undefined
        ? `<div class="answer typing-response" data-answer="${i}" data-message="${i}" role="status" aria-label="Typing…"><span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span></div>`
        : `<div class="answer streaming-answer" data-answer="${i}" data-message="${i}" aria-busy="true"><p class="answer-text">${esc(entry.displayText)}</p></div>`;
    }
    if (entry.type === 'user') return `<div class="user-turn" data-message="${i}">${esc(entry.text)}</div>`;
    if (entry.type === 'job') {
      const j = entry.job;
      return `<div class="answer"><details data-job="${i}" ${j.expanded ?? j.status !== 'complete' ? 'open' : ''}>
        <summary>${jobLabel(j)}</summary>${timeline(j, i)}</details></div>`;
    }
    const current = i === t.messages.length - 1;
    const activeResult = t.result && t.phase === 'finished' && !t.job && !replying(t) && t.messages.some(message => message.result === t.result);
    const options = current ? (entry.options || []).map((o, index) => activeResult && followups.some(item => item.id === o.id) ? '' :
      `<button type="button" class="pill choice-option${o.image ? ' product-choice' : ''}${t.agent.id === 'podcast' ? ' podcast-choice' : ''}" data-choice="${index}">${o.image ? `<span class="choice-visual"><img src="${esc(o.image)}" alt=""></span>` : ''}<span>${esc(o.name)}</span></button>`
    ).join('') : '';
    const approval = entry.approval ? `<div class="approval">
      <strong>${current ? 'Approval required' : 'Generation plan'}</strong><p>${esc(entry.approval)}</p>
      ${current ? `<div class="pills">${action('cancelPlan', 'Cancel')}${action('approve', 'Approve and start', 'primary')}</div>` : ''}
    </div>` : '';
    const controls = activeResult && entry.result === t.result;
    return `<div class="answer${options && !entry.error ? ' choice-answer' : ''}" data-answer="${i}" data-message="${i}">
      <p class="answer-text"${entry.error ? ' role="alert"' : ''}>${esc(entry.text)}</p>
      ${approval}${options ? `<div class="pills">${options}</div>` : ''}${entry.result ? artifactHTML(entry.result, controls, t.agent.id === 'lab') : ''}
    </div>`;
  }

  function renderWorkspace(t) {
    const jobs = t.messages.filter(entry => entry.type === 'job');
    const job = jobs.at(-1)?.job;
    const outputs = t.messages.filter(entry => entry.result && !entry.pending).map(entry => entry.result).reverse();
    const players = [...el('messages').querySelectorAll('.podcast-output video')];
    const videoSources = new Map(t.messages.filter(entry => entry.result?.podcast && !entry.pending).map((entry, index) => [entry.result.podcast, players[index]?.src]));
    const facts = new Map();
    for (const output of outputs) {
      for (const fact of output.podcast?.facts || []) facts.set(`${fact.url}\n${fact.text}`, fact);
    }
    el('workspaceBody').innerHTML = `${job?.status === 'running' ? `<section><h3 class="workspace-section-title">Steps <span>${job.step + 1} / ${job.steps.length}</span></h3><p>${jobLabel(job)}</p>${timeline(job, t.messages.indexOf(jobs.at(-1)))}</section>` : ''}
      <details class="reference-group" open><summary>Citations</summary>${facts.size ? podcastCitationsHTML({ facts: [...facts.values()] }) : '<p class="muted">No sourced period information yet.</p>'}</details>
      <details class="reference-group" open><summary>Outputs</summary>${outputs.length ? outputs.map(r => `<section class="reference-output"><a class="artifact-action" href="${esc(r.share?.demo ? r.share.url : r.podcast ? videoSources.get(r.podcast) : r.image)}" download="${r.podcast ? `memory-video.${r.podcast.video.type.startsWith('video/mp4') ? 'mp4' : 'webm'}` : r.file}">${svg('download')} ${esc(r.title)}${r.podcast ? ' · Video' : ''}</a>${r.podcast ? podcastSceneDetailsHTML(r.podcast, { english: true }) : ''}</section>`).join('') : '<p class="muted">No outputs yet.</p>'}</details>`;
  }

  function syncComposer() {
    if (!thread || view !== 'chat') return;
    const working = !!thread.job || replying(thread);
    el('message').placeholder = thread.job ? 'Agent is working…' : replying(thread) ? 'Typing…' : thread.phase === 'lab-revision' ? 'What would you like to change?' : `Message ${thread.agent.name}`;
    el('message').readOnly = working;
    el('send').hidden = working;
    el('send').disabled = !el('message').value.trim() && !draftPhoto && thread.phase !== 'podcast-memory';
    el('stop').hidden = !thread.job;
    el('podcastBack').hidden = working || thread.phase !== 'podcast-other';
    const canAttach = API.live && ['reference', 'podcast-reference'].includes(thread.phase) && !working;
    el('attachButton').hidden = false;
    el('attachButton').disabled = !canAttach;
    el('attachButton').title = canAttach ? 'Attach photo' : API.live ? 'Photo upload is available at the camera step.' : 'Demo Mode uses the saved reference photo.';
    el('composerMode').innerHTML = '<span>Auto</span> Medium';
    el('attachment').innerHTML = draftPhoto ? `<span class="pill">${svg('file')}${esc(draftPhoto.name)} ${action('removeAttachment', svg('close'), 'icon-btn')}</span>` : '';
    el('attachment').querySelector('button')?.setAttribute('aria-label', 'Remove photo');
  }

  function reserveAnswerSpace(node) {
    const pane = el('scroll'), log = el('messages');
    const padding = parseFloat(getComputedStyle(log).paddingBottom);
    const contentAfter = log.getBoundingClientRect().bottom - node.getBoundingClientRect().top - padding;
    // Trailing space lets a short user message align at the top.
    log.style.paddingBottom = `${Math.max(24, pane.clientHeight - 16 - contentAfter)}px`;
  }
  function scrollToTurn(t) {
    const start = turnStart(t);
    const node = el('messages').querySelector(`[data-message="${t.messages.indexOf(start)}"]`);
    if (!node) return;
    const pane = el('scroll');
    reserveAnswerSpace(node);
    if (t.scrollTurn === start) return;
    pane.scrollTop += node.getBoundingClientRect().top - pane.getBoundingClientRect().top - 16;
    t.scrollTurn = start;
  }
  function updateReplyText(t, entry) {
    const node = el('messages').querySelector(`[data-answer="${t.messages.indexOf(entry)}"]`);
    const text = node?.querySelector('.answer-text');
    if (!text) { render({ answer: entry }); return; }
    text.textContent = entry.displayText;
    reserveAnswerSpace(el('messages').querySelector(`[data-message="${t.messages.indexOf(turnStart(t))}"]`));
  }
  function render({ scroll = false, focus = false, answer = null } = {}) {
    renderChrome();
    if (view !== 'chat') return;
    const t = thread, log = el('messages'), previousBottom = el('scroll').scrollTop;
    const welcome = !t.messages.length;
    el('conversation').classList.toggle('is-welcome', welcome);
    el('starters').hidden = !welcome;
    el('starters').innerHTML = welcome ? `<button type="button" class="starter-prompt" data-action="start"><strong>Start experience</strong><span>${esc(t.agent.prompt)}</span>${svg('arrow')}</button><p class="muted">${esc(t.agent.summary)}</p>` : '';
    disposePodcastMedia(log);
    log.innerHTML = t.messages.length ? t.messages.map((entry, i) => renderMessage(t, entry, i)).join('') : `<div class="welcome">
      <div class="welcome-heading">${badge(t.agent)}<div><h1>${t.agent.name}</h1><p class="intro">Created by Microsoft</p></div></div></div>`;
    if (!t.messages.length) log.style.paddingBottom = '24px';
    const podcasts = t.messages.filter(entry => entry.result?.podcast && !entry.pending).map(entry => entry.result.podcast);
    log.querySelectorAll('.podcast-output').forEach((root, index) => mountPodcastMedia(root, null, podcasts[index]));
    syncComposer();
    renderWorkspace(t);
    const pane = el('scroll');
    pane.scrollTop = previousBottom;
    if (answer || scroll) scrollToTurn(t);
    if (focus) el('message').focus({ preventScroll: true });
  }

  function clearDraft() {
    libraryRequest++;
    libraryLoading = false;
    libraryError = '';
    releaseUrls(libraryUrls);
    disposePodcastMedia(el('messages'));
    document.querySelectorAll('video').forEach(video => video.pause());
    photoRead++;
    if (el('photoDialog').open) el('photoDialog').close();
    closeCamera();
    draftPhoto = null;
    el('message').value = '';
    el('photoInput').value = '';
  }

  function openThread(t) {
    clearDraft();
    thread = t;
    t.scrollTurn = null;
    mode = t.mode;
    view = 'chat';
    panelOpen = !!t.job && t.mode === 'cowork' && !compact.matches;
    if (compact.matches) sideOpen = false;
    render({ scroll: true, focus: !compact.matches });
  }

  function newThread(agent) {
    const t = { id: uid(), agent, title: agent.name, mode, messages: [], phase: 'start', values: {}, variation: 0, job: null };
    threads.unshift(t);
    openThread(t);
  }

  function openCatalog(focus = false) {
    clearDraft();
    view = 'catalog';
    panelOpen = false;
    if (compact.matches) sideOpen = false;
    render();
    if (focus) el('catalogInput').focus();
  }

  function readInput(t, text, choice, photo) {
    const custom = {
      'podcast-era': { options: PODCAST_ERAS, phase: 'podcast-date' },
      'podcast-moment': { options: PODCAST_MOMENTS, phase: 'podcast-other' },
      'lab-note-choice': { options: LAB_NOTE_OPTIONS, phase: 'lab-note' },
    }[t.phase];
    if (!choice && text.trim() && custom && (t.phase === 'podcast-era' || custom.options.some(option => ['other', 'custom'].includes(option.id))) &&
        (t.phase === 'podcast-era'
          ? !custom.options.some(option => option.id === 'custom' && normalize(option.name) === normalize(text))
          : !matchOptions(custom.options, text).length)) t.phase = custom.phase;
    const v = t.values;
    switch (t.phase) {
      case 'start':
        if (t.agent.id === 'photo') {
          ask(t, 'character', 'Ofiste nasıl bir yıldızsın? Sana en çok benzeyeni seç; lezzet ruhunu birlikte bulalım.', characters);
        } else if (t.agent.id === 'podcast') {
          ask(t, 'podcast-product', 'Bu ürün sana hangi yılı hatırlatıyor? Bir Ülker ürünü seç.', PODCAST_PRODUCTS);
        } else {
          const bases = matchOptions(LAB_BASES, text);
          if (bases.length === 1) {
            t.phase = 'base';
            readInput(t, text, bases[0]);
          } else promptLab(t);
        }
        break;
      case 'character': {
        const character = choice || matchOptions(characters, text)[0] || matchOptions(PRODUCTS, text)[0];
        const product = character && byId(PRODUCTS, character.id);
        if (!product) return ask(t, 'character', 'Sana en çok benzeyen yıldızı aşağıdan seçebilir veya ürünün adını yazabilirsin.', characters);
        v.product = product;
        say(t, `Lezzet ruhun: ${product.name}. ${product.reveal}`);
        ask(t, 'theme', 'Hikâyen hangi dünyada geçsin? Portre için bir tema seç.', THEMES);
        break;
      }
      case 'theme': {
        const theme = choice || matchOptions(THEMES, text)[0];
        if (!theme) return ask(t, 'theme', 'Temayı bulamadım. Aşağıdaki seçeneklerden birini seçebilir veya adını yazabilirsin.', THEMES);
        v.theme = theme;
        ask(t, 'reference', API.live
          ? 'Poz vermeye geç: kamerayı açıp fotoğrafını çek, bir fotoğraf yükle veya örnek fotoğrafı seç.'
          : 'Demo Modu kamerayı açmaz. Örnek fotoğrafla devam et; son adımda bu temanın kayıtlı portresini göstereceğim.', referenceOptions());
        break;
      }
      case 'reference':
      case 'podcast-reference': {
        const theater = t.agent.id === 'podcast', phase = theater ? 'podcast-reference' : 'reference';
        if (choice?.id === 'camera' || normalize(text) === 'kamerayi ac') {
          if (!API.live) return ask(t, phase, 'Demo Modu kamerayı açmaz; örnek fotoğrafla devam et.', referenceOptions());
          ask(t, phase, theater ? 'Selfieni çekip Send düğmesine bas; fotoğraf geçmişteki halini canlandırmak için Foundry’ye gönderilecek.' : 'Fotoğrafını çekip Send düğmesine bas. Üretim ancak son onayından sonra başlayacak.', referenceOptions());
          el('photoDialog').showModal();
          openCamera();
          break;
        }
        if (choice?.id === 'upload' || normalize(text) === 'fotograf yukle') {
          if (!API.live) return ask(t, phase, 'Demo Modu kayıtlı örnek fotoğrafı kullanır.', referenceOptions());
          ask(t, phase, theater ? 'Tek yüzlü bir selfie seç ve Send ile anında kullanmak için Foundry’ye gönder.' : 'Bir fotoğraf seçip Send düğmesine bas. Fotoğraf henüz Foundry’ye gönderilmeyecek.', referenceOptions());
          el('photoInput').click();
          break;
        }
        if (photo) v.photo = photo.data;
        else if (choice?.id === 'sample' || normalize(text) === 'ornek fotografi kullan') v.photo = theater ? demoPortrait() : null;
        else return ask(t, phase, 'Henüz bir fotoğraf eklenmedi. Kamera, dosya veya örnek fotoğraf seçeneklerinden birini kullan.', referenceOptions());
        if (theater) { v.estimatedAge = null; v.currentAge = null; v.age = null; estimatePodcastAge(t); break; }
        if (API.live) prepare(t, `${v.theme.name} · ${v.product.name}`, 'Referans fotoğraf Microsoft Foundry’ye gönderilecek. Yalnızca kullanma iznin olan bir fotoğrafla devam et.', true);
        else {
          const sample = sampleFor(`photo-${v.theme.id}`);
          prepare(t, `${v.theme.name} · ${sample.product}`, `Seçtiğin lezzet ruhu ${v.product.name}. Demo kişiselleştirme yapmaz: bu temanın ${sample.product} ile kayıtlı portresini getireceğim. Kamera açılmayacak ve yeni görsel üretilmeyecek.`);
        }
        break;
      }
      case 'podcast-product': {
        const product = choice || matchOptions(PODCAST_PRODUCTS, text)[0];
        if (!product) return ask(t, 'podcast-product', 'Bir Ülker ürünü seç.', PODCAST_PRODUCTS);
        v.product = product;
        ask(t, 'podcast-era', 'Hangi yıla dönelim? Bir dönem veya özel bir tarih seç.', PODCAST_ERAS);
        break;
      }
      case 'podcast-era': {
        const era = choice || matchOptions(PODCAST_ERAS, text)[0];
        if (!era) return ask(t, 'podcast-era', 'Bir dönem seç.', PODCAST_ERAS);
        v.era = era;
        if (era.id === 'custom') ask(t, 'podcast-date', '90’lar, Mayıs 1995 veya 23 Nisan 2004 gibi bir tarih yaz.');
        else ask(t, 'podcast-moment', 'O an neredeydin?', PODCAST_MOMENTS);
        break;
      }
      case 'podcast-date':
        try {
          const era = podcastNaturalDate(text);
          if (!era) return parsePodcastDate(t, text);
          v.era = era;
        }
        catch (error) { return ask(t, 'podcast-date', error.message); }
        ask(t, 'podcast-moment', `${v.era.name} tarihine dönüyoruz. O an neredeydin?`, PODCAST_MOMENTS);
        break;
      case 'podcast-moment': {
        const moment = choice || matchOptions(PODCAST_MOMENTS, text)[0];
        if (!moment) return ask(t, 'podcast-moment', 'Bir an seç.', PODCAST_MOMENTS);
        v.moment = moment;
        if (moment.id === 'other') ask(t, 'podcast-other', 'O anı kısaca nasıl adlandıralım?');
        else promptPodcastSelfie(t);
        break;
      }
      case 'podcast-other':
        try { v.moment = { id: 'other', name: podcastText(text, 'Anın', 80) }; }
        catch (error) { return ask(t, 'podcast-other', error.message); }
        promptPodcastSelfie(t);
        break;
      case 'podcast-memory':
        v.memory = choice?.id === 'skip-detail' ? '' : text;
        try { validatePodcastInput(v); }
        catch (error) { return ask(t, 'podcast-memory', error.message); }
        prepare(t, `${v.product.name} · ${v.era.name} · ${v.moment.name}`, API.live
          ? 'Web araması dönemin önemli haberlerini bulacak; kaynaklı haberleri doğrudan kullanacağız. Selfien ve anın Foundry’ye gönderilip radyo tiyatrosu, kurgu gazete ve o yaştaki halini içeren iki devam karesi üretilecek. Üç sahne, hafif dönem müziğiyle sepya videoya dönüşecek.'
          : 'Demo, yeni araştırma veya üretim yapmadan kayıtlı üç sahneli radyo tiyatrosunu gösterecek.', API.live);
        break;
      case 'base': {
        const base = choice || matchOptions(LAB_BASES, text)[0];
        if (!base) return promptLab(t);
        v.base = base;
        promptLabFlavor(t);
        break;
      }
      case 'flavors':
      case 'second-flavor': {
        const second = t.phase === 'second-flavor';
        if (second && (choice?.id === singleFlavor.id || normalize(text) === normalize(singleFlavor.name))) {
          ask(t, 'moment', 'Bu ürünü hangi anda tüketmek için tasarlayalım?', LAB_MOMENTS);
          break;
        }
        const found = choice ? [choice] : matchOptions(LAB_FLAVORS, text);
        const flavors = found.filter(f => !found.some(other => other !== f && ` ${normalize(other.name)} `.includes(` ${normalize(f.name)} `)));
        if (flavors.length !== 1) return promptLabFlavor(t, second, 'Lütfen bu adımda tek bir malzeme seç.');
        if (second && v.flavors.some(flavor => flavor.id === flavors[0].id)) {
          return promptLabFlavor(t, true, 'Bu malzemeyi zaten seçtin. İkinci malzeme farklı olmalı.');
        }
        v.flavors = second ? [...v.flavors, ...flavors] : flavors;
        if (second) ask(t, 'moment', 'Bu ürünü hangi anda tüketmek için tasarlayalım?', LAB_MOMENTS);
        else promptLabFlavor(t, true);
        break;
      }
      case 'moment': {
        const moment = choice || matchOptions(LAB_MOMENTS, text)[0];
        if (!moment) return ask(t, 'moment', 'Aşağıdaki tüketim anlarından birini seç.', LAB_MOMENTS);
        v.moment = moment;
        ask(t, 'lab-note-choice', LAB_NOTE_QUESTION, LAB_NOTE_OPTIONS);
        break;
      }
      case 'lab-note-choice': {
        const option = choice || matchOptions(LAB_NOTE_OPTIONS, text)[0];
        if (!option) return ask(t, 'lab-note-choice', LAB_NOTE_QUESTION, LAB_NOTE_OPTIONS);
        if (option.id === 'custom') ask(t, 'lab-note', 'Ar-Ge ekibine iletmek istediğin özel notu yaz.', [LAB_NOTE_OPTIONS[0]]);
        else { v.rdNote = ''; prepareLab(t); }
        break;
      }
      case 'lab-note': {
        if (choice?.id === 'trust' || normalize(text) === normalize(LAB_NOTE_OPTIONS[0].name)) v.rdNote = '';
        else {
          try { v.rdNote = validateLabNote(text); }
          catch (error) { return ask(t, 'lab-note', error.message, [LAB_NOTE_OPTIONS[0]]); }
          if (!v.rdNote) return ask(t, 'lab-note', 'Özel notunu yaz veya Onlara Güveniyorum seçeneğiyle devam et.', [LAB_NOTE_OPTIONS[0]]);
        }
        prepareLab(t);
        break;
      }
      case 'approval':
        say(t, 'Üretim için aşağıdaki onay kartını kullan.', { approval: t.plan });
        break;
      case 'lab-revision':
        if (choice?.id === 'cancel-revision') {
          t.revision = null;
          ask(t, 'finished', 'Revizyon iptal edildi; önceki tasarımın korunuyor.', followups);
        } else prepareRevision(t, text);
        break;
      case 'finished':
        if (choice?.id === 'retry' || ['yeniden dene', 'yeniden uret'].includes(normalize(text))) {
          if (t.revision) prepare(t, t.planTitle, t.plan);
          else {
            t.variation++;
            if (t.agent.id === 'lab') prepareLab(t);
            else prepare(t, t.planTitle, t.plan, ['photo', 'podcast'].includes(t.agent.id) && API.live);
          }
        } else if (choice?.id === 'change' || normalize(text) === 'secimleri degistir') {
          t.values = {}; t.revision = null; t.result = null;
          t.phase = 'start';
          readInput(t, t.agent.prompt);
        } else if (t.agent.id === 'lab' && t.result?.canRevise && text.trim()) {
          prepareRevision(t, text);
        } else say(t, 'İstersen seçimlerini değiştirebilir veya aynı adımlarla tekrar deneyebilirsin.', { options: followups });
        break;
    }
  }

  const characters = PRODUCTS.map(product => ({ id: product.id, name: product.persona.title }));
  const referenceOptions = () => [
    ...(API.live ? [{ id: 'camera', name: 'Kamerayı aç' }, { id: 'upload', name: 'Fotoğraf yükle' }] : []),
    { id: 'sample', name: 'Örnek fotoğrafı kullan' },
  ];
  const followups = [{ id: 'change', name: 'Seçimleri değiştir' }, { id: 'retry', name: 'Yeniden dene' }];
  const singleFlavor = { id: 'single-flavor', name: 'Tek malzemeyle devam et' };
  function promptPodcastSelfie(t) {
    ask(t, 'podcast-reference', API.live
      ? 'Detay adımından önce selfieni çek. Gönderince fotoğraf geçmişteki halini canlandırmak için Foundry’ye gönderilecek.'
      : 'Demo kamerayı açmaz. Örnek selfieyle akışı keşfet.', referenceOptions());
  }
  async function parsePodcastDate(t, text) {
    const controller = new AbortController(), job = { steps: ['Understand your date'], status: 'running', step: 0, controller };
    t.job = job; t.phase = 'podcast-date-loading'; add(t, { type: 'job', job });
    render({ scroll: true });
    try {
      const era = await resolvePodcastDate(text, controller.signal);
      controller.signal.throwIfAborted();
      t.values.era = era;
      job.status = 'complete'; job.step = 1;
      ask(t, 'podcast-moment', `${era.name} tarihine dönüyoruz. O an neredeydin?`, PODCAST_MOMENTS);
    } catch (error) {
      job.status = controller.signal.aborted ? 'stopped' : 'error';
      ask(t, 'podcast-date', controller.signal.aborted ? 'Tarih çözümleme durduruldu. Yeniden bir tarih yazabilirsin.' : error.message, [], { error: !controller.signal.aborted });
    } finally { t.job = null; if (thread === t && view === 'chat') render({ scroll: true }); }
  }
  async function estimatePodcastAge(t) {
    const controller = new AbortController(), job = { steps: ['Prepare your selfie'], status: 'running', step: 0, controller };
    t.job = job; t.phase = 'podcast-age-loading'; add(t, { type: 'job', job });
    render({ scroll: true });
    try {
      const age = await API.podcast.estimateAge(t.values.photo, controller.signal);
      controller.signal.throwIfAborted();
      t.values.estimatedAge = age; t.values.currentAge = age;
      t.values.age = podcastAge(t.values.era, age);
      job.status = 'complete'; job.step = 1;
      ask(t, 'podcast-memory', `${podcastDetailQuestion(t.values.moment)} İsteğe bağlı; boş bırakarak da devam edebilirsin. Hassas kişisel bilgi yazma.`, [{ id: 'skip-detail', name: 'Detay eklemeden devam et' }]);
    } catch (error) {
      job.status = controller.signal.aborted ? 'stopped' : 'error';
      if (!controller.signal.aborted) console.error('Selfie yaş tahmini başarısız:', error);
      ask(t, 'podcast-reference', controller.signal.aborted ? 'Selfie hazırlığı durduruldu. Yeniden fotoğraf seçebilirsin.' : error.message, referenceOptions(), { error: !controller.signal.aborted });
    } finally { t.job = null; if (thread === t && view === 'chat') render({ scroll: true }); }
  }
  function promptLab(t) {
    ask(t, 'base', 'Ürünün temeli ne olsun?', LAB_BASES);
  }
  function promptLabFlavor(t, second = false, notice = '') {
    const options = second ? [...LAB_FLAVORS.filter(flavor => flavor.id !== t.values.flavors[0].id), singleFlavor] : LAB_FLAVORS;
    const question = second
      ? 'İkinci malzeme olarak ne ekleyelim? İstersen tek malzemeyle devam edebilirsin.'
      : 'İlk malzemeni seç.';
    ask(t, second ? 'second-flavor' : 'flavors', (notice ? notice + ' ' : '') + question, options);
  }
  function prepareLab(t) {
    const v = t.values;
    const description = API.live
      ? 'Foundry önce ürün adını, sloganı ve hikâyeyi yazacak, ardından Ülker logosunu referans alarak ambalajı tasarlayacak.'
      : 'Seçimlerini aldım. Demo modunda yeni bir ürün üretmeyeceğim; galerideki kayıtlı ambalajı ve ona ait adı, sloganı ve hikâyeyi göstereceğim.';
    prepare(t, `${v.base.name} · ${v.flavors.map(f => f.name).join(' ve ')} · ${v.moment.name}`, description + (v.rdNote ? ` Ar-Ge notun: ${v.rdNote}` : ''));
  }
  function prepareRevision(t, text) {
    if (!API.live || !t.result?.canRevise) return say(t, 'Revizyon için Demo Modunu kapatıp bir tasarım oluşturmalısın.');
    let instruction;
    try { instruction = validateLabRevision(text); }
    catch (error) { return ask(t, 'lab-revision', error.message, [{ id: 'cancel-revision', name: 'Vazgeç' }]); }
    t.revision = { image: t.result.image, concept: t.result.concept, instruction };
    prepare(t, 'Ambalaj revizyonu', `Mevcut tasarımını referans alıp şu değişikliği uygulayacağım: ${instruction}`);
  }

  function prepare(t, title, description, consent = false) {
    t.planTitle = title;
    t.plan = description;
    if (t.mode === 'cowork' || consent) ask(t, 'approval', t.planTitle, [], { approval: description });
    else run(t);
  }

  function submit(text, choice = null, photo = null) {
    const t = thread;
    if (!t || t.job || replying(t) || (!text && !photo && t.phase !== 'podcast-memory')) return;
    clearDraft();
    if (!t.messages.length && text) t.title = /\p{L}/u.test(text) ? text.slice(0, 80) : t.agent.name;
    add(t, { type: 'user', text: [text, photo ? `Ek: ${photo.name}` : ''].filter(Boolean).join('\n') || 'Detay eklemeden devam et' });
    readInput(t, text, choice, photo);
    render({ scroll: true, focus: !compact.matches });
  }

  async function run(t) {
    if (t.job) return;
    const controller = new AbortController(), { signal } = controller, v = t.values;
    const live = API.live, opts = { fast: true, signal };
    const revision = t.revision;
    const steps = revision ? ['Review the revision request', 'Revise the existing package', 'Add the revision to chat'] : live ? ({
      photo: ['Prepare references and generate the portrait', 'Add the portrait to chat'],
      podcast: ['Find period headlines with WebIQ', 'Write the radio story', 'Create the newspaper frame', 'Reimagine your past appearance', 'Create the continuation and ending', 'Narrate the scenes', 'Combine film and period music', 'Add the memory video to chat'],
      lab: ['Write the product name, slogan and story', 'Create the package', 'Add the concept to chat'],
    })[t.agent.id] : t.agent.id === 'podcast' ? ['Load the saved scenes', 'Load the saved radio story', 'Add the output to chat'] : ['Load the saved demo output', 'Add the output to chat'];
    const job = { steps, status: 'running', step: 0, controller, outputs: [] };
    t.phase = 'running';
    t.job = job;
    add(t, { type: 'job', job });
    if (thread === t && view === 'chat' && t.mode === 'cowork' && !compact.matches) panelOpen = true;
    const update = () => { if (thread === t && view === 'chat') render({ scroll: true }); };
    const output = (index, data) => {
      signal.throwIfAborted();
      job.outputs[index] = { ...job.outputs[index], ...data };
      update();
    };
    const advance = () => { signal.throwIfAborted(); job.step++; update(); };
    update();
    try {
      // Yield a frame so Cowork can show that output retrieval has started.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      signal.throwIfAborted();
      let image, title, story, slogan, concept, podcast;
      const variation = t.variation;
      if (t.agent.id === 'photo') {
        image = await API.photo.generate({ photo: v.photo, product: v.product, theme: v.theme, variation }, opts);
        title = v.theme.name;
        output(0, { text: `${title} · ${v.product.name}`, image });
      } else if (t.agent.id === 'podcast') {
        podcast = await API.podcast.generate(v, {
          ...opts, onOutput: output,
          onStage: index => { signal.throwIfAborted(); job.step = index; update(); },
          onStep: (index, status) => {
            (job.stepStates ??= [])[index] = status;
            if (status === 'error') job.step = index;
            update();
          },
        });
        ({ image, title } = podcast);
      } else {
        if (revision) {
          ({ concept, img: image } = await API.lab.revise(revision, { ...opts, onCopy: advance }));
          output(0, { text: JSON.stringify(concept, null, 2) });
          output(1, { image });
        } else {
          concept = await API.lab.concept({ ...v, variation }, opts);
          output(0, { text: JSON.stringify(concept, null, 2) });
          if (live) advance();
          image = await API.lab.packaging(concept, opts);
          output(job.step, { image });
        }
        ({ name: title, story, slogan } = concept);
      }
      output(steps.length - 1, { text: title, image });
      advance();
      job.step++;
      job.status = 'complete';
      t.result = { image, title, story, slogan, concept, podcast, live, canRevise: t.agent.id === 'lab' && live, file: `copilot-${t.agent.id}.jpg` };
      if (!live) t.result.share = await API.share.publish(t.agent.id, image, { theme: v.theme?.id });
      let historyError;
      try {
        await OutputLibrary.save({
          agentId: t.agent.id, agentName: t.agent.name, title,
          description: slogan || '', image: dataUrlToBlob(image), video: podcast?.video || null, live,
        });
        if (view === 'library' && libraryTab === 'recents') loadRecents();
      } catch (error) {
        console.error('Output history could not be saved:', error);
        historyError = error;
      }
      t.revision = null;
      if (historyError) say(t, 'Çıktın hazır, ancak tarayıcı hafızasına kaydedilemedi. Bu oturumdan indirebilirsin; tarayıcı depolama izinlerini ve boş alanı kontrol et.', { error: true });
      say(t, revision ? 'Revizyonun hazır. Önceki tasarımın da sohbette duruyor.' : podcast ? (live ? 'Üç sahneli radyo tiyatron hazır. Buradan izleyebilir ve indirebilirsin.' : 'Kayıtlı demo videosu hazır. Bu işlemde yeni bir video üretilmedi.') : live ? 'Çıktın hazır. Görseli buradan indirebilirsin.' : 'Kayıtlı demo çıktısı hazır. Bu işlemde yeni bir görsel üretilmedi.', {
        result: t.result,
      });
    } catch (error) {
      job.status = signal.aborted ? 'stopped' : 'error';
      const previous = job.outputs[job.step];
      job.outputs[job.step] = { ...previous, text: [previous?.text, signal.aborted ? 'Stopped.' : error.message].filter(Boolean).join('\n\n') };
      if (!signal.aborted) console.error('Copilot üretimi başarısız:', error);
      say(t, signal.aborted ? 'İşlem durduruldu. İstersen yeniden deneyebilir veya seçimleri değiştirebilirsin.' : error.message, { options: followups, error: !signal.aborted });
    } finally {
      t.phase = 'finished';
      t.job = null;
      update();
    }
  }

  function notice(message) {
    clearTimeout(noticeTimer);
    el('notice').textContent = message;
    el('notice').hidden = false;
    noticeTimer = setTimeout(() => { el('notice').hidden = true; }, 4000);
  }

  function renderSearch() {
    const needle = normalize(el('searchInput').value);
    const found = threads.filter(t => t.messages.length && normalize([t.title, t.agent.name, ...t.messages.map(m => m.text || '')].join(' ')).includes(needle));
    el('searchResults').innerHTML = threadRows(found) || '<p class="muted">No matching chats.</p>';
  }

  let settingsLoading = false, settingsRequest = 0, settingsDemo = !API.live;
  function settingsFeedback(message, error = false) {
    el('settingsStatus').textContent = message;
    el('settingsStatus').setAttribute('role', error ? 'alert' : 'status');
  }
  function selectSettingsTab(name) {
    document.querySelectorAll('[data-settings-tab]').forEach(button => {
      const selected = button.dataset.settingsTab === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      el(button.getAttribute('aria-controls')).hidden = !selected;
    });
    if (!settingsLoading) settingsFeedback('');
  }
  function syncSettingsControls() {
    document.querySelectorAll('[data-interface]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.interface === FoundrySettings.loadInterface()));
      button.disabled = settingsLoading;
    });
    el('applyLaunch').disabled = settingsLoading;
    el('launchDemo').disabled = settingsLoading;
    el('connection').inert = settingsLoading;
    el('connectionFields').disabled = settingsLoading;
    el('voiceSettings').inert = settingsLoading;
    el('settingsFullscreen').checked = !!fullscreenDocument.fullscreenElement;
    el('settingsFullscreen').disabled = !fullscreenDocument.fullscreenEnabled;
    el('settingsFullscreen').title = fullscreenDocument.fullscreenEnabled ? '' : 'Fullscreen is not supported by this browser.';
    el('settings').querySelector('[role="tablist"]').setAttribute('aria-orientation', compact.matches ? 'horizontal' : 'vertical');
  }
  async function showSettings(tab = 'general') {
    const dialog = el('settings'), form = el('connection'), status = el('settingsStatus');
    const request = ++settingsRequest, staged = form.cloneNode(true);
    staged.reset();
    staged.elements.voice.value = CONFIG.ai.speechVoice;
    settingsLoading = true;
    selectSettingsTab(tab);
    if (!dialog.open) dialog.showModal();
    syncSettingsControls();
    settingsFeedback('Loading shared connection settings…');
    try {
      FoundrySettings.loadSaved(staged);
      BlobShare.fill(staged);
      const selectedVoice = staged.elements.voice.value;
      await FoundrySettings.loadLocal(staged);
      staged.elements.voice.value = selectedVoice;
      if (request !== settingsRequest || !dialog.open) return;
      for (const name of FoundrySettings.fields) form.elements[name].value = staged.elements[name].value;
      el('voiceModel').value = selectedVoice;
      settingsFeedback('');
    } catch (error) {
      if (request !== settingsRequest || !dialog.open) return;
      for (const name of FoundrySettings.fields) form.elements[name].value = staged.elements[name].value;
      el('voiceModel').value = staged.elements.voice.value;
      console.error('Yerel ayarlar okunamadı:', error);
      status.textContent = 'Shared settings could not be fully loaded. Check the connection fields before saving.';
      status.setAttribute('role', 'alert');
    } finally {
      if (request === settingsRequest) { settingsLoading = false; syncSettingsControls(); }
    }
  }
  function readConnection(data) {
    const endpoint = (data.get('endpoint') || '').trim().match(/^(https:\/\/[a-z0-9][a-z0-9-]*\.services\.ai\.azure\.com)(?:\/mai\/v1(?:\/images\/(?:generations|edits))?)?\/?$/i);
    const apiKey = (data.get('key') || '').trim(), imageDeployment = (data.get('imageModel') || '').trim();
    if (!endpoint || !apiKey || !imageDeployment) throw new Error('Enter a valid HTTPS Foundry endpoint, API key and image deployment.');
    const speechVoice = FoundrySettings.voice(data.get('voice') || CONFIG.ai.speechVoice);
    const webIQApiKey = FoundrySettings.webIQKey(data.get('webIQKey') || '');
    const sas = (data.get('blobSas') || '').trim();
    return {
      settings: { mode: 'live', endpoint: endpoint[1], apiKey, webIQApiKey, imageDeployment, labDeployment: (data.get('labModel') || '').trim(), speechVoice },
      blobSettings: sas ? { sas: BlobShare.parse(sas).url.href } : null,
    };
  }
  function savedConnection() {
    const saved = localStorage.getItem(FoundrySettings.storageKey);
    if (!saved) throw new Error('Save a connection in Connections before turning off Demo Mode.');
    return readConnection(new Map(Object.entries(JSON.parse(saved))));
  }

  function changeConnection(settings, blobSettings = null, persist = false) {
    if (threads.some(t => t.job || t.messages.some(m => m.result?.publishing))) {
      settingsFeedback('Finish or stop running operations before switching modes.', true);
      return false;
    }
    if (persist) FoundrySettings.save(settings, blobSettings);
    FoundrySettings.saveMode(settings.mode);
    FoundrySettings.apply(settings);
    settingsDemo = settings.mode !== 'live';
    BlobShare.settings = blobSettings;
    if (settings.mode === 'live') FoundrySettings.fill(el('connection'), {
      endpoint: settings.endpoint, key: settings.apiKey, imageModel: settings.imageDeployment,
      webIQKey: settings.webIQApiKey || '',
      labModel: settings.labDeployment, voice: settings.speechVoice, blobSas: blobSettings?.sas || '',
    });
    renderCards();
    for (const t of threads) { finishReplies(t); t.values.photo = null; }
    threads.length = 0;
    thread = null;
    openCatalog();
    syncSettingsControls();
    settingsFeedback(API.live ? 'Foundry connection ready.' : 'Demo Mode enabled.');
    return true;
  }

  document.addEventListener('click', async event => {
    const target = event.target.closest('button');
    if (!target || target.disabled) return;
    const { agent, thread: threadId, choice, action: command, libraryTab: tab, libraryView: selectedView, settingsTab, sample: sampleIndex } = target.dataset;
    if (settingsTab) return selectSettingsTab(settingsTab);
    if (tab) {
      libraryTab = tab;
      libraryRequest++;
      libraryLoading = false;
      libraryError = '';
      if (tab === 'recents') return loadRecents();
      return renderLibrary();
    }
    if (selectedView) { libraryView = selectedView; return renderLibrary(); }
    if (sampleIndex !== undefined) return openSample(librarySamples[Number(sampleIndex)]);
    if (agent) {
      if (el('sampleDialog').open) el('sampleDialog').close();
      return newThread(byId(agents, agent));
    }
    if (threadId) {
      if (el('searchDialog').open) el('searchDialog').close();
      return openThread(threads.find(t => t.id === threadId));
    }
    if (choice !== undefined) {
      const option = thread.messages.at(-1)?.options?.[Number(choice)];
      if (option) submit(option.name, option);
      return;
    }
    switch (command) {
      case 'publish': {
        const owner = thread;
        const result = thread.messages[Number(target.dataset.output)]?.result;
        if (!result || result.podcast || !result.live || result.publishing || result.share || replying(thread)) return;
        result.publishing = true;
        let failed = false;
        render({ scroll: false });
        try { result.share = await BlobShare.publish(result.image); }
        catch (error) {
          console.error('Azure paylaşımı başarısız:', error);
          failed = true;
          say(owner, error.message, { error: true, options: owner.messages.at(-1)?.options });
        } finally {
          result.publishing = false;
          if (thread === owner && view === 'chat') render({ scroll: failed });
        }
        return;
      }
      case 'kiosk': return location.assign(new URL('.', document.baseURI).href);
      case 'agents': return openCatalog();
      case 'library': return openLibrary();
      case 'closeSamples':
        if (embeddedSamples) window.parent.postMessage({ type: 'kiosk-samples-close' }, location.origin);
        return;
      case 'librarySearch':
      case 'libraryFilter': {
        const box = el(command === 'librarySearch' ? 'librarySearchBox' : 'libraryFilterBox');
        box.hidden = !box.hidden;
        target.setAttribute('aria-expanded', String(!box.hidden));
        if (!box.hidden) box.querySelector('input, select').focus();
        return;
      }
      case 'closeSample': return el('sampleDialog').close();
      case 'new': return view === 'chat' ? newThread(thread.agent) : openCatalog(true);
      case 'sidebar': sideOpen = !sideOpen; return renderChrome();
      case 'workspace': panelOpen = !panelOpen; return renderChrome();
      case 'sources': panelOpen = true; return renderChrome();
      case 'start': return submit(thread.agent.prompt);
      case 'change':
      case 'retry': {
        if (thread.job || replying(thread) || thread.phase !== 'finished') return;
        const option = followups.find(item => item.id === command);
        return submit(option.name, option);
      }
      case 'revise':
        if (thread.job || replying(thread) || thread.phase !== 'finished' || !thread.result?.canRevise) return;
        thread.revision = null;
        ask(thread, 'lab-revision', 'Mevcut tasarımında neyi değiştirelim? İsteğini yaz; önceki görseli referans alacağım.', [{ id: 'cancel-revision', name: 'Vazgeç' }]);
        return render({ scroll: true, focus: true });
      case 'approve':
      case 'cancelPlan':
        if (thread.phase !== 'approval' || replying(thread)) return;
        add(thread, { type: 'user', text: command === 'approve' ? 'Onayla ve başlat' : 'İptal' });
        if (command === 'approve') return run(thread);
        thread.phase = 'finished'; thread.revision = null;
        say(thread, 'Plan iptal edildi. Üretim başlatılmadı.', { options: followups });
        return render({ scroll: true, focus: !compact.matches });
      case 'stop': return thread.job?.controller.abort();
      case 'podcastBack':
        if (thread?.phase !== 'podcast-other' || replying(thread)) return;
        clearDraft();
        thread.values.moment = null;
        ask(thread, 'podcast-moment', 'O an neredeydin?', PODCAST_MOMENTS);
        return render({ scroll: true, focus: false });
      case 'attach':
        if (!API.live || !thread || !['reference', 'podcast-reference'].includes(thread.phase) || thread.job || replying(thread)) return;
        el('cameraStatus').textContent = '';
        return el('photoDialog').showModal();
      case 'closePhoto': return el('photoDialog').close();
      case 'pickPhoto':
        el('photoDialog').close();
        return el('photoInput').click();
      case 'camera': return openCamera();
      case 'capture': return capturePhoto();
      case 'removeAttachment': photoRead++; draftPhoto = null; return syncComposer();
      case 'search': renderSearch(); el('searchDialog').showModal(); return el('searchInput').focus();
      case 'closeSearch': return el('searchDialog').close();
      case 'settings': return showSettings();
      case 'connectionSettings': return showSettings('connections');
      case 'closeSettings': return closeSettings();
    }
  });
  el('settings').addEventListener('close', () => {
    settingsRequest++;
    settingsLoading = false;
    syncSettingsControls();
  });
  el('settings').querySelector('[role="tablist"]').addEventListener('keydown', event => {
    const buttons = [...document.querySelectorAll('[data-settings-tab]')];
    const current = buttons.indexOf(event.target);
    if (current < 0) return;
    const previous = compact.matches ? 'ArrowLeft' : 'ArrowUp', next = compact.matches ? 'ArrowRight' : 'ArrowDown';
    let index;
    if (event.key === previous) index = (current + buttons.length - 1) % buttons.length;
    else if (event.key === next) index = (current + 1) % buttons.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else return;
    event.preventDefault();
    selectSettingsTab(buttons[index].dataset.settingsTab);
    buttons[index].focus();
  });
  el('launchDemo').addEventListener('click', () => {
    if (settingsLoading) return;
    try {
      if (changeConnection({ mode: 'mock', apiKey: '' })) closeSettings(true);
    } catch (error) {
      console.error('Connection mode could not be changed:', error);
      settingsFeedback(uiError(error), true);
    } finally { syncSettingsControls(); }
  });
  el('settingsFullscreen').addEventListener('change', async event => {
    const fullscreen = event.currentTarget.checked;
    event.currentTarget.disabled = true;
    try {
      if (fullscreen) await fullscreenDocument.documentElement.requestFullscreen();
      else if (fullscreenDocument.fullscreenElement) await fullscreenDocument.exitFullscreen();
      settingsFeedback('');
    } catch (error) {
      console.error('Fullscreen mode could not be changed:', error);
      settingsFeedback('The browser did not allow the fullscreen change.', true);
    } finally { syncSettingsControls(); }
  });
  fullscreenDocument.addEventListener('fullscreenchange', syncSettingsControls);

  function rememberJobExpansion(event) {
    const summary = event.type === 'click' ? event.target.closest('summary') : null;
    const node = summary?.parentElement || event.target;
    if (!node.isConnected || !thread) return;
    const open = summary ? !node.open : node.open;
    if (node.matches('details[data-job]')) {
      const job = thread.messages[Number(node.dataset.job)]?.job;
      if (job) job.expanded = open;
    } else if (node.matches('details[data-step]')) {
      const job = thread.messages[Number(node.dataset.jobIndex)]?.job;
      if (job) {
        job.stepExpanded ||= {};
        job.stepExpanded[Number(node.dataset.step)] = open;
      }
    }
  }
  el('messages').addEventListener('toggle', rememberJobExpansion, true);
  el('workspaceBody').addEventListener('toggle', rememberJobExpansion, true);
  el('messages').addEventListener('click', rememberJobExpansion);
  el('workspaceBody').addEventListener('click', rememberJobExpansion);
  el('searchInput').addEventListener('input', renderSearch);
  el('connection').addEventListener('submit', event => {
    event.preventDefault();
    if (settingsLoading) return settingsFeedback('Wait for settings to finish loading.', true);
    try {
      const { settings, blobSettings } = readConnection(new FormData(event.currentTarget));
      if (changeConnection(settings, blobSettings, true)) closeSettings(true);
    } catch (error) {
      console.error('Connection settings could not be saved:', error);
      settingsFeedback(uiError(error), true);
    }
  });
  el('voiceSettings').addEventListener('submit', event => {
    event.preventDefault();
    if (settingsLoading) return settingsFeedback('Wait for settings to finish loading.', true);
    if (threads.some(t => t.job)) return settingsFeedback('Finish or stop running generations before changing the voice.', true);
    try {
      FoundrySettings.saveVoice(el('voiceModel').value);
      el('connection').elements.voice.value = CONFIG.ai.speechVoice;
      el('voiceModel').value = CONFIG.ai.speechVoice;
      settingsFeedback('Voice saved.');
    } catch (error) {
      console.error('Voice settings could not be saved:', error);
      settingsFeedback(uiError(error), true);
    }
  });
  el('message').addEventListener('input', syncComposer);
  el('message').addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    if (!el('send').hidden && !el('send').disabled) el('composer').requestSubmit();
  });
  el('composer').addEventListener('submit', event => {
    event.preventDefault();
    submit(el('message').value.trim(), null, draftPhoto);
  });
  async function openCamera() {
    const request = ++cameraRequest, preview = el('cameraPreview'), start = el('cameraStart'), status = el('cameraStatus');
    if (!API.live || !thread || !['reference', 'podcast-reference'].includes(thread.phase) || !el('photoDialog').open) return;
    start.disabled = true;
    preview.hidden = false;
    status.textContent = 'Waiting for camera permission…';
    try {
      const stream = await Camera.start(preview);
      if (request !== cameraRequest || !el('photoDialog').open) {
        stream.getTracks().forEach(track => track.stop());
        if (request === cameraRequest) start.disabled = false;
        return;
      }
      preview.srcObject = stream;
      preview.hidden = false;
      el('cameraShot').hidden = false;
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (request === cameraRequest && el('photoDialog').open) {
          closeCamera();
          status.textContent = 'The camera disconnected. Reopen it or choose a file.';
        }
      }, { once: true }));
      status.textContent = '';
    } catch (error) {
      if (request !== cameraRequest) return;
      console.error('Kamera açılamadı:', error);
      closeCamera();
      status.textContent = `${uiError(error)} Check browser permissions or choose a file.`;
    }
  }
  async function capturePhoto() {
    const request = cameraRequest;
    el('cameraShot').disabled = true;
    try {
      await Camera.ready(el('cameraPreview'));
      if (request !== cameraRequest || !el('photoDialog').open) return;
      const data = Camera.capture(el('cameraPreview'));
      if (!data) throw new Error('The camera is not ready yet.');
      photoRead++;
      draftPhoto = { name: 'Camera photo.jpg', data };
      closeCamera();
      el('photoDialog').close();
      syncComposer();
    } catch (error) {
      if (request !== cameraRequest) return;
      console.error('Fotoğraf çekilemedi:', error);
      closeCamera();
      el('cameraStatus').textContent = `${uiError(error)} Try again or choose a file.`;
    } finally {
      el('cameraShot').disabled = false;
    }
  }
  function closeCamera() {
    cameraRequest++;
    const preview = el('cameraPreview');
    Camera.stop();
    preview.srcObject = null;
    preview.hidden = true;
    el('cameraStart').disabled = false;
    el('cameraShot').hidden = true;
  }
  el('photoDialog').addEventListener('close', () => { if (!el('photoDialog').open) closeCamera(); });
  el('photoDialog').addEventListener('cancel', closeCamera);
  el('photoInput').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || !API.live || view !== 'chat' || !['reference', 'podcast-reference'].includes(thread.phase)) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      return notice('Choose a JPEG, PNG or WebP file up to 10 MB.');
    }
    const read = ++photoRead;
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      await loadImage(data);
      if (read !== photoRead) return;
      draftPhoto = { name: file.name, data };
      syncComposer();
    } catch (error) {
      console.error('Fotoğraf okunamadı:', error);
      if (read === photoRead) notice('The photo could not be opened. Choose another file.');
    }
  });
  compact.addEventListener('change', () => { sideOpen = !compact.matches; panelOpen = false; renderChrome(); syncSettingsControls(); });
  render();
  try {
    const launch = sessionStorage.getItem('mai-kiosk-launch');
    sessionStorage.removeItem('mai-kiosk-launch');
    const mode = launch ? JSON.parse(launch).mode : FoundrySettings.loadMode();
    if (mode === 'live') {
      settingsDemo = false;
      syncSettingsControls();
      if (localStorage.getItem(FoundrySettings.storageKey)) {
        const { settings, blobSettings } = savedConnection();
        changeConnection(settings, blobSettings);
      } else notice('Enter and save your connection in Settings to enable live generation.');
    } else if (mode === 'mock') {
      changeConnection({ mode: 'mock', apiKey: '' });
    }
  } catch (error) {
    console.error('Açılış bağlantısı aktarılamadı:', error);
    notice('Startup settings could not be loaded. Check the Foundry connection in Settings.');
  }
  el('settings').addEventListener('cancel', event => { event.preventDefault(); closeSettings(); });
  document.querySelectorAll('[data-interface]').forEach(button => button.addEventListener('click', () => {
    try {
      const preference = button.dataset.interface;
      FoundrySettings.saveInterface(preference);
      syncSettingsControls();
      if (embeddedSettings && preference === 'copilot') {
        window.parent.postMessage({ type: 'kiosk-settings-interface', interface: preference }, location.origin);
      } else if (!embeddedSettings && preference === 'kiosk') {
        const destination = new URL('.', document.baseURI);
        destination.searchParams.set('settings', 'open');
        location.assign(destination.href);
      } else settingsFeedback('Preferred interface saved.');
    } catch (error) {
      console.error('Interface preference could not be saved:', error);
      settingsFeedback('Interface preference could not be saved. Check browser storage permissions.', true);
    }
  }));
  if (embeddedSamples) {
    openLibrary();
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        window.parent.postMessage({ type: 'kiosk-samples-close' }, location.origin);
      }
    });
  } else showSettings(embeddedSettings && new URLSearchParams(location.search).get('tab') === 'connections' ? 'connections' : 'general');
})();
