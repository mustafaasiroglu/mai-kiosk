# mai-kiosk

Microsoft yapay zekâ demo kiosku. `index.html` doğrudan
tarayıcıda çalışır; derleme veya sunucu uygulaması gerekmez.

## Kullanım

### Copilot arayüzü

`python local_server.py` ile [localhost:8000/copilot/](http://localhost:8000/copilot/)
adresini açın (GitHub Pages: `/mai-kiosk/copilot/`). Klasik kiosk `/` adresinde
çalışmaya devam eder; **Ayarlar → Copilot** ile yeni arayüze geçebilirsiniz.

Fotoğraf Stüdyosu, Lezzet Laboratuvarı ve **Bir Isırıkla O Yıla Dön (Podcast)**
aynı sohbet arayüzündedir.
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
Copilot sohbetleri, fotoğrafları ve sesli anıları yalnızca açık sayfada tutulur;
yenileme veya Demo/Canlı bağlantı modu değişikliği sohbetleri temizler.
Klasik kiosk, Chat ve Cowork aynı origin'deki `mai-kiosk-foundry`
tarayıcı kaydını kullanır: bir arayüzde kaydedilen Foundry uç noktası,
API anahtarı, model adları ve anlatıcı sesi diğer arayüzün Canlı ayarlarında da doldurulur.
Ana açılış ekranında **Kiosk UI / Copilot Chat UI** seçilir.
Alttaki **Demo Modu** anahtarı varsayılan açıktır. Kapatılınca Foundry bağlantısı,
API anahtarı, model ve anlatıcı sesi alanları görünür; **İlerle** ayarları uygular.
Sağ üstte yalnızca Demo etkin olduğunda **Demo Modu** etiketi görünür.
Copilot'a bu ekrandan geçerken seçilen mod ve aynı kayıtlı bağlantı aktarılır;
doğrudan Copilot adresi yine Demo ile başlar. Kayıtlı anahtar
kendiliğinden canlı üretim başlatmaz. Yerel `.env` varsa ortak kayıt üstüne
uygulanır. Anahtar yalnızca güvendiğiniz cihazda saklanmalıdır.

### Klasik kiosk

Yerelde `python local_server.py` çalıştırıp `http://localhost:8000/`
adresini açın. Demo modu Foundry anahtarı istemez ve model çağrısı yapmaz.
Demo kamera açmadan `samples/reference.jpg` dosyasını gösterir; Fotoğraf,
Laboratuvar ve Podcast sonuçlarında galerideki kayıtlı gerçek çıktıları kullanır.
Seçimler ve yeniden gösterme, bu hazır görselleri değiştirmez; arayüz bunu belirtir.
Laboratuvar adı, sloganı ve hikâyesi de gösterilen çıktının JSON kaydından okunur.
Örnek dosyalarının okunabilmesi için kiosk HTTP üzerinden açılmalıdır.

Laboratuvar akışı **Temel → Lezzet → An → Ar-Ge notu → Üretim** şeklindedir;
Chat ve Cowork da an seçiminden sonra aynı not sorusunu sorar.
Chat ve Cowork'ta ilk ve ikinci malzeme ayrı sorularda seçilir; ikinci soruda
**Tek malzemeyle devam et** seçeneği de vardır. Aynı malzeme iki kez seçilemez.
**Onlara Güveniyorum** not eklemeden devam eder. **Özel Not Ekle**, klasik
kioskta cihaz klavyesi ve masaüstü ekran klavyesiyle, sohbet arayüzünde mesaj
alanıyla en fazla 500 karakterlik bir not yazmayı sağlar. Canlı modda not,
ürün adı, slogan, hikâye ve görsel yönlendirmesini üreten LLM'e ek tasarım
tercihi olarak iletilir. Demo modunda not alınır ama kayıtlı çıktı değişmez.

Ana ekrandaki deneyim sırası **Tatlı Anı Stüdyosu → Lezzet Laboratuvarı →
Bir Isırıkla O Yıla Dön** şeklindedir.

### Nostalji Podcast · Zaman Yolculuğu

Klasik kiosk, Cowork ve Chat aynı sırayı kullanır:
**Ülker ürünü → dönem/özel tarih → an → selfie → tek cümlelik anı → üretim**.
Ana kartta deneyimin yaklaşık süresi **3 dk** gösterilir.
Hanımeller ve Çokoprens, bu deneyimdeki ürün seçeneklerine eklidir.
Ambalaj görselleri yerel `assets/hanimeller.png` ve `assets/cokoprens.png`
dosyalarından tüm arayüzlerde gösterilir; kaynakları Ülker'in resmi
[Hanımeller](https://www.ulker.com.tr/tr/markalar/hanimeller) ve
[Çokoprens](https://www.ulker.com.tr/tr/markalar/cokoprens) sayfalarıdır.
60’lar, 70’ler, 80’ler, 90’lar ve 2000’ler seçilebilir. Özel tarih `2004`
veya `23.04.2004` biçimindedir; 1944 ile bugün arasında doğrulanır.
An seçenekleri okul çıkışı, aile ziyareti, ilk iş günü, yolculuk ve Diğer’dir.
Diğer için 80, kişisel anı için 240 karakter sınırı vardır. Masaüstünde
ekran klavyesi, mobilde cihaz klavyesi kullanılır. Diğer girişinde **Geri dön**
düğmesi daima görünür; yazılan metin klasik kioskta korunur. Cowork üretim planını;
Chat de canlı anının Foundry’ye gönderilmesini onaylatır.

WebIQ önce gündelik kültür detaylarını araştırır, ardından ayrı bir kaynak
doğrulama çağrısı yapar. En az iki olgu, seçilen döneme ait yıl, kısa kaynak
alıntısı ve araştırmada gerçekten dönen kaynak URL’leriyle doğrulanmalıdır.
Araştırma tamamlanmaz veya yeterli kaynak bulunamazsa görsel/ses üretilmez;
yeniden deneme ve dönem değiştirme gerekir. AI kaynak değerlendirmesi hatasız
olma garantisi değildir; sonuçtaki bağlantılar bağımsız kontrol için açılabilir.

Selfiedeki yaklaşık **2026 yaşı** Foundry’de arka planda tahmin edilir;
kullanıcıya gösterilmez ve yaş sorusu/onayı yoktur. Seçilen dönemin orta yılı
ve yaklaşık doğum yılı üzerinden geçmiş görünüm hesaplanır; imkânsız veya
10’dan küçük sonuçlar yaratıcı canlandırma için **10 yaşa** sabitlenir.
Bu gerçek tarihsel yaş iddiası değildir. Tek ve net bir yüz yoksa yeniden
selfie istenir; başarısızlıkta sahte yaş tahmini verilmez.

Çıktı **üç uzun cümle ve üç görselli, indirilebilir bir radyo tiyatrosudur**:
önce doğrulanmış gündemi içeren **kurgusal gazete ve Ülker ilanı**, sonra
kişinin o yaştaki halini kullanan anının gelişmesi, son olarak aynı sahnenin
devamı ve sıcak kapanış. Gazete ve ilan gerçek arşiv malzemesi değildir.
İlk anı karesi selfieyi, kapanış hem selfieyi hem önceki ham kareyi referans alır.
Tüm karelerde sepya görünüm, hafif film greni ve titreme korunur; azaltılmış
hareket tercihinde yakınlaşma/titreme kapatılır. Mikrofon açılışı yoktur.
**Kaynaklı dönem bilgileri**, **Hayal edilen sahne** ve seslendirme metni
ayrıca gösterilir; hava, kişisel sahne ve yüz dönüşümü yaratıcı tahmindir.
Video otomatik başlamaz. İptal veya hata önceki başarılı videoyu değiştirmez.
Demo yalnızca `samples/podcast/` altındaki gerçek kayıtlı MP4’ü oynatır.
Yeni Demo kaydı `radio-theater-v1` biçiminde hazırlanmış olmalıdır; eski
mikrofonlu kayıt yeni deneyim gibi gösterilmez. Mevcut yeni örneğin kişisel
gençleştirme karesi MAI tarafından `content_safety_violation` ile reddedildiği
için üç sahneli Demo henüz hazır değildir; eski medya dosyaları korunmuştur.
Bu servis hatası açıkça gösterilir ve başka bir görselle sessizce değiştirilmez.

Canlı video, üç ayrı Speech kaydının zamanlaması korunarak cihazda Web Audio,
Canvas ve MediaRecorder ile birleştirilir; ayrı bir video-modeli servisine
gönderilmez. H.264/AAC MP4 destekleniyorsa MP4, diğer uygun tarayıcılarda WebM
üretilir. Video kodlama sesin süresi kadar sürer; sekme açık tutulmalıdır.
Sekme arka plana geçerse eksik animasyonlu video döndürmek yerine açık hata
gösterilir. Selfie için kullanıcı kamera açabilir veya fotoğraf yükleyebilir;
mikrofon izni istenmez. Demo kamerayı açmaz ve kayıtlı örneği kullanır.

Her on yıl için 1940–2020 arasında bir kez hazırlanmış özgün enstrümantal döngü
`assets/podcast-music/` altında bulunur. Bunlar dönemlerden esinlenir; gerçek
arşiv kayıtları veya bilinen şarkılar değildir. `python tools/generate-podcast-music.py`
aynı besteleri yeniden üretir. Özel tarihte ilgili on yıl seçilir. Müzik videoya
karıştırılır, konuşma sırasında kısılır ve başta/sonda yumuşakça girip çıkar.
Kullanıcı başına yeni müzik servisi çağrısı veya müzik üretim ücreti yoktur.

WebIQ yalnızca seçilen somut yılı, varsa tarih sınırını ve genel an türünü
araştırır; kişisel anı, Diğer metni, selfie veya yaş web aramasına gönderilmez.
Selfie yaş tahmini ve geçmiş yüzün üretilmesi için, anı ise hikâye ve görsel
üretimi için Foundry’ye; anlatım seslendirme için Speech’e gönderilir.
Hassas kişisel bilgi yazmayın. Web araması Azure veri işleme sınırlarının
dışında işlenebilir; [Foundry web search veri işleme koşullarını](https://learn.microsoft.com/azure/foundry/openai/how-to/web-search)
kurulumunuz için değerlendirin.

Repo kökündeki `.env` dosyası varsa Demo anahtarı kapatılınca bağlantı formu otomatik
doldurulur. `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`,
`FOUNDRY_IMAGE_DEPLOYMENT`, `FOUNDRY_LAB_DEPLOYMENT` ve isteğe bağlı
`FOUNDRY_SPEECH_VOICE` alanlarını
`AD=değer` biçiminde yazın; değerler tek veya çift tırnak içine alınabilir.
Değişken genişletme ve satır sonu yorumları desteklenmez.
Dosyadaki bağlantı alanları tarayıcıda kayıtlı değerlerin önüne geçer; açılışta
seçilen anlatıcı sesi korunur. Boş bağlantı değerleri de
ilgili alanı temizler. `.env` Git tarafından yok sayılır; commit etmeyin.
Yerel sunucu yalnızca bu cihazdan erişilir, `.env` ve diğer gizli yolları
doğrudan sunmaz; form ayarları aynı origin üzerinden önbelleksiz okunur.
GitHub Pages bu yerel ayarları istemez. Bağlantıyı onaylamadan model çağrısı
yapılmaz. HTML'yi doğrudan açarsanız ayarları elle girebilirsiniz.

Canlı mod için Microsoft Foundry kaynak adresini (`https://<kaynak>.services.ai.azure.com`),
anahtarı ve dağıtım adını girin. Görsel modeli alanı `MAI-Image-2.7-Flash` ile
başlar; Foundry’deki gerçek dağıtım adını kullanın. Lezzet Laboratuvarı için
aynı kaynaktaki `gpt-5.4-mini` dağıtımı varsayılan metin modelidir; bağlantı
ayarlarından başka bir dağıtım seçilebilir veya adı elle girilebilir.
Metin modeli Laboratuvar ve Podcast için gereklidir; yalnızca Fotoğraf
kullanılacaksa bu alan boş bırakılabilir. Podcast, `web_search` destekli bir
GPT dağıtımı gerektirir; araştırma `/openai/v1/responses` üzerinden yapılır.
Speech aynı Foundry uç noktası ve anahtarıyla `/tts/cognitiveservices/v1`
üzerinden SSML ve MP3 kullanır. Varsayılan
`speech_synthesis_voice_name` **`en-US-Harper:MAI-Voice-2-Flash`**’tır.
**Açılış ekranındaki Podcast anlatıcı sesi** alanından değiştirilir;
bu alan Demo anahtarı kapatılınca bağlantı ayarlarıyla birlikte görünür.
Copilot bağlantı ayarları da aynı anlatıcı tercihini kullanır.
Ses adı desteklenmiyorsa hata gösterilir; farklı bir sese
veya tarayıcı sesine sessizce dönülmez. Demo kaydının sesi değişmez.
GPT modelleri `/openai/v1/chat/completions`, adı `MAI-` ile başlayan metin
dağıtımları eski `/mai/v1/chat/completions` API'sini kullanır.
Canlı Laboratuvar önce LLM ile ad, slogan, hikâye ve İngilizce görsel yönlendirmesi
üretir; alanları ve uzunluklarını doğruladıktan sonra ambalaj görselini oluşturur.
Ürün adı lezzet çağrışımlarından türetilmiş, en fazla 16 karakterlik tek kısa
kelimedir; marka veya ürün türü ada eklenmez. Slogan 2–3 kelimedir.
Kelime sınırını aşan model yanıtları kesilmez; hata gösterilir ve görsel üretilmez.
Metin modeli hatasında cihazda hazırlanmış metne sessizce dönülmez; hata ekranı
gösterilir ve görsel çağrısı yapılmaz. Demo yalnızca statik örnek dosyalarını okur.

Laboratuvar ambalajları, Ülker'in [resmi sitesindeki logoyu](https://www.ulker.com.tr/documents/1200px-ulker_logo_2_svg.png)
yerel `assets/ulker-logo.png` dosyasından kullanır (`CONFIG.event.productLogo`).
Canlı üretimde logo, oranı korunarak PNG referansına yerleştirilir ve
`images/edits` çağrısına gönderilir; prompt logonun harflerini, renklerini ve
beyaz konturunu korumasını ister. Modelin logoyu birebir aktarması garanti değildir.
Promptta logo için ambalajın ön yüz genişliğinin %12–15'i hedeflenir;
ürün adı görselde öne çıkar. Üretilen görselde oran modelin çıktısına bağlıdır.
Logo yüklenemezse canlı üretim hata verir; temsili yazı logosuna dönülmez.
Demo için yeniden üretim yapılmaz; mevcut kayıtlı ambalaj gösterilir.

Laboratuvar sonucundaki **Revizyon İste**, mevcut tasarımı ve resmi logoyu görsel
referansları olarak kullanır. Kullanıcı en fazla 500 karakterle değişikliği yazar;
klasik kioskta ekran klavyesi, mobilde ve Cowork/Chat'te metin alanı kullanılır.
İstenmeyen ayrıntılar ve değiştirilmesi istenmeyen ad/slogan korunur; metin sınırları
revizyonda da doğrulanır. Cowork revizyonu onaylatır, Chat doğrudan başlatır.
İşlem hata verir veya durdurulursa önceki sonuç korunur; sonraki revizyon en güncel
başarılı görseli referans alır. Demo modunda buton açıklamayla devre dışıdır.

Açılışta arayüzü seçin; örneklerle devam etmek için varsayılan **Demo Modu**
anahtarını açık bırakın. Üstteki etiket yalnızca Demo etkinse görünür.
Sağdaki kalıcı **Ayarlar** menüsünden
sesi açıp kapatabilir, tam ekrana geçebilir, modu değiştirebilir ve
**Örnek tasarımlar** galerisine gidebilirsiniz. Mod seçimini onaylamak ana ekrana
döner, kamerayı durdurur ve mevcut deneyimi sıfırlar; sonradan açılan mod
penceresini Escape ile kapatmak mevcut modu ve deneyimi korur. İşlem sürerken
mod değiştirme devre dışıdır.

Canlı bağlantı ayarları ve anahtar tarayıcının
yerel depolamasında saklanır ve yenilemeden sonra Demo anahtarı kapatılınca tekrar
gösterilir. Anahtar bu cihazdaki tarayıcı verilerine erişebilenlerce okunabilir;
canlı modu yalnızca güvendiğiniz cihazda ve test anahtarıyla kullanın. Ayarları
silmek için sitenin tarayıcı verilerini temizleyin. Doğrudan tarayıcı bağlantısı için Foundry
uç noktası, sayfanın origin’i ile `api-key` ve `Content-Type` başlıklarına CORS
izni vermelidir. Speech için ayrıca `Ocp-Apim-Subscription-Key` ve
`X-Microsoft-OutputFormat` başlıklarına ve Speech yoluna izin gerekir.
Uç nokta CORS’a izin vermiyorsa bu statik sürümde demo
modunu kullanın.

Canlı fotoğraf üretiminde referans fotoğraf Foundry’ye gider.
Kişisel sonuçlar paylaşım sunucusuna yüklenmez: indirme çalışır, QR
bağlantısı yalnızca örnek sonuç gösterir.

## Canlı test örnekleri

`samples.html` her senaryonun en son eklenen örneğini gösteren ortak galeridir:
altı fotoğraf teması, Podcast ve Lezzet Laboratuvarı için birer kart.
Galeri ana sayfayla aynı renkleri kullanır; ortak renkler `kiosk-theme.css`
dosyasında tanımlıdır. Deneyim ve arama filtreleri vardır; sürüm ayrımı yoktur.
Yeni denemeleri farklı dosya adlarıyla `samples/` altında saklayıp
`samples.js` içindeki `SAMPLE_ATTEMPTS` listesine ekleyin. Aynı senaryonun `id`
değerini koruyun; en sona eklenen kayıt öncekinin yerini galeride alır.
Yeni testlerde her senaryo için tek örnek yeterlidir; eski çıktıları yalnızca
yeni çıktılar doğrulandıktan ve silme izni alındıktan sonra temizleyin.
Bu liste galeri ve Demo sonuçları için ortaktır. `path` uzantısız JPEG yoludur;
`raw` ve `prompt` alanları farklı konumdaki ham PNG ve JSON dosyalarını gösterebilir.
Fotoğraf kayıtlarının `productId` değeri görseldeki gerçek ürüne karşılık gelmelidir.
Güncel fotoğraf JPEG'leri `samples/photo-*.jpg`; kaynak PNG'leri ve Laboratuvar
örnekleri `samples/reference-photo/` altında saklanır. Podcast örneği
`samples/podcast/` altındadır; `video` MP4, `poster` ilk gazete karesinin yoludur.
Radyo tiyatrosu JSON kaydı `radio-theater-v1` formatında üç sıralı sahne,
seslendirme metni, sahne başlangıç zamanları ve yaklaşık yaş bilgisini saklar.
Eski deneme arşivleri ve yinelenen fotoğraf JPEG'leri temizlendi.
Her örneğin ham PNG, kioskta oluşturulan JPEG ve JSON kaydı bulunur.
Altı portre için referans `samples/reference.jpg` dosyasıdır; JSON kayıtlarında
referansın SHA-256 özeti saklanır. Podcastin anı/kapanış kareleri örnek selfieyi
referans alır; Laboratuvar ambalajları kişi fotoğrafı kullanmaz. Yeni Laboratuvar
örneklerinde GPT'nin ürettiği metin ve görsel yönlendirmesi de JSON kaydında
saklanır. Anahtar bu örneklere eklenmez. Bu dosyalar herkese açık Pages
yayınına girdiğinden fotoğrafları ve üretilen sonuçları yalnızca ilgili
kişinin yayımlama izniyle bu klasöre koyun.

Fotoğraf çıktıları Microsoft/etkinlik imzasını korur; sol altta ürün minyatürü,
ürün adı veya tema başlığı yoktur. Güncel fotoğraflar `samples/photo-*.jpg`
altında ham çıktılardan kiosk birleştiricisiyle oluşturulur.
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
Windows üzerindeki Playwright WebKit Web Audio, Canvas captureStream ve
MediaRecorder sunmaz. Bu ortamda Canlı video, ücretli model çağrılarından önce
görünür bir destek hatasıyla durur; Demo MP4’ünde gerçek oynatma ve indirme
sınanır. Gerçek Safari/iOS video üretimi ayrıca cihaz üzerinde doğrulanmalıdır.

## GitHub Pages

Yayın kaynağı **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
`index.html` bu dala girince kiosk `https://mustafaasiroglu.github.io/mai-kiosk/`
adresinden açılır. Alternatif `kiosk.html` adresi, ekran ve QR bağlantılarını
koruyarak köke yönlendirir. Eski `yildiz-ai-kiosk.html` dosyası bu adla
değiştirilmiştir; eski dosya adresini kullanan bağlantıları güncelleyin.