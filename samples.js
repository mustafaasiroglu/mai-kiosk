const SAMPLE_PHOTO_SOURCE = 'samples/reference.jpg';
const PHOTO_SAMPLE_CASES = [
  { id: 'photo-snowglobe', title: 'Yılbaşı Kar Küresi', product: 'Cocostar', productId: 'cocostar' },
  { id: 'photo-adface', title: 'Reklam Yüzü', product: 'Çikolatalı Gofret', productId: 'gofret' },
  { id: 'photo-blocky', title: 'Blok Dünyası', product: 'Biskrem', productId: 'biskrem' },
  { id: 'photo-factory', title: 'Çikolata Fabrikası', product: 'Halley', productId: 'halley' },
  { id: 'photo-space', title: 'Uzay Yolculuğu', product: 'Cocostar', productId: 'cocostar' },
  { id: 'photo-popart', title: 'Pop Art Afiş', product: 'Çikolatalı Gofret', productId: 'gofret' },
];

// Yeni denemeler sona eklenir; id aynı senaryoda değişmez.
const SAMPLE_ATTEMPTS = [
  ...PHOTO_SAMPLE_CASES.map(sample => ({
    ...sample, kind: 'photo', path: `samples/${sample.id}`,
    raw: `samples/reference-photo/${sample.id}-raw.png`,
    prompt: `samples/reference-photo/${sample.id}.json`,
  })),
  { id: 'lab-wafer', title: 'Lezzet Laboratuvarı', product: 'Fıstamel · Antep Fıstığı & Tuzlu Karamel', kind: 'pack', path: 'samples/reference-photo/pack-wafer', prompt: 'samples/reference-photo/pack-wafer.json' },
  { id: 'lab', title: 'Lezzet Laboratuvarı', product: 'Vişkora · Vişne & Bitter Kakao', kind: 'pack', path: 'samples/reference-photo/pack-cake', prompt: 'samples/reference-photo/pack-cake.json' },
  { id: 'lab-biscuit', title: 'Lezzet Laboratuvarı', product: 'Çivana · Çilek & Hindistan Cevizi', kind: 'pack', path: 'samples/reference-photo/pack-biscuit', prompt: 'samples/reference-photo/pack-biscuit.json' },
  { id: 'lab-chocolate', title: 'Lezzet Laboratuvarı', product: 'Portahve · Portakal & Türk Kahvesi', kind: 'pack', path: 'samples/reference-photo/pack-chocolate', prompt: 'samples/reference-photo/pack-chocolate.json' },
  { id: 'podcast', title: 'Bir Isırıkla O Yıla Dön', product: '2004 · Okul çıkışı · Çikolatalı Gofret', kind: 'podcast', path: 'samples/podcast/radio-memory', raw: 'samples/podcast/radio-memory-raw.png', prompt: 'samples/podcast/radio-memory.json', video: 'samples/podcast/radio-memory.mp4', poster: 'samples/podcast/radio-poster.png' },
  { id: 'podcast', title: 'Okul Çıkışı Gofretin Hışırtısı', product: '2004 · Okul çıkışı · Çikolatalı Gofret', kind: 'podcast', path: 'samples/podcast/radio-theater', raw: 'samples/podcast/radio-theater-raw.png', prompt: 'samples/podcast/radio-theater.json', video: 'samples/podcast/radio-theater.mp4', poster: 'samples/podcast/radio-theater-poster.png' },
];

function latestSamples() {
  return [...new Map(SAMPLE_ATTEMPTS.map(sample => [sample.id, sample])).values()];
}

function sampleFor(id) {
  const sample = latestSamples().find(sample => sample.id === id);
  if (!sample) throw new Error('Bu senaryo için kayıtlı örnek bulunamadı: ' + id);
  return sample;
}
