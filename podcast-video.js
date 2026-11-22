const PodcastVideo = {
  format() {
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream || !(window.AudioContext || window.webkitAudioContext)) {
      throw new Error('Bu tarayıcı canlı video oluşturmayı desteklemiyor. Güncel Chrome veya Safari kullan. Demo videosunu yine izleyebilirsin.');
    }
    const format = ['video/mp4;codecs=avc1.42001F,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
    if (!format) throw new Error('Bu tarayıcı sesli video kaydı için uygun bir kodek sunmuyor.');
    return format;
  },
  microphone(canvas, level = 0, waveform, era) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const styles = getComputedStyle(document.documentElement);
    const color = name => styles.getPropertyValue(name).trim();
    ctx.fillStyle = color('--cp-bg'); ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w / 2, h * .44, 10, w / 2, h * .44, w * .65);
    glow.addColorStop(0, color('--cp-accent-soft')); glow.addColorStop(1, color('--cp-bg'));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h * .47); ctx.scale(w / 720, w / 720);
    ctx.textAlign = 'center';
    ctx.fillStyle = color('--cp-text'); ctx.font = '600 34px "Segoe UI", sans-serif';
    ctx.fillText('NOSTALJİ PODCAST', 0, -310);
    ctx.fillStyle = color('--cp-text-muted'); ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText('Bir ısırık. Bir frekans. Bin hatıra.', 0, -272);
    ctx.strokeStyle = color('--cp-border'); ctx.lineWidth = 1;
    for (const radius of [195, 220, 245]) {
      ctx.beginPath(); ctx.arc(0, -25, radius, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = color('--cp-accent'); ctx.lineWidth = 2; ctx.globalAlpha = .4;
    ctx.beginPath(); ctx.arc(0, -25, 200 + level * 100, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    const metal = ctx.createLinearGradient(-82, 0, 82, 0);
    metal.addColorStop(0, color('--cp-border-strong'));
    metal.addColorStop(.25, color('--cp-text-soft'));
    metal.addColorStop(.52, color('--cp-surface'));
    metal.addColorStop(.85, color('--cp-text-muted'));
    metal.addColorStop(1, color('--cp-border-strong'));
    ctx.fillStyle = metal; ctx.strokeStyle = color('--cp-text-muted'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-82, -185, 164, 260, 52); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(-62, -164, 124, 218, 38); ctx.clip();
    ctx.fillStyle = color('--cp-bg');
    for (let y = -153; y < 48; y += 16) { ctx.beginPath(); ctx.roundRect(-68, y, 136, 6, 3); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = metal; ctx.beginPath(); ctx.roundRect(-7, -168, 14, 222, 6); ctx.fill();
    ctx.strokeStyle = color('--cp-accent'); ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(-112, -38); ctx.lineTo(-112, 55);
    ctx.bezierCurveTo(-112, 168, 112, 168, 112, 55); ctx.lineTo(112, -38); ctx.stroke();
    ctx.fillStyle = color('--cp-accent');
    for (const x of [-107, 107]) { ctx.beginPath(); ctx.arc(x, -40, 12, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = color('--cp-text-muted'); ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(0, 140); ctx.lineTo(0, 210); ctx.stroke();
    ctx.fillStyle = metal; ctx.beginPath(); ctx.roundRect(-85, 203, 170, 24, 12); ctx.fill();
    ctx.fillStyle = color('--cp-text-soft'); ctx.font = '600 18px "Segoe UI", sans-serif';
    ctx.fillText(era ? (era.start === era.end ? String(era.start) : `${era.start} — ${era.end}`) : 'HATIRA FREKANSI', 0, 274);
    ctx.strokeStyle = color('--cp-accent'); ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= 480; x += 4) {
      const sample = waveform ? waveform[Math.floor(x / 480 * (waveform.length - 1))] : 0;
      const y = 322 + sample * 140;
      if (!x) ctx.moveTo(x - 240, y); else ctx.lineTo(x - 240, y);
    }
    ctx.stroke(); ctx.restore();
  },
  prepare(signal) {
    signal?.throwIfAborted();
    const mimeType = this.format();
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextType();
    let timer, abort;
    const ready = new Promise((resolve, reject) => {
      abort = () => reject(signal.reason);
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => reject(new Error('Video sesi başlatılamadı. Oluştur düğmesine basarak yeniden dene.')), 5000);
      context.resume().then(() => { clearTimeout(timer); signal?.removeEventListener('abort', abort); resolve(); }, reject);
    });
    let disposed = false;
    return {
      context, mimeType, ready,
      async dispose() {
        if (disposed) return;
        disposed = true;
        clearTimeout(timer); signal?.removeEventListener('abort', abort);
        await context.close();
      },
    };
  },
  async render({ introAudio, storyAudio, image, signal, session, music, era }) {
    signal?.throwIfAborted();
    if (document.hidden) throw new Error('Video oluştururken bu sekmeyi açık tut ve yeniden dene.');
    await session.ready;
    if (session.context.state !== 'running') throw new Error('Video sesi başlatılamadı. Yeniden oluştur düğmesine basarak tekrar dene.');
    const decode = async data => {
      const bytes = Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), char => char.charCodeAt(0));
      return session.context.decodeAudioData(bytes.buffer);
    };
    const [intro, story, picture, bed] = await Promise.all([decode(introAudio), decode(storyAudio), loadImage(image), session.context.decodeAudioData(music.slice(0))]);
    signal?.throwIfAborted();
    if (document.hidden) throw new Error('Video oluştururken bu sekmeyi açık tut ve yeniden dene.');
    const context = session.context, gap = Math.round(context.sampleRate * .16);
    const buffer = context.createBuffer(1, intro.length + gap + story.length, context.sampleRate);
    buffer.copyToChannel(intro.getChannelData(0), 0);
    buffer.copyToChannel(story.getChannelData(0), 0, intro.length + gap);
    PodcastMusic.mix(buffer, bed);
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 150) throw new Error('Video için ses süresi geçersiz veya çok uzun.');
    const introDuration = (intro.length + gap) / context.sampleRate;
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 900;
    this.microphone(canvas, 0, undefined, era);
    const videoPoster = canvas.toDataURL('image/png');
    const destination = context.createMediaStreamDestination(), analyser = context.createAnalyser();
    analyser.fftSize = 512;
    const source = context.createBufferSource(); source.buffer = buffer;
    source.connect(analyser); analyser.connect(destination);
    const stream = canvas.captureStream(24);
    destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    const chunks = [], waveform = new Float32Array(analyser.fftSize), drawing = canvas.getContext('2d');
    let recorder, frame, timer, stopTimer, failure, abort, visibility, started = false, completed = false;
    try {
      recorder = new MediaRecorder(stream, { mimeType: session.mimeType, videoBitsPerSecond: 2000000, audioBitsPerSecond: 128000 });
      const video = await new Promise((resolve, reject) => {
        const finish = error => {
          if (completed || failure) return;
          if (error) failure = error; else completed = true;
          if (recorder.state !== 'inactive') recorder.stop();
          else reject(error || new Error('Video kaydı beklenmedik şekilde durdu.'));
        };
        abort = () => finish(signal.reason);
        visibility = () => { if (document.hidden) finish(new Error('Video oluşturulurken sekme arka plana geçti. Sekmeyi açık tutarak yeniden dene.')); };
        signal?.addEventListener('abort', abort, { once: true });
        document.addEventListener('visibilitychange', visibility);
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = event => finish(event.error || new Error('Video kodlama başarısız.'));
        recorder.onstop = () => {
          signal?.removeEventListener('abort', abort);
          document.removeEventListener('visibilitychange', visibility);
          if (failure || !completed) reject(failure || new Error('Video kaydı tamamlanamadı.'));
          else resolve(new Blob(chunks, { type: session.mimeType.split(';')[0] }));
        };
        const startAt = context.currentTime + .12;
        const draw = () => {
          const time = Math.max(0, context.currentTime - startAt);
          analyser.getFloatTimeDomainData(waveform);
          const level = Math.sqrt(waveform.reduce((sum, value) => sum + value * value, 0) / waveform.length);
          this.microphone(canvas, level, waveform, era);
          if (time >= introDuration) {
            drawing.globalAlpha = Math.min(1, (time - introDuration) / .6);
            drawing.drawImage(picture, 0, 0, canvas.width, canvas.height);
            drawing.globalAlpha = 1;
          }
          frame = requestAnimationFrame(draw);
        };
        source.onended = () => { stopTimer = setTimeout(() => finish(), 160); };
        recorder.start(1000);
        source.start(startAt); started = true; draw();
        timer = setTimeout(() => finish(new Error('Video kodlama zaman aşımına uğradı. Yeniden dene.')), (buffer.duration + 10) * 1000);
      });
      await this.validate(video);
      signal?.throwIfAborted();
      return { video, videoPoster, introDuration, videoDuration: buffer.duration };
    } finally {
      clearTimeout(timer); clearTimeout(stopTimer); cancelAnimationFrame(frame);
      signal?.removeEventListener('abort', abort);
      document.removeEventListener('visibilitychange', visibility);
      source.onended = null; if (started) source.stop(); source.disconnect(); analyser.disconnect();
      stream.getTracks().forEach(track => track.stop());
      if (recorder?.state !== 'inactive') recorder?.stop();
    }
  },
  async validate(blob) {
    const bytes = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
    const mp4 = blob.type.startsWith('video/mp4') && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
    const webm = blob.type.startsWith('video/webm') && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    if (blob.size < 1024 || !(mp4 || webm)) throw new Error('Geçerli, sesli bir video oluşturulamadı.');
    return blob;
  },
};
