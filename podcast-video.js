const PodcastVideo = {
  format() {
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream || !(window.AudioContext || window.webkitAudioContext)) {
      throw new Error('Bu tarayıcı canlı video oluşturmayı desteklemiyor. Güncel Chrome veya Safari kullan. Demo videosunu yine izleyebilirsin.');
    }
    const format = ['video/mp4;codecs=avc1.42001F,mp4a.40.2', 'video/webm;codecs=vp8,opus', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
    if (!format) throw new Error('Bu tarayıcı sesli video kaydı için uygun bir kodek sunmuyor.');
    return format;
  },
  drawFrame(canvas, picture, time, grain) {
    const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const zoom = reduced ? 1 : 1.025 + Math.sin(time * .08) * .012;
    const x = reduced ? 0 : Math.sin(time * 13) * 1.2, y = reduced ? 0 : Math.cos(time * 17) * .8;
    g.save(); g.filter = 'sepia(.85) saturate(.45) contrast(.95)';
    g.drawImage(picture, (w - w * zoom) / 2 + x, (h - h * zoom) / 2 + y, w * zoom, h * zoom);
    g.filter = 'none';
    if (grain) {
      const tick = Math.floor(time * 8);
      if (grain.tick !== tick) {
        grain.tick = tick;
        const noise = grain.getContext('2d'), pixels = noise.createImageData(grain.width, grain.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const value = Math.floor(Math.random() * 256);
          pixels.data[i] = value; pixels.data[i + 1] = value; pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
        }
        noise.putImageData(pixels, 0, 0);
      }
      g.globalAlpha = .035; g.drawImage(grain, 0, 0, w, h);
    }
    g.restore();
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
  async render({ scenes, signal, session, music }) {
    signal?.throwIfAborted();
    if (!Array.isArray(scenes) || scenes.length !== 3 || scenes.some((scene, index) => scene.kind !== ['context', 'memory', 'ending'][index] || !scene.audio || !scene.image)) throw new Error('Video üç sıralı sahne, görsel ve ses içermeli.');
    if (document.hidden) throw new Error('Video oluştururken bu sekmeyi açık tut ve yeniden dene.');
    await session.ready;
    if (session.context.state !== 'running') throw new Error('Video sesi başlatılamadı. Yeniden oluştur düğmesine basarak tekrar dene.');
    const decode = async data => {
      const bytes = Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), char => char.charCodeAt(0));
      return session.context.decodeAudioData(bytes.buffer);
    };
    const [audio, pictures, bed] = await Promise.all([
      Promise.all(scenes.map(scene => decode(scene.audio))), Promise.all(scenes.map(scene => loadImage(scene.image))), session.context.decodeAudioData(music.slice(0)),
    ]);
    signal?.throwIfAborted();
    if (document.hidden) throw new Error('Video oluştururken bu sekmeyi açık tut ve yeniden dene.');
    const context = session.context, gap = Math.round(context.sampleRate * .16);
    const buffer = context.createBuffer(1, audio.reduce((sum, clip) => sum + clip.length, 0) + gap * 2, context.sampleRate);
    const starts = [];
    let offset = 0;
    for (const [index, clip] of audio.entries()) {
      starts.push(offset / context.sampleRate); buffer.copyToChannel(clip.getChannelData(0), 0, offset);
      offset += clip.length + (index < 2 ? gap : 0);
    }
    PodcastMusic.mix(buffer, bed);
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0 || buffer.duration > 180) throw new Error('Video için ses süresi geçersiz veya çok uzun.');
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 900;
    const grain = document.createElement('canvas'); grain.width = 144; grain.height = 180;
    this.drawFrame(canvas, pictures[0], 0);
    const videoPoster = canvas.toDataURL('image/png');
    const destination = context.createMediaStreamDestination();
    const source = context.createBufferSource(); source.buffer = buffer;
    source.connect(destination);
    const stream = canvas.captureStream(24);
    destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    const chunks = [];
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
          const index = time >= starts[2] ? 2 : time >= starts[1] ? 1 : 0;
          this.drawFrame(canvas, pictures[index], time, grain);
          frame = requestAnimationFrame(draw);
        };
        source.onended = () => { stopTimer = setTimeout(() => finish(), 160); };
        recorder.start(1000);
        source.start(startAt); started = true; draw();
        timer = setTimeout(() => finish(new Error('Video kodlama zaman aşımına uğradı. Yeniden dene.')), (buffer.duration + 10) * 1000);
      });
      await this.validate(video);
      signal?.throwIfAborted();
      return { video, videoPoster, sceneStartTimes: starts, videoDuration: buffer.duration };
    } finally {
      clearTimeout(timer); clearTimeout(stopTimer); cancelAnimationFrame(frame);
      signal?.removeEventListener('abort', abort);
      document.removeEventListener('visibilitychange', visibility);
      source.onended = null; if (started) source.stop(); source.disconnect();
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
