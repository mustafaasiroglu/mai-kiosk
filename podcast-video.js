const PodcastVideo = {
  format() {
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream || !(window.AudioContext || window.webkitAudioContext)) {
      throw new Error('Bu tarayıcı canlı video oluşturmayı desteklemiyor. Güncel Chrome veya Safari kullan. Demo videosunu yine izleyebilirsin.');
    }
    const format = ['video/mp4;codecs=avc1.42001F,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
    if (!format) throw new Error('Bu tarayıcı sesli video kaydı için uygun bir kodek sunmuyor.');
    return format;
  },
  microphone(canvas, level = 0, waveform) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const styles = getComputedStyle(document.documentElement);
    const color = name => styles.getPropertyValue(name).trim();
    ctx.fillStyle = color('--cp-bg'); ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(w / 720, w / 720);
    ctx.strokeStyle = color('--cp-accent'); ctx.lineWidth = 4;
    ctx.globalAlpha = .35;
    ctx.beginPath(); ctx.arc(0, -20, 150 + level * 100, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color('--cp-surface');
    ctx.beginPath(); ctx.roundRect(-65, -145, 130, 220, 60); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    for (let y = -110; y < 45; y += 20) { ctx.moveTo(-35, y); ctx.lineTo(35, y); }
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-95, -15); ctx.lineTo(-95, 30);
    ctx.bezierCurveTo(-95, 150, 95, 150, 95, 30); ctx.lineTo(95, -15);
    ctx.moveTo(0, 120); ctx.lineTo(0, 170); ctx.moveTo(-60, 170); ctx.lineTo(60, 170); ctx.stroke();
    ctx.beginPath();
    for (let x = 0; x <= 420; x += 4) {
      const sample = waveform ? waveform[Math.floor(x / 420 * (waveform.length - 1))] : 0;
      const y = 235 + sample * 100;
      if (!x) ctx.moveTo(x - 210, y); else ctx.lineTo(x - 210, y);
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
  async render({ introAudio, storyAudio, image, signal, session }) {
    signal?.throwIfAborted();
    if (document.hidden) throw new Error('Video oluştururken bu sekmeyi açık tut ve yeniden dene.');
    await session.ready;
    if (session.context.state !== 'running') throw new Error('Video sesi başlatılamadı. Yeniden oluştur düğmesine basarak tekrar dene.');
    const decode = async data => {
      const bytes = Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), char => char.charCodeAt(0));
      return session.context.decodeAudioData(bytes.buffer);
    };
    const [intro, story, picture] = await Promise.all([decode(introAudio), decode(storyAudio), loadImage(image)]);
    signal?.throwIfAborted();
    if (document.hidden) throw new Error('Video oluştururken bu sekmeyi açık tut ve yeniden dene.');
    const context = session.context, gap = Math.round(context.sampleRate * .16);
    const buffer = context.createBuffer(1, intro.length + gap + story.length, context.sampleRate);
    buffer.copyToChannel(intro.getChannelData(0), 0);
    buffer.copyToChannel(story.getChannelData(0), 0, intro.length + gap);
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 150) throw new Error('Video için ses süresi geçersiz veya çok uzun.');
    const introDuration = (intro.length + gap) / context.sampleRate;
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 900;
    this.microphone(canvas);
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
          this.microphone(canvas, level, waveform);
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
