const PodcastMusic = {
  decade(era) {
    const year = era?.start;
    if (!Number.isInteger(year) || year < 1944 || year > new Date().getFullYear()) throw new Error('Fon müziği için geçerli bir dönem seç.');
    return Math.floor(year / 10) * 10;
  },
  async load(era, signal) {
    signal?.throwIfAborted();
    const decade = this.decade(era);
    const response = await fetch(`assets/podcast-music/${decade}.wav`, { signal, cache: 'no-cache' });
    if (!response.ok) throw new Error(`Dönem melodisi yüklenemedi (HTTP ${response.status}).`);
    const bytes = await response.arrayBuffer();
    signal?.throwIfAborted();
    const header = new Uint8Array(bytes);
    if (header.length < 44 || String.fromCharCode(...header.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...header.slice(8, 12)) !== 'WAVE') throw new Error('Dönem melodisi geçerli bir ses dosyası değil.');
    return bytes;
  },
  mix(buffer, music) {
    const speech = buffer.getChannelData(0), bed = music.getChannelData(0);
    let envelope = 0;
    for (let i = 0; i < speech.length; i++) {
      const time = i / buffer.sampleRate;
      const fade = Math.min(1, time / 1.4, (buffer.duration - time) / 2);
      envelope = envelope * .995 + Math.abs(speech[i]) * .005;
      const sample = bed[Math.floor(i * music.sampleRate / buffer.sampleRate) % bed.length];
      speech[i] = Math.max(-1, Math.min(1, speech[i] + sample * .08 * fade / (1 + envelope * 12)));
    }
  },
};
