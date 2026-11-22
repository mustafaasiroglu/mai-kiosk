(() => {
  'use strict';

  const el = id => document.getElementById(id);
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
  };
  const svg = (name, cls = '') => `<svg ${cls ? `class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = svg(node.dataset.icon); });

  const agents = [
    { id: 'photo', name: 'Fotoğraf Stüdyosu', description: 'Nasıl bir yıldız olduğunu keşfet, temanı seç ve poz ver.', prompt: 'Bir Ülker portresi hazırlayalım' },
    { id: 'lab', name: 'Lezzet Laboratuvarı', description: 'Yeni bir Ülker lezzeti tasarla; adını, sloganını ve ambalajını oluştur.', prompt: 'Yeni bir atıştırmalık tasarlayalım' },
    { id: 'podcast', name: EXPS.podcast.name, description: EXPS.podcast.desc, prompt: 'Bir ısırıkla o yıla dönelim' },
  ];
  const compact = matchMedia('(max-width: 780px)');
  const threads = [];
  let thread = null, mode = new URLSearchParams(location.search).get('ui') === 'chat' ? 'chat' : 'cowork', view = 'catalog', sideOpen = !compact.matches, panelOpen = false;
  let draftPhoto = null, photoRead = 0, cameraRequest = 0, noticeTimer;
  const modeName = value => value === 'cowork' ? 'Cowork' : 'Chat';
  const badge = (agent, small = false) => `<span class="agent-badge${small ? ' small' : ''}">${svg(agent.id)}</span>`;
  const action = (name, label, cls = 'pill') => `<button type="button" class="${cls}" data-action="${name}">${label}</button>`;
  const normalize = value => trLow(value).normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ı', 'i').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const matchOptions = (items, text) => {
    const haystack = ` ${normalize(text)} `;
    return items.filter(item => [item.id, item.name].some(value => haystack.includes(` ${normalize(value)} `)));
  };
  const add = (t, entry) => t.messages.push(entry);
  const say = (t, text, extra = {}) => add(t, { type: 'answer', text, ...extra });
  const ask = (t, phase, text, options = [], extra = {}) => {
    t.phase = phase;
    say(t, text, { options, ...extra });
  };

  function renderCards() {
    const filter = normalize(el('catalogInput').value);
    const found = agents.filter(a => normalize(`${a.name} ${a.description}`).includes(filter));
    el('catalogCount').textContent = found.length;
    el('cards').innerHTML = found.length ? found.map(a =>
      `<button type="button" class="agent-card" data-agent="${a.id}">${badge(a)}<strong>${a.name}</strong><p>${a.description}</p><span class="card-action">Sohbeti başlat ${svg('arrow')}</span></button>`
    ).join('') : '<p class="muted">Eşleşen agent bulunamadı.</p>';
  }

  el('catalog').innerHTML = `<div class="catalog-inner">
    <p class="eyebrow">${svg('sparkle')}<span id="catalogMode"></span></p>
    <h1>Agent’lar</h1><p class="intro">Bir agent seç ve Yıldız Holding deneyimine Copilot ile başla.</p>
    <label class="catalog-search">${svg('search')}<input type="search" id="catalogInput" aria-label="Agent ara" placeholder="Agent ara"></label>
    <h2 class="section-title">Kullanılabilir (<span id="catalogCount"></span>)</h2><div class="cards" id="cards"></div>
  </div>`;
  el('catalogInput').addEventListener('input', renderCards);
  renderCards();

  function threadRows(list) {
    return list.map(t => `<button type="button" class="nav-row" data-thread="${t.id}" ${t === thread && view === 'chat' ? 'aria-current="page"' : ''}>${badge(t.agent, true)}<span class="truncate">${esc(t.title)}</span></button>`).join('');
  }

  function renderChrome() {
    const active = view === 'chat';
    el('sidebar').hidden = !sideOpen;
    el('openSidebar').hidden = sideOpen;
    el('catalog').hidden = active;
    el('conversation').hidden = !active;
    el('workspaceButton').hidden = !active;
    el('workspaceButton').setAttribute('aria-expanded', String(active && panelOpen));
    el('workspace').hidden = !(active && panelOpen);
    el('topTitle').textContent = active ? thread.title : 'Copilot';
    el('modeBadge').textContent = 'Demo Modu';
    el('modeBadge').hidden = API.live;
    el('catalogMode').textContent = `Copilot ${modeName(mode)}`;
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    const agentsNav = document.querySelector('[data-action="agents"]');
    if (active) agentsNav.removeAttribute('aria-current');
    else agentsNav.setAttribute('aria-current', 'page');
    el('pinned').innerHTML = agents.map(a => `<button type="button" class="nav-row" data-agent="${a.id}">${badge(a, true)}<span class="truncate">${a.name}</span></button>`).join('');
    el('recent').innerHTML = threadRows(threads.filter(t => t.messages.length).slice(0, 12)) || '<p class="side-empty">Henüz sohbet yok</p>';
  }

  function artifactHTML(result, revision = false) {
    return `<figure class="artifact">
      ${result.podcast ? '' : `<img src="${esc(result.image)}" alt="${esc(result.title)}">`}
      <figcaption>${result.podcast ? podcastOutputHTML(result.podcast) : `<strong>${esc(result.title)}</strong>${result.slogan ? `<p>${esc(result.slogan)}</p>` : ''}${result.story ? `<p class="muted">${esc(result.story)}</p>` : ''}`}</figcaption>
      ${result.podcast ? '' : `<a class="artifact-action" href="${esc(result.image)}" download="${result.file}">${svg('download')} Görseli indir</a>`}
      ${revision ? `<div class="pills"><button type="button" class="pill" data-action="revise"${result.canRevise ? '' : ' disabled'}>${svg('edit')} Revizyon İste</button></div>${result.canRevise ? '' : '<p class="muted">Revizyon için Demo Modunu kapatman gerekir.</p>'}` : ''}
    </figure>`;
  }

  function timeline(job) {
    return `<ul class="timeline">${job.steps.map((step, i) => {
      const icon = i < job.step ? 'check' : job.status === 'running' && i === job.step ? 'loading' : 'circle';
      return `<li>${svg(icon, icon === 'loading' ? 'spinner' : '')}<span>${step}</span></li>`;
    }).join('')}</ul>`;
  }
  const jobLabel = job => ({
    running: job.steps[job.step], complete: 'İşlem tamamlandı', stopped: 'İşlem durduruldu', error: 'İşlem tamamlanamadı',
  })[job.status];

  function renderMessage(t, entry, i) {
    if (entry.type === 'user') return `<div class="user-turn">${esc(entry.text)}</div>`;
    if (entry.type === 'job') {
      const j = entry.job;
      return `<div class="answer"><details data-job="${i}" ${j.expanded ?? j.status !== 'complete' ? 'open' : ''}>
        <summary>${jobLabel(j)}</summary>${timeline(j)}</details></div>`;
    }
    const current = i === t.messages.length - 1;
    const options = current ? (entry.options || []).map((o, index) =>
      `<button type="button" class="pill choice-option${t.agent.id === 'podcast' ? ' podcast-choice' : ''}" data-choice="${index}"><span class="choice-visual">${t.agent.id === 'podcast' ? podcastOptionArt(o) : svg(t.agent.id === 'photo' ? 'sparkle' : 'lab')}</span><span>${esc(o.name)}</span></button>`
    ).join('') : '';
    const approval = entry.approval ? `<div class="approval">
      <strong>${current ? 'Onay gerekiyor' : 'Üretim planı'}</strong><p>${esc(entry.approval)}</p>
      ${current ? `<div class="pills">${action('cancelPlan', 'İptal')}${action('approve', 'Onayla ve başlat', 'primary')}</div>` : ''}
    </div>` : '';
    return `<div class="answer${options ? ' choice-answer' : ''}">
      <div class="answer-header">${badge(t.agent, true)}${t.agent.name}</div>
      <p class="answer-text">${esc(entry.text)}</p>
      ${approval}${options ? `<div class="pills">${options}</div>` : ''}${entry.result ? artifactHTML(entry.result, t.agent.id === 'lab' && entry.result === t.result && t.phase === 'finished' && !t.job) : ''}
    </div>`;
  }

  function renderWorkspace(t) {
    const jobs = t.messages.filter(entry => entry.type === 'job');
    const job = jobs.at(-1)?.job;
    const outputs = t.messages.filter(entry => entry.result).map(entry => entry.result).reverse();
    const players = [...el('messages').querySelectorAll('.podcast-output video')];
    const videoSources = new Map(t.messages.filter(entry => entry.result?.podcast).map((entry, index) => [entry.result.podcast, players[index]?.src]));
    el('workspaceBody').innerHTML = `<section><h3>Agent</h3><p class="answer-header">${badge(t.agent, true)}${t.agent.name}</p><p class="muted">${t.agent.description}</p></section>
      <section><h3>Etkinlik</h3>${job ? `<p>${jobLabel(job)}</p>${timeline(job)}` : '<p class="muted">Üretim başladığında adımlar burada görünür.</p>'}</section>
      <section><h3>Çıktılar</h3>${outputs.length ? outputs.map(r => `<p><a class="artifact-action" href="${esc(r.podcast ? videoSources.get(r.podcast) : r.image)}" download="${r.podcast ? `ani-videosu.${r.podcast.video.type.startsWith('video/mp4') ? 'mp4' : 'webm'}` : r.file}">${svg('download')} ${esc(r.title)}${r.podcast ? ' · Video' : ''}</a></p>`).join('') : '<p class="muted">Henüz çıktı yok.</p>'}</section>`;
  }

  function syncComposer() {
    if (!thread || view !== 'chat') return;
    const working = !!thread.job;
    el('message').placeholder = working ? 'Agent çalışıyor…' : thread.phase === 'lab-revision' ? 'Ambalajda neyi değiştirelim?' : `${thread.agent.name} ile sohbet et`;
    el('message').readOnly = working;
    el('send').hidden = working;
    el('send').disabled = !el('message').value.trim() && !draftPhoto;
    el('stop').hidden = !working;
    el('podcastBack').hidden = working || thread.phase !== 'podcast-other';
    el('attachButton').hidden = !(API.live && thread.phase === 'reference' && !working);
    el('composerMode').textContent = modeName(mode);
    el('attachment').innerHTML = draftPhoto ? `<span class="pill">${svg('file')}${esc(draftPhoto.name)} ${action('removeAttachment', svg('close'), 'icon-btn')}</span>` : '';
    el('attachment').querySelector('button')?.setAttribute('aria-label', 'Fotoğrafı kaldır');
  }

  function render({ scroll = false, focus = false } = {}) {
    renderChrome();
    if (view !== 'chat') return;
    const t = thread, log = el('messages'), previousBottom = el('scroll').scrollTop;
    disposePodcastMedia(log);
    log.innerHTML = t.messages.length ? t.messages.map((entry, i) => renderMessage(t, entry, i)).join('') : `<div class="welcome">
      ${badge(t.agent)}<h1>${t.agent.name}</h1><p class="intro">${t.agent.description}</p>
      <div class="pills">${action('start', `${svg('sparkle')} ${t.agent.prompt}`)}</div></div>`;
    const podcasts = t.messages.filter(entry => entry.result?.podcast).map(entry => entry.result.podcast);
    log.querySelectorAll('.podcast-output').forEach((root, index) => mountPodcastMedia(root, null, podcasts[index]));
    syncComposer();
    renderWorkspace(t);
    const pane = el('scroll');
    pane.scrollTop = scroll ? pane.scrollHeight : previousBottom;
    if (focus) el('message').focus({ preventScroll: true });
  }

  function clearDraft() {
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
        if (choice?.id === 'camera' || normalize(text) === 'kamerayi ac') {
          if (!API.live) return ask(t, 'reference', 'Demo Modu kamerayı açmaz; örnek fotoğrafla devam et.', referenceOptions());
          ask(t, 'reference', 'Fotoğrafını çekip Gönder düğmesine bas. Üretim ancak son onayından sonra başlayacak.', referenceOptions());
          el('photoDialog').showModal();
          openCamera();
          break;
        }
        if (choice?.id === 'upload' || normalize(text) === 'fotograf yukle') {
          if (!API.live) return ask(t, 'reference', 'Demo Modu kayıtlı örnek fotoğrafı kullanır.', referenceOptions());
          ask(t, 'reference', 'Bir fotoğraf seçip Gönder düğmesine bas. Fotoğraf henüz Foundry’ye gönderilmeyecek.', referenceOptions());
          el('photoInput').click();
          break;
        }
        if (photo) v.photo = photo.data;
        else if (choice?.id === 'sample' || normalize(text) === 'ornek fotografi kullan') v.photo = null;
        else return ask(t, 'reference', 'Henüz bir fotoğraf eklenmedi. Kamera, dosya veya örnek fotoğraf seçeneklerinden birini kullan.', referenceOptions());
        if (API.live) prepare(t, `${v.theme.name} · ${v.product.name}`, 'Referans fotoğraf Microsoft Foundry’ye gönderilecek. Yalnızca kullanma iznin olan bir fotoğrafla devam et.', true);
        else {
          const sample = sampleFor(`photo-${v.theme.id}`);
          prepare(t, `${v.theme.name} · ${sample.product}`, `Seçtiğin lezzet ruhu ${v.product.name}. Demo kişiselleştirme yapmaz: bu temanın ${sample.product} ile kayıtlı portresini getireceğim. Kamera açılmayacak ve yeni görsel üretilmeyecek.`);
        }
        break;
      case 'podcast-product': {
        const product = choice || matchOptions(PODCAST_PRODUCTS, text)[0];
        if (!product) return ask(t, 'podcast-product', 'Bir Ülker ürünü seç.', PODCAST_PRODUCTS);
        v.product = product;
        ask(t, 'podcast-era', 'Hangi yıla dönelim? Bir dönem veya özel bir tarih seç.', PODCAST_ERAS);
        break;
      }
      case 'podcast-era': {
        const era = choice || matchOptions(PODCAST_ERAS, text)[0];
        if (!era) return ask(t, 'podcast-era', 'Bir dönem seç. Belirli bir yıl için Özel bir tarih seçeneğini kullan.', PODCAST_ERAS);
        v.era = era;
        if (era.id === 'custom') ask(t, 'podcast-date', 'Yıl veya özel tarihi 2004 veya 23.04.2004 biçiminde yaz.');
        else ask(t, 'podcast-moment', 'O an neredeydin?', PODCAST_MOMENTS);
        break;
      }
      case 'podcast-date':
        try { v.era = podcastDate(text); }
        catch (error) { return ask(t, 'podcast-date', error.message); }
        ask(t, 'podcast-moment', 'O an neredeydin?', PODCAST_MOMENTS);
        break;
      case 'podcast-moment': {
        const moment = choice || matchOptions(PODCAST_MOMENTS, text)[0];
        if (!moment) return ask(t, 'podcast-moment', 'Bir an seç.', PODCAST_MOMENTS);
        v.moment = moment;
        if (moment.id === 'other') ask(t, 'podcast-other', 'O anı kısaca nasıl adlandıralım?');
        else ask(t, 'podcast-memory', 'Anını tek cümleyle anlat. Hassas kişisel bilgi yazma.');
        break;
      }
      case 'podcast-other':
        try { v.moment = { id: 'other', name: podcastText(text, 'Anın', 80) }; }
        catch (error) { return ask(t, 'podcast-other', error.message); }
        ask(t, 'podcast-memory', 'Anını tek cümleyle anlat. Hassas kişisel bilgi yazma.');
        break;
      case 'podcast-memory':
        v.memory = text;
        try { validatePodcastInput(v); }
        catch (error) { return ask(t, 'podcast-memory', error.message); }
        prepare(t, `${v.product.name} · ${v.era.name} · ${v.moment.name}`, API.live
          ? 'WebIQ yalnızca dönemi ve genel an türünü araştıracak. Anın Foundry’de özgün bir radyo hikâyesi ve illüstrasyona dönüşecek; kaynaklı bilgilerle hayal edilen sahne ayrı gösterilip ayrı okunacak.'
          : 'Demo, yeni araştırma veya üretim yapmadan kayıtlı örnek illüstrasyonu ve sesli anıyı gösterecek.', API.live);
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
    if (!t || t.job || (!text && !photo)) return;
    clearDraft();
    if (!t.messages.length && text) t.title = /\p{L}/u.test(text) ? text.slice(0, 80) : t.agent.name;
    add(t, { type: 'user', text: [text, photo ? `Ek: ${photo.name}` : ''].filter(Boolean).join('\n') });
    readInput(t, text, choice, photo);
    render({ scroll: true, focus: !compact.matches });
  }

  async function run(t) {
    if (t.job) return;
    const controller = new AbortController(), { signal } = controller, v = t.values;
    const live = API.live, opts = { fast: true, signal };
    const revision = t.revision;
    const steps = revision ? ['Revizyon isteğini değerlendir', 'Mevcut ambalajı düzenle', 'Revizyonu sohbete ekle'] : live ? ({
      photo: ['Referansları hazırla ve portreyi üret', 'Portreyi sohbete ekle'],
      podcast: [...PODCAST_STAGES, 'Anı videosunu sohbete ekle'],
      lab: ['Ürün adı, sloganı ve hikâyeyi yaz', 'Ambalajı oluştur', 'Konsepti sohbete ekle'],
    })[t.agent.id] : t.agent.id === 'podcast' ? ['Kayıtlı illüstrasyonu getir', 'Kayıtlı sesli anıyı getir', 'Çıktıyı sohbete ekle'] : ['Kayıtlı demo çıktısını getir', 'Çıktıyı sohbete ekle'];
    const job = { steps, status: 'running', step: 0, controller };
    t.phase = 'running';
    t.job = job;
    add(t, { type: 'job', job });
    if (thread === t && view === 'chat' && t.mode === 'cowork' && !compact.matches) panelOpen = true;
    const update = () => { if (thread === t && view === 'chat') render({ scroll: true }); };
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
      } else if (t.agent.id === 'podcast') {
        podcast = await API.podcast.generate(v, { ...opts, onStage: index => { signal.throwIfAborted(); job.step = index; update(); } });
        ({ image, title } = podcast);
      } else {
        if (revision) {
          ({ concept, img: image } = await API.lab.revise(revision, { ...opts, onCopy: advance }));
        } else {
          concept = await API.lab.concept({ ...v, variation }, opts);
          if (live) advance();
          image = await API.lab.packaging(concept, opts);
        }
        ({ name: title, story, slogan } = concept);
      }
      advance();
      job.step++;
      job.status = 'complete';
      t.result = { image, title, story, slogan, concept, podcast, canRevise: t.agent.id === 'lab' && live, file: `copilot-${t.agent.id}.jpg` };
      t.revision = null;
      say(t, revision ? 'Revizyonun hazır. Önceki tasarımın da sohbette duruyor.' : podcast ? (live ? 'Radyo anı videon hazır. Buradan izleyebilir ve indirebilirsin.' : 'Kayıtlı demo videosu hazır. Bu işlemde yeni bir video üretilmedi.') : live ? 'Çıktın hazır. Görseli buradan indirebilirsin.' : 'Kayıtlı demo çıktısı hazır. Bu işlemde yeni bir görsel üretilmedi.', {
        result: t.result,
        options: live ? followups : [followups[0]],
      });
    } catch (error) {
      job.status = signal.aborted ? 'stopped' : 'error';
      if (!signal.aborted) console.error('Copilot üretimi başarısız:', error);
      say(t, signal.aborted ? 'İşlem durduruldu. İstersen yeniden deneyebilir veya seçimleri değiştirebilirsin.' : error.message, { options: followups });
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
    el('searchResults').innerHTML = threadRows(found) || '<p class="muted">Eşleşen sohbet yok.</p>';
  }

  async function showSettings() {
    const dialog = el('settings'), form = el('connection'), status = el('settingsStatus');
    dialog.showModal();
    form.inert = true;
    status.textContent = 'Ortak bağlantı ayarları okunuyor…';
    try {
      FoundrySettings.loadSaved(form);
      const selectedVoice = form.elements.voice.value;
      await FoundrySettings.loadLocal(form);
      form.elements.voice.value = selectedVoice;
      status.textContent = '';
    } catch (error) {
      console.error('Yerel ayarlar okunamadı:', error);
      status.textContent = 'Yerel ayarlar okunamadı. Bilgileri elle girebilirsin.';
    } finally { form.inert = false; }
  }

  function changeConnection(settings) {
    if (threads.some(t => t.job)) return notice('Modu değiştirmek için devam eden işlemleri bitir veya durdur.');
    if (settings.mode === 'live') {
      try { FoundrySettings.save(settings); }
      catch (error) {
        console.error('Bağlantı ayarları kaydedilemedi:', error);
        el('settingsStatus').textContent = 'Ortak ayarlar kaydedilemedi. Tarayıcı depolama izinlerini kontrol et.';
        return;
      }
    }
    FoundrySettings.apply(settings);
    renderCards();
    for (const t of threads) t.values.photo = null;
    threads.length = 0;
    thread = null;
    el('settings').close();
    openCatalog();
    notice(API.live ? 'Foundry bağlantısı hazır.' : 'Demo modu açıldı.');
  }

  document.addEventListener('click', async event => {
    const target = event.target.closest('button');
    if (!target) return;
    const { agent, mode: selectedMode, thread: threadId, choice, action: command } = target.dataset;
    if (agent) return newThread(byId(agents, agent));
    if (selectedMode) {
      mode = selectedMode;
      if (view === 'chat') thread.mode = mode;
      renderChrome();
      syncComposer();
      return;
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
      case 'agents': return openCatalog();
      case 'new': return view === 'chat' ? newThread(thread.agent) : openCatalog(true);
      case 'sidebar': sideOpen = !sideOpen; return renderChrome();
      case 'workspace': panelOpen = !panelOpen; return renderChrome();
      case 'start': return submit(thread.agent.prompt);
      case 'revise':
        if (thread.job || thread.phase !== 'finished' || !thread.result?.canRevise) return;
        thread.revision = null;
        ask(thread, 'lab-revision', 'Mevcut tasarımında neyi değiştirelim? İsteğini yaz; önceki görseli referans alacağım.', [{ id: 'cancel-revision', name: 'Vazgeç' }]);
        return render({ scroll: true, focus: true });
      case 'approve':
      case 'cancelPlan':
        if (thread.phase !== 'approval') return;
        add(thread, { type: 'user', text: command === 'approve' ? 'Onayla ve başlat' : 'İptal' });
        if (command === 'approve') return run(thread);
        thread.phase = 'finished'; thread.revision = null;
        say(thread, 'Plan iptal edildi. Üretim başlatılmadı.', { options: followups });
        return render({ scroll: true, focus: !compact.matches });
      case 'stop': return thread.job?.controller.abort();
      case 'podcastBack':
        if (thread?.phase !== 'podcast-other') return;
        clearDraft();
        thread.values.moment = null;
        ask(thread, 'podcast-moment', 'O an neredeydin?', PODCAST_MOMENTS);
        return render({ scroll: true, focus: false });
      case 'attach':
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
      case 'closeSettings': return el('settings').close();
      case 'demo':
        if (!API.live) { el('settings').close(); return; }
        return changeConnection({ mode: 'mock', apiKey: '' });
      case 'fullscreen':
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
        } catch (error) {
          console.error('Tam ekran açılamadı:', error);
          el('settingsStatus').textContent = 'Tarayıcı tam ekrana geçişe izin vermedi.';
        }
        break;
    }
  });

  el('messages').addEventListener('toggle', event => {
    const node = event.target;
    if (!node.isConnected || !node.matches('details[data-job]')) return;
    const job = thread.messages[Number(node.dataset.job)]?.job;
    if (job) job.expanded = node.open;
  }, true);
  el('searchInput').addEventListener('input', renderSearch);
  el('connection').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const endpoint = data.get('endpoint').trim().match(/^(https:\/\/[a-z0-9][a-z0-9-]*\.services\.ai\.azure\.com)(?:\/mai\/v1(?:\/images\/(?:generations|edits))?)?\/?$/i);
    const apiKey = data.get('key').trim(), imageDeployment = data.get('imageModel').trim();
    if (!endpoint || !apiKey || !imageDeployment) {
      el('settingsStatus').textContent = 'Geçerli bir HTTPS Foundry uç noktası, API anahtarı ve görsel dağıtımı gir.';
      return;
    }
    let speechVoice;
    try { speechVoice = FoundrySettings.voice(data.get('voice')); }
    catch (error) { el('settingsStatus').textContent = error.message; return; }
    changeConnection({ mode: 'live', endpoint: endpoint[1], apiKey, imageDeployment, labDeployment: data.get('labModel').trim(), speechVoice });
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
    if (!API.live || !thread || thread.phase !== 'reference' || !el('photoDialog').open) return;
    start.disabled = true;
    preview.hidden = false;
    status.textContent = 'Kamera izni bekleniyor…';
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
          status.textContent = 'Kamera bağlantısı kesildi. Tekrar açabilir veya bir dosya seçebilirsin.';
        }
      }, { once: true }));
      status.textContent = '';
    } catch (error) {
      if (request !== cameraRequest) return;
      console.error('Kamera açılamadı:', error);
      closeCamera();
      status.textContent = `${error.message} Tarayıcı izinlerini kontrol et veya bir dosya seç.`;
    }
  }
  async function capturePhoto() {
    const request = cameraRequest;
    el('cameraShot').disabled = true;
    try {
      await Camera.ready(el('cameraPreview'));
      if (request !== cameraRequest || !el('photoDialog').open) return;
      const data = Camera.capture(el('cameraPreview'));
      if (!data) throw new Error('Kamera henüz hazır değil.');
      photoRead++;
      draftPhoto = { name: 'Kamera fotoğrafı.jpg', data };
      closeCamera();
      el('photoDialog').close();
      syncComposer();
    } catch (error) {
      if (request !== cameraRequest) return;
      console.error('Fotoğraf çekilemedi:', error);
      closeCamera();
      el('cameraStatus').textContent = `${error.message} Tekrar dene veya bir dosya seç.`;
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
    if (!file || !API.live || view !== 'chat' || thread.phase !== 'reference') return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      return notice('En fazla 10 MB boyutunda bir JPEG, PNG veya WebP seç.');
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
      if (read === photoRead) notice('Fotoğraf açılamadı. Başka bir dosya seç.');
    }
  });
  compact.addEventListener('change', () => { sideOpen = !compact.matches; panelOpen = false; renderChrome(); });
  render();
  try {
    const launch = sessionStorage.getItem('mai-kiosk-launch');
    sessionStorage.removeItem('mai-kiosk-launch');
    if (launch && JSON.parse(launch).mode === 'live') {
      el('settings').showModal();
      el('settingsStatus').textContent = 'Foundry bağlantını kontrol et.';
      FoundrySettings.loadSaved(el('connection'));
      el('connection').requestSubmit();
    }
  } catch (error) {
    console.error('Açılış bağlantısı aktarılamadı:', error);
    notice('Açılış bağlantısı okunamadı. Foundry bağlantısını Ayarlar menüsünden kontrol et.');
  }
})();
