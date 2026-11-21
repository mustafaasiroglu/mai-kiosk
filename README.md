# mai-kiosk

Yıldız Holding × Microsoft yapay zekâ kiosku. `index.html` doğrudan
tarayıcıda çalışır; derleme veya sunucu uygulaması gerekmez.

## Kullanım

Yerelde `python local_server.py` çalıştırıp `http://localhost:8000/`
adresini açın. Demo modu Foundry anahtarı istemez ve model çağrısı yapmaz.

Repo kökündeki `.env` dosyası varsa Canlı seçildiğinde bağlantı formu otomatik
doldurulur. `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`,
`FOUNDRY_IMAGE_DEPLOYMENT` ve `FOUNDRY_LAB_DEPLOYMENT` alanlarını
`AD=değer` biçiminde yazın; değerler tek veya çift tırnak içine alınabilir.
Değişken genişletme ve satır sonu yorumları desteklenmez.
Dosyadaki alanlar tarayıcıda kayıtlı değerlerin önüne geçer; boş değerler de
ilgili alanı temizler. `.env` Git tarafından yok sayılır; commit etmeyin.
Yerel sunucu yalnızca bu cihazdan erişilir, `.env` ve diğer gizli yolları
doğrudan sunmaz; form ayarları aynı origin üzerinden önbelleksiz okunur.
GitHub Pages bu yerel ayarları istemez. Canlı moda devam etmeden model çağrısı
yapılmaz. HTML'yi doğrudan açarsanız ayarları elle girebilirsiniz.

Canlı mod için Microsoft Foundry kaynak adresini (`https://<kaynak>.services.ai.azure.com`),
anahtarı ve dağıtım adını girin. Görsel modeli alanı `MAI-Image-2.7-Flash` ile
başlar; Foundry’deki gerçek dağıtım adını kullanın. Lezzet Laboratuvarı için
aynı kaynaktaki `gpt-5.4-mini` dağıtımı varsayılan metin modelidir; bağlantı
ayarlarından başka bir dağıtım seçilebilir veya adı elle girilebilir.
Metin modeli Laboratuvar için gereklidir; yalnızca Fotoğraf veya Kariyer
kullanılacaksa bu alan boş bırakılabilir.
GPT modelleri `/openai/v1/chat/completions`, adı `MAI-` ile başlayan metin
dağıtımları eski `/mai/v1/chat/completions` API'sini kullanır.
Canlı Laboratuvar önce LLM ile ad, slogan, hikâye ve İngilizce görsel yönlendirmesi
üretir; alanları ve uzunluklarını doğruladıktan sonra ambalaj görselini oluşturur.
Metin modeli hatasında cihazda hazırlanmış metne sessizce dönülmez; hata ekranı
gösterilir ve görsel çağrısı yapılmaz. Demo modu tamamen cihazda çalışmaya devam eder.

Açılışta Demo veya Canlı seçin. Canlı bağlantı ayarları ve anahtar tarayıcının
yerel depolamasında saklanır ve yenilemeden sonra Canlı seçildiğinde tekrar
gösterilir. Anahtar bu cihazdaki tarayıcı verilerine erişebilenlerce okunabilir;
canlı modu yalnızca güvendiğiniz cihazda ve test anahtarıyla kullanın. Ayarları
silmek için sitenin tarayıcı verilerini temizleyin. Doğrudan tarayıcı bağlantısı için Foundry
uç noktası, sayfanın origin’i ile `api-key` ve `Content-Type` başlıklarına CORS
izni vermelidir. Uç nokta CORS’a izin vermiyorsa bu statik sürümde demo
modunu kullanın.

Canlı fotoğraf üretiminde referans fotoğraf Foundry’ye gider. Kariyer profilleri
temsili kalır. Kişisel sonuçlar sunucuya yüklenmez: indirme çalışır, QR
bağlantısı yalnızca örnek sonuç gösterir.

## Canlı test örnekleri

`samples.html` önceki ve güncel prompt çıktılarının karşılaştırma galerisidir.
Güncel görseller `samples/reference-photo/`, eski çizim tabanlı denemeler
`samples/baseline/` ve `samples/promotional/` altında saklanır;
her örneğin ham PNG ve kioskta oluşturulan JPEG çıktısı bulunur.
Güncel portrelerin kamera girdisi `sample_photo.jpeg`, eski denemelerin
referansı `samples/reference_old.jpg` dosyasıdır. Yeni Laboratuvar
örneklerinde GPT'nin ürettiği metin ve görsel yönlendirmesi de JSON kaydında
saklanır. Anahtar bu örneklere eklenmez. Bu dosyalar herkese açık Pages
yayınına girdiğinden fotoğrafları ve üretilen sonuçları yalnızca ilgili
kişinin yayımlama izniyle bu klasöre koyun.

Fotoğraf çıktıları ürün minyatürünü ve Microsoft/etkinlik imzasını korur;
sol alttaki ürün ve tema başlıkları kaldırılmıştır. Canlı fotoğraf promptu
tek elde ürün, diğer elle ürünü gösterme pozunu kullanır. Reklam Yüzü ve
diğer 3D temalarda vinyl/clay karakter yaklaşımı, Blok ve Pop Art
temalarında kendi görsel stilleri korunur.
Minecraft temasında hem modele gönderilen ambalaj referansı hem de alt banttaki
ürün minyatürü düşük çözünürlükte piksel olarak hazırlanır; prompt ürünün de
voxel/pixel-art dünyasına ait olmasını ister.

Yerel kontroller: `node --test test_kiosk.js` ve
`python -m unittest -q test_local_server`. Bu kontroller model çağrısı yapmaz.

## GitHub Pages

Yayın kaynağı **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
`index.html` bu dala girince kiosk `https://mustafaasiroglu.github.io/mai-kiosk/`
adresinden açılır. Alternatif `kiosk.html` adresi, ekran ve QR bağlantılarını
koruyarak köke yönlendirir. Eski `yildiz-ai-kiosk.html` dosyası bu adla
değiştirilmiştir; eski dosya adresini kullanan bağlantıları güncelleyin.