# mai-kiosk

Yıldız Holding × Microsoft yapay zekâ kiosku. `index.html` doğrudan
tarayıcıda çalışır; derleme veya sunucu uygulaması gerekmez.

## Kullanım

### Copilot arayüzü

`python local_server.py` ile [localhost:8000/copilot/](http://localhost:8000/copilot/)
adresini açın (GitHub Pages: `/mai-kiosk/copilot/`). Klasik kiosk `/` adresinde
çalışmaya devam eder; **Ayarlar → Copilot** ile yeni arayüze geçebilirsiniz.

Fotoğraf Stüdyosu, Kariyer Koçu ve Lezzet Laboratuvarı aynı sohbet arayüzündedir.
Fotoğraf akışı hem **Chat** hem **Cowork** için klasik kiosk ile aynı sıradadır:
**Ofiste nasıl bir yıldızsın? → lezzet ruhun → tema → kamera/fotoğraf → üretim**.
Kamera ve dosya seçimi tema seçildikten sonra sunulur; fotoğrafı çekip
**Gönder** düğmesine basınca son üretim onayı gelir. Kamera izni reddedilirse
yeniden deneme, dosya ve örnek fotoğraf seçenekleri kullanılabilir.
Pencere veya sohbet kapatıldığında ve çekimden sonra kamera durdurulur.
**Cowork** üretim planını onaya sunar; çalışma alanında adımları ve indirilebilir
çıktıları gösterir. **Chat** akışı daha doğrudan ilerletir; canlı fotoğrafın
Foundry’ye gönderilmesi için her iki görünümde de onay gerekir.

Demo modunda yeni görsel üretilmez ve kamera açılmaz; kayıtlı örnekler kullanılır.
Canlı üretimi Copilot **Ayarlar** menüsünden Foundry bağlantısıyla açabilirsiniz.
Kariyer verileri her iki modda da temsili olup LinkedIn’e bağlanılmaz.
Copilot sohbetleri ve fotoğrafları yalnızca açık sayfada tutulur;
yenileme veya Demo/Canlı bağlantı modu değişikliği sohbetleri temizler.
Klasik kiosk, Chat ve Cowork aynı origin'deki `mai-kiosk-foundry`
tarayıcı kaydını kullanır: bir arayüzde kaydedilen Foundry uç noktası,
API anahtarı ve model adları diğer arayüzün Canlı ayarlarında da doldurulur.
Her arayüz yine Demo ile başlar veya mod seçimi ister; kayıtlı anahtar
kendiliğinden canlı üretim başlatmaz. Yerel `.env` varsa ortak kayıt üstüne
uygulanır. Anahtar yalnızca güvendiğiniz cihazda saklanmalıdır.

### Klasik kiosk

Yerelde `python local_server.py` çalıştırıp `http://localhost:8000/`
adresini açın. Demo modu Foundry anahtarı istemez ve model çağrısı yapmaz.
Demo kamera açmadan `sample_photo.jpeg` dosyasını gösterir; Fotoğraf, Kariyer
ve Laboratuvar sonuçlarında galerideki kayıtlı gerçek çıktıları kullanır.
Seçimler ve yeniden gösterme, bu hazır görselleri değiştirmez; arayüz bunu belirtir.
Laboratuvar adı, sloganı ve hikâyesi de gösterilen çıktının JSON kaydından okunur.
Örnek dosyalarının okunabilmesi için kiosk HTTP üzerinden açılmalıdır.

Kariyer akışında ad alanına cihaz klavyesiyle veya kiosk ekran klavyesiyle
yazılabilir. Profil seçimi unvan, kurum ve konum bilgilerini ayrı gösterir;
analiz deneyim, eğitim, yetenek ve sertifikaları gruplar. Analiz hatasında
kendiliğinden temsili bir profile geçilmez; yeniden deneme ve profil değiştirme
seçenekleri sunulur. Harici profil servisleri bağlı değilse temsili veri kullanımı
arayüzde açıkça belirtilir.

Dört kariyer stili, `samples/career-styles/` altındaki gerçek çıktı JPEG'leriyle
önizlenir. Aynı temsili profil için Foundry görsel modeliyle arka plan üretilmiş,
ad ve kariyer metinleri canlıdaki `renderInfographic` akışıyla eklenmiştir.
Ham PNG'ler ve kullanılan model, prompt ve temsili profil bilgileri JSON olarak
aynı klasörde korunur. Galeri ve Demo sonucu en güncel Takımyıldız örneğini
gösterir; diğer üç çıktı stil seçimi ekranındaki karşılaştırma içindir.

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
gösterilir ve görsel çağrısı yapılmaz. Demo yalnızca statik örnek dosyalarını okur.

Laboratuvar ambalajları, Ülker'in [resmi sitesindeki logoyu](https://www.ulker.com.tr/documents/1200px-ulker_logo_2_svg.png)
yerel `assets/ulker-logo.png` dosyasından kullanır (`CONFIG.event.productLogo`).
Canlı üretimde logo, oranı korunarak PNG referansına yerleştirilir ve
`images/edits` çağrısına gönderilir; prompt logonun harflerini, renklerini ve
beyaz konturunu korumasını ister. Modelin logoyu birebir aktarması garanti değildir.
Logo yüklenemezse canlı üretim hata verir; temsili yazı logosuna dönülmez.
Demo için yeniden üretim yapılmaz; mevcut kayıtlı ambalaj gösterilir.

Açılışta Demo Modu veya Canlı Mod seçin. Üstteki durum etiketi seçime göre
**Demo Modu** veya **Live Mode** gösterir. Sağdaki kalıcı **Ayarlar** menüsünden
sesi açıp kapatabilir, tam ekrana geçebilir, modu değiştirebilir ve
**Örnek tasarımlar** galerisine gidebilirsiniz. Mod seçimini onaylamak ana ekrana
döner, kamerayı durdurur ve mevcut deneyimi sıfırlar; sonradan açılan mod
penceresini Escape ile kapatmak mevcut modu ve deneyimi korur. İşlem sürerken
mod değiştirme devre dışıdır.

Canlı bağlantı ayarları ve anahtar tarayıcının
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

`samples.html` her senaryonun en son eklenen örneğini gösteren ortak galeridir:
altı fotoğraf teması, Kariyer ve Lezzet Laboratuvarı için birer kart.
Galeri ana sayfayla aynı renkleri kullanır; ortak renkler `kiosk-theme.css`
dosyasında tanımlıdır. Deneyim ve arama filtreleri vardır; sürüm ayrımı yoktur.
Yeni denemeleri farklı dosya adlarıyla `samples/` altında saklayıp
`samples.js` içindeki `SAMPLE_ATTEMPTS` listesine ekleyin. Aynı senaryonun `id`
değerini koruyun; en sona eklenen kayıt öncekinin yerini galeride alır.
Eski kayıtlar ve dosyalar silinmez; yeni testlerde her senaryo için tek örnek yeterlidir.
Bu liste galeri ve Demo sonuçları için ortaktır. `path` uzantısız JPEG yoludur;
`raw` ve `prompt` alanları farklı konumdaki ham PNG ve JSON dosyalarını gösterebilir.
Fotoğraf kayıtlarının `productId` değeri görseldeki gerçek ürüne karşılık gelmelidir.
Güncel fotoğraf JPEG'leri `samples/photo-*.jpg`; kaynak PNG'leri ve Laboratuvar
örnekleri `samples/reference-photo/` altında saklanır. Eski çizim tabanlı denemeler
`samples/baseline/` ve `samples/promotional/` altında korunur;
her örneğin ham PNG ve kioskta oluşturulan JPEG çıktısı bulunur.
Güncel portrelerin kamera girdisi `sample_photo.jpeg`, eski denemelerin
referansı `samples/reference_old.jpg` dosyasıdır. Yeni Laboratuvar
örneklerinde GPT'nin ürettiği metin ve görsel yönlendirmesi de JSON kaydında
saklanır. Anahtar bu örneklere eklenmez. Bu dosyalar herkese açık Pages
yayınına girdiğinden fotoğrafları ve üretilen sonuçları yalnızca ilgili
kişinin yayımlama izniyle bu klasöre koyun.

Fotoğraf çıktıları Microsoft/etkinlik imzasını korur; sol altta ürün minyatürü,
ürün adı veya tema başlığı yoktur. Güncel fotoğraflar `samples/photo-*.jpg`
altında ham çıktılardan yeniden birleştirilmiştir; eski dosyalar korunur.
Canlı fotoğraf promptu
tek elde ürün, diğer elle ürünü gösterme pozunu kullanır. Reklam Yüzü ve
diğer 3D temalarda vinyl/clay karakter yaklaşımı, Blok ve Pop Art
temalarında kendi görsel stilleri korunur.
Minecraft temasında modele gönderilen ambalaj referansı düşük çözünürlükte
piksel olarak hazırlanır; prompt ürünün de
voxel/pixel-art dünyasına ait olmasını ister.

Yerel kontroller: `node --test test_kiosk.js` ve
`python -m unittest -q test_local_server`. Bu kontroller model çağrısı yapmaz.
Tarayıcı regresyonları için `npm install`, ardından
`npx playwright install chromium webkit` ve `npm test` çalıştırın.
`npm run test:browser` klasik kiosk, Chat ve Cowork akışlarını masaüstü ve
dokunmatik mobil ekranlarda sınar. Tarayıcı testleri gerçek Foundry çağrısı
yapmaz: başarılı/hatalı model yanıtlarını kontrollü olarak taklit eder;
kameranın açılması, izin hataları, onay, indirme ve ortak anahtar kullanımı
ayrıca denetlenir. Gerçek cihaz kamerası ve gerçek Foundry bağlantısı için
cihazda Canlı mod denemesi ayrıca gereklidir.

## GitHub Pages

Yayın kaynağı **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
`index.html` bu dala girince kiosk `https://mustafaasiroglu.github.io/mai-kiosk/`
adresinden açılır. Alternatif `kiosk.html` adresi, ekran ve QR bağlantılarını
koruyarak köke yönlendirir. Eski `yildiz-ai-kiosk.html` dosyası bu adla
değiştirilmiştir; eski dosya adresini kullanan bağlantıları güncelleyin.