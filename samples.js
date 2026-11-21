const SAMPLE_PHOTO_SOURCE = 'sample_photo.jpeg';
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
  ...PHOTO_SAMPLE_CASES.map(sample => ({ ...sample, kind: 'photo', path: `samples/baseline/${sample.id}` })),
  { id: 'lab', title: 'Lezzet Laboratuvarı', product: 'Fıstık & Tuzlu Karamel Gofret', kind: 'pack', path: 'samples/baseline/pack' },
  { id: 'career', title: 'Kariyer Yıldız Haritası', product: 'Temsili veri analisti profili', kind: 'career', path: 'samples/baseline/career' },
  ...PHOTO_SAMPLE_CASES.map(sample => ({ ...sample, kind: 'photo', path: `samples/promotional/${sample.id}`, prompt: `samples/promotional/${sample.id}.json` })),
  ...PHOTO_SAMPLE_CASES.map(sample => ({ ...sample, kind: 'photo', path: `samples/reference-photo/${sample.id}`, prompt: `samples/reference-photo/${sample.id}.json` })),
  { id: 'lab', title: 'Lezzet Laboratuvarı', product: 'Antep Fıstığı & Tuzlu Karamel · Gofret', kind: 'pack', path: 'samples/reference-photo/pack-wafer', prompt: 'samples/reference-photo/pack-wafer.json' },
  { id: 'lab', title: 'Lezzet Laboratuvarı', product: 'Vişne & Bitter Kakao · Kek', kind: 'pack', path: 'samples/reference-photo/pack-cake', prompt: 'samples/reference-photo/pack-cake.json' },
  ...PHOTO_SAMPLE_CASES.map(sample => ({
    ...sample, kind: 'photo', path: `samples/${sample.id}`,
    raw: `samples/reference-photo/${sample.id}-raw.png`,
    prompt: `samples/reference-photo/${sample.id}.json`,
  })),
];

function latestSamples() {
  return [...new Map(SAMPLE_ATTEMPTS.map(sample => [sample.id, sample])).values()];
}

function sampleFor(id) {
  const sample = latestSamples().find(sample => sample.id === id);
  if (!sample) throw new Error('Bu senaryo için kayıtlı örnek bulunamadı: ' + id);
  return sample;
}
