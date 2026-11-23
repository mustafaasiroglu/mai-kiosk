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
Sol menü ekran referanslarındaki **Home / Code** düzenini kullanır:
**Home** daima seçilidir, **Code** henüz kullanılamaz. Üç deneyim **Pinned** altında,
sohbet geçmişi **Recent** altında görünür. **Library → Outputs**, ortak örnek
listesindeki her senaryonun en güncel çıktısını sayfadan ayrılmadan gösterir.
**Recents**, Chat ve Cowork'te bu özellik eklendikten sonra tamamlanan son 20
üretimi ve revizyonu en yeniden eskiye sıralar; Demo çıktıları da saklanır ve
önizlemede Demo olarak belirtilir. Fotoğraf, ambalaj ve video filtreleri,
metin araması ve grid/liste görünümü kullanılabilir. Bir çıktıyı açıp
görseli veya videoyu görüntüleyebilir, indirebilir ve ilgili agent'a geçebilirsiniz.
Library kartlarında ilgili agent'ın ikonu ve birleştirilmiş çıktı başlığı
üstte, 16:9 önizleme altta bulunur. **Create something new** Agents sayfasını açar;
henüz yapılandırılmayan Shared ve bulut senkronizasyonu pasiftir.
Agents kartları yatay, kompakt düzendedir:
solda ikon, sağda agent adı, oluşturucu bilgisi ve tek satırlık açıklama bulunur.
Library'ye girip önceki sohbeti Recent'ten açmak mesajları ve seçimleri korur.
New, Search, Automations ve Plugins pasiftir.
Copilot ve Cowork ortak menüleri, ayarlar ve kontroller İngilizcedir; agent adları,
sohbetler, seçenekler ve üretilen içerik Türkçe kalır. Agents açılış metni
**Bir agent seç ve hemen konuşmaya başla.** şeklindedir.
Agent açılışında başlık, oluşturucu bilgisi, mesaj alanı ve başlangıç önerisi
referanstaki merkez yerleşimi kullanır; mobilde aynı düzen dar ekrana uyarlanır.
Mesaj alanının sağ altında referanstaki **Auto Medium** etiketi görünür;
bu bir model seçici değildir, Foundry dağıtımları Ayarlar'dan yönetilir.
Settings popup'ında solda **General**, **Connections** ve **Voice** sekmeleri bulunur.
Agent kartları, sol menü, sohbet başlığı ve kütüphane aynı gradyan zeminli,
katmanlı kamera, laboratuvar şişesi ve radyo ikonlarını kullanır.
Fotoğraf Stüdyosu pembe, Lezzet Laboratuvarı mavi ve Zaman Yolculuğu yeşildir;
ikon ve gradyan renkleri açık/koyu temaya uyarlanır.
General'da **Demo Mode** ilk kullanımda açık, **Full screen** varsayılan kapalıdır;
Demo Mode seçimi tarayıcıda saklanır ve refresh sonrası geri yüklenir.
Kapalı seçimde kayıtlı geçerli bağlantı uygulanır; bağlantı yoksa alanlar
düzenlenebilir kalır, ayarlar kaydedilene kadar canlı üretim başlamaz.
fullscreen durumu tarayıcıyla senkron kalır. **Language → English** ve
**Theme → System** sabittir, değiştirilemez.
Connections'daki Demo Mode anahtarı General ile aynı durumu paylaşır:
Demo Mode kapatılınca Connections otomatik açılır; bağlantı alanları ve **Save**
yalnızca kapalıyken kullanılabilir. Kayıtlı bağlantı varsa uygulanır; yoksa
alanlar düzenlemeye açılır, geçerli ayarlar kaydedilene kadar canlı üretim başlamaz.
Save bağlantıyı kaydedip uygular, kendi başına üretim başlatmaz.
Sağ üstteki **Demo Mode** etiketine tıklamak doğrudan Connections sekmesini açar.
Voice sekmesinde model/ses kimliği seçilip ayrı kaydedilir; bu işlem API anahtarını,
SAS'ı ve bağlantı alanlarını değiştirmez. Demo Mode açıkken bağlantı düzenleme
kilitlidir; devam eden üretim yoksa Voice ayrı kaydedilebilir.
`?ui=chat` ve `?ui=cowork` adresleri mevcut akış davranışlarını korur;
Home / Code, bu iki akış arasında geçiş anahtarı değildir.
Fotoğraf akışı hem **Chat** hem **Cowork** için klasik kiosk ile aynı sıradadır:
**Ofiste nasıl bir yıldızsın? → lezzet ruhun → tema → kamera/fotoğraf → üretim**.
Kamera ve dosya seçimi tema seçildikten sonra sunulur; fotoğrafı çekip
**Send** düğmesine basınca son üretim onayı gelir. Kamera izni reddedilirse
yeniden deneme, dosya ve örnek fotoğraf seçenekleri kullanılabilir.
Pencere veya sohbet kapatıldığında ve çekimden sonra kamera durdurulur.
**Cowork** üretim planını onaya sunar; çalışma alanında adımları ve indirilebilir
çıktıları gösterir. **Chat** akışı daha doğrudan ilerletir; canlı fotoğrafın
Foundry’ye gönderilmesi için her iki görünümde de onay gerekir.
Chat ve Cowork şıkları normal metin boyutunda, kompakt düğmelerdir;
yalnızca ürün seçeneklerinde ambalaj görseli gösterilir.
Diğer/Özel seçeneği bulunan adımlarda şıklara uymayan serbest metin doğrudan
özel yolun girdisi olur: podcast'te tarih ve an adı, Laboratuvarda Ar-Ge notu.
Seçenek veya ek metin sorusu tekrar sorulmaz; mevcut tarih, uzunluk ve içerik
doğrulamaları korunur. Diğer/Özel düğmesini seçmek mevcut iki adımlı akışı korur.
Chat ve Cowork üretim adımlarına tıklayınca adım çıktısı 11px metinle açılır.
Yazı adımında üretilen metin, görsel adımında gönderilen prompt ve küçük
çıktı önizlemesi gösterilir. Açılan adımlar ilerleme güncellemelerinde açık
kalır; hata veya durdurma halinde önceki adım çıktıları korunur.
Bu ayrıntılar yalnızca mevcut sohbetin belleğindedir; anahtarlar, SAS,
orijinal selfie ve özel mevcut yaş tahmini gösterilmez veya geçmişe kaydedilmez.
Çıktının altında **Change selections**, Laboratuvarda **Request revision**
ile aynı düğme satırındadır. Üretim ve Azure paylaşım hataları,
büyük uyarı panelleri yerine agent mesajı olarak sohbete eklenir.
Chat ve Cowork yanıtları aynı animasyonla sırayla görünür: 1,5 saniyelik üç
nokta beklemesinden sonra metin 80 ms aralıklarla 25 karakterlik parçalar halinde
açılır. Her yeni kullanıcı mesajının üstüne otomatik kaydırılır; kısa mesaj için
de yeterli alt boşluk bırakılır. Son kullanıcı girdisi üstte görünür kalırken
agent cevapları altında açılır ve ekranı yeniden kaydırmaz.
Henüz kullanıcı girdisi yoksa ilk agent cevabı esas alınır.
Metin açılırken sohbet aşağıya sürüklenmez.
Mesajların üzerinde agent adı ve ikonu tekrarlanmaz. Yanıt tamamlanmadan yeni
seçim alınmaz. Bağlantı modu değişikliği
yanıt zamanlayıcılarını temizler. Azaltılmış hareket tercihinde noktalar ve
imleç animasyonsuz gösterilir. Sohbet kaydırma çubuğu ince ve düşük kontrastlıdır.
Copilot podcast mesajı yalnızca oynatıcı, indirme ve sonuç aksiyonlarını içerir.
**Sources** düğmesi sağ paneli açar: **Citations** altında WebIQ dönem kaynakları,
**Outputs** altında çıktılar, hayal edilen sahne ve seslendirme metni bulunur.
QR görseli genel ikon boyutundan bağımsızdır; 240 piksele kadar büyür ve dar
ekranlarda mevcut alana sığar.

Demo modunda yeni görsel üretilmez ve kamera açılmaz; kayıtlı örnekler kullanılır.
Canlı üretimi Copilot **Settings** menüsünden Foundry bağlantısıyla açabilirsiniz.
Sohbetler ve kaynak selfieler yalnızca açık sayfada tutulur; yenileme veya
Demo/Canlı bağlantı modu değişikliği sohbetleri temizler.
Tamamlanan çıktıların görsel/video Blob'ları ve sınırlı başlık/agent bilgileri
aynı origin'deki `mai-kiosk-outputs` IndexedDB veritabanında saklanır.
Recents yenilemeden ve mod değişikliğinden sonra da korunur; kaynak selfie,
sohbet metni, API anahtarı, SAS ve paylaşım bağlantısı bu kayda eklenmez.
Bu kayıt buluta yüklenmez. Üretilen medya kişisel içerik barındırabilir;
güvenilir cihaz kullanın ve geçmişi kaldırmak için sitenin tarayıcı verilerini temizleyin.
Depolama kullanılamazsa üretim sonucu korunur, kaydedilemediği agent mesajıyla bildirilir.
Klasik kiosk, Chat ve Cowork aynı origin'deki `mai-kiosk-foundry`
tarayıcı kaydını kullanır: bir arayüzde kaydedilen Foundry uç noktası,
API anahtarı, model adları ve anlatıcı sesi diğer arayüzün Canlı ayarlarında da doldurulur.
Ana açılış ekranında **Kiosk UI / Copilot Chat UI** seçilir.
Alttaki **Demo Modu** anahtarı ilk kullanımda açıktır; sonraki açılışlarda
tarayıcıda saklanan son seçim kullanılır. Kapatılınca Foundry bağlantısı,
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
60’lar, 70’ler, 80’ler, 90’lar ve 2000’ler seçilebilir. Özel tarih doğal
dille de yazılabilir: `90 lar` → `01.01.1995`, `70 ler` → `01.01.1975`,
`Mayıs 1995` → `01.05.1995`, `23 Nisan 2004` → `23.04.2004`.
Yalnızca yıl verilirse 1 Ocak kullanılır; ay belirtilirse ayın ilk günü,
gün belirtilirse o gün korunur. Yıl eksikse tahmin edilmez.
Standart ifadeler yerelde çözülür; diğer ifadeler Demo kapalıyken aynı
Foundry metin modeli ve anahtarıyla JSON olarak ayrıştırılır (web araması yok).
Çözümlenen tarih 1944 ile bugün arasında takvim doğrulamasından geçer.
Chat/Cowork yazılan tarihi sonraki soruda gösterir; dönem düğmeleri aralık
seçimi olarak korunur. Klasik özel tarih alanı aynı çözümleyiciyi kullanır.
An seçenekleri okul çıkışı, aile ziyareti, ilk iş günü, yolculuk ve Diğer’dir.
Diğer için 80, kişisel anı için 240 karakter sınırı vardır. Masaüstünde
ekran klavyesi, mobilde cihaz klavyesi kullanılır. Diğer girişinde **Geri dön**
düğmesi daima görünür; yazılan metin klasik kioskta korunur. Cowork üretim planını;
Chat de canlı anının Foundry’ye gönderilmesini onaylatır.

Gerçek WebIQ servisine `POST https://api.microsoft.ai/v3/search/web` çağrısı
yapılır; Foundry `web_search`/Responses araması kullanılmaz.
İstek: `maxResults: 10`, `language: "tr"`, `region: "TR"`, `safeSearch: "off"`.
`contentFormat` ve `maxLength` gönderilmez; servisin varsayılanları kullanılır.
Sorgu seçilen tarihe göre örneğin `4 Nisan 1992 gazete manşetleri`,
dönem aralığında `1990-1999 gazete manşetleri` olur.
`x-apikey` yalnızca ayrı WebIQ anahtarını taşır; HTTP Host tarayıcı tarafından
`api.microsoft.ai` olarak belirlenir. Anahtar Connections'taki WebIQ alanında
veya yerel `.env` içinde `WEBIQ_API_KEY` ile yapılandırılır; Foundry anahtarı
WebIQ'ya gönderilmez. Boş veya maskeli anahtarla arama yapılmaz.
[WebIQ REST sözleşmesindeki](https://learn.microsoft.com/en-us/web-iq/reference/web-search)
erişim hataları açıkça gösterilir; başka bir arama servisine sessizce geçilmez.
Foundry metin modeli yalnızca dönen `webResults` içeriklerini kısa manşetlere
özetler; kaynaklar modelin ürettiği URL'lerden değil gerçek sonuçlardan alınır.
Ayrı ve katı bir kaynak doğrulama turu yapılmaz.
Bir veya iki kaynaklı haber doğrudan kullanılır; tek haber yeterlidir.
Eski dönemler için ansiklopedik kaynaklar da kabul edilir; birincil arşiv,
birebir yıl alıntısı ve kesin olay günü kanıtı zorunlu değildir.
Araştırma tamamlanmaz veya hiç kaynaklı haber bulunamazsa görsel/ses üretilmez;
yeniden deneme ve dönem değiştirme gerekir. AI kaynak değerlendirmesi hatasız
olma garantisi değildir; sonuçtaki bağlantılar bağımsız kontrol için açılabilir.

Selfiedeki yaklaşık **2026 yaşı** Foundry’de arka planda tahmin edilir;
kullanıcıya gösterilmez ve yaş sorusu/onayı yoktur. Seçilen dönemin orta yılı
ve yaklaşık doğum yılı üzerinden anlatım bağlamı için geçmiş yaş hesaplanır; imkânsız veya
10’dan küçük sonuçlar yaratıcı canlandırma için **10 yaşa** sabitlenir.
Bu gerçek tarihsel yaş iddiası değildir. Tek ve net bir yüz yoksa yeniden
selfie istenir; başarısızlıkta sahte yaş tahmini verilmez.

Çıktı **iki bölümlü, üç görselli, indirilebilir bir radyo tiyatrosudur**.
İlk bölüm **gazete için 8–10 saniye**: “Takvimler ... gösterirken, güneşli
bir yaz/kış gününde ülke gündemi oldukça hareketliydi.” benzeri kısa bir
giriş okunur; kaynaklı dönem haberleri yalnızca gazete görselinde ve kaynak
listesinde gösterilir, seslendirmeye eklenmez. İkinci bölüm **iki anı karesi
için toplam 15–20 saniye**: “O gün kahramanımız...” ile başlayan anı ve
duygusal kapanış için modele 14–18 kelimelik iki kısa cümle hedefi verilir;
bu hedefin dışındaki kelime sayıları üretimi durdurmaz.
Ses süreleri kayıt öncesinde ölçülür. Kısa seslerde görüntü/müzik bekletilir;
üst sınırı aşan sesler hızlandırılmaz veya kesilmez, açık hatayla durdurulur.
Gazete ve ilan gerçek arşiv malzemesi değildir.
**Anılar Gazetesi** karesinin manşetlerini, ürün ilanını, yazılarını ve tüm
yerleşimini MAI üretir; uygulama gazeteye yazı veya tasarım katmanı eklemez.
Modele seçilen tarih (gün/ay/yıl verilmişse aynen), bir veya iki kaynaklı haber
manşeti, özgün ürün reklam manşeti ve seçilen ürünün görseli iletilir.
Ürün referansı gerçek tarihî ambalaj/reklam iddiası değildir; kurgu açıklaması
da MAI tarafından gazetenin içine yazılır.
Görsel promptlarında ürün adı yerine genel bir atıştırmalık tanımı kullanılır;
anlatım ve görsel yönlendirmelerden taşınan seçili ürün adı da temizlenir.
Anı ve kapanış karelerinin her biri orijinal selfieyi ve seçilen ürünün
görselini referans alır; ürünün görünümü metinsel adından değil referanstan alınır.
Bu iki görselde hesaplanan sayısal yaş yerine seçilen yıldan bugüne geçen
yıl sayısıyla geçmiş görünüm istenir; içinde bulunulan yıl için gençleştirme
istenmez. Mekân, kıyafetler ve eşlik eden kişiler seçilen anıya göre oluşturulur;
yüz kimliği korunur. Ambalajın şekli ve oranları ürün referansıyla eşleşirken
atıştırmalık ve ambalaj sahnenin sıcak analog sepya paletine uyarlanır.
Üç görsel isteği aynı anda başlatılır; sonuçlar sahne sırasına göre yerleştirilir.
Chat/Cowork her görsel adımının durumunu ayrı gösterir. Bir istek hata verirse
diğerleri iptal edilir ve hepsi durmadan ses/video üretimine geçilmez;
servis reddi otomatik tekrar denenmez.
Kapanışta sahne devamlılığı önceki anının metinsel görsel yönlendirmesiyle
istenir; önceki üretilmiş fotoğraf ikinci referans olarak gönderilmez.
Görsel devamlılık talimatları yalnızca `memoryVisual` ve `endingVisual`
alanlarına aittir; seslendirilen anı ve kapanış metinleri teknik eşleştirme
ifadeleri yerine doğal olay ve duygu anlatımı içerir.
Tüm karelerde sepya görünüm ve hafif film greni korunur; titreme yerine sahne
boyunca belirgin pan ve sırayla yakınlaşma/uzaklaşma uygulanır; zoom %8’den
%20’ye çıkar veya tersine döner, yatay pan kadraj genişliğinin %5,6’sıdır. Hareket her yeni
fotoğrafta baştan başlar; azaltılmış hareket tercihinde pan ve zoom kapatılır.
Mikrofon açılışı yoktur.
**Kaynaklı dönem bilgileri**, **Hayal edilen sahne** ve seslendirme metni
ayrıca gösterilir; hava, kişisel sahne ve yüz dönüşümü yaratıcı tahmindir.
Video otomatik başlamaz. İptal veya hata önceki başarılı videoyu değiştirmez.
Demo yalnızca `samples/podcast/` altındaki gerçek kayıtlı MP4’ü oynatır.
Güncel `radio-theater` kaydı yaklaşık 27 saniyedir: kurgu gazete, okul çıkışı
anı ve kapanış olmak üzere üç sepya kare, üç cümlelik yeni seslendirme ve
2000’ler için hazırlanmış özgün müzik içerir. Demo selfie yaş tahmini bu
kaydın metadata’sından okunur; model çağrısı yapılmaz. Kapanış karesi yalnızca
kaynak selfie referansıyla üretilmiştir; önceki kare ikinci referans olarak
gönderilmemiştir.
Yeni Demo kaydı `radio-theater-v1` biçiminde hazırlanmış olmalıdır; eski
mikrofonlu kayıt yeni deneyim gibi gösterilmez. MAI politika reddi gibi servis
hataları açıkça gösterilir ve başka bir görselle sessizce değiştirilmez.

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

Web araması dönem seçildiğinde yıl aralığının tamamını, özel tarihte ilgili
yılı ve varsa tarih sınırını, ayrıca genel an türünü araştırır.
Kişisel anı, Diğer metni, selfie veya yaş web aramasına gönderilmez.
Selfie yaş tahmini ve geçmiş yüzün üretilmesi için, anı ise hikâye ve görsel
üretimi için Foundry’ye; anlatım seslendirme için Speech’e gönderilir.
Hassas kişisel bilgi yazmayın. WebIQ, Foundry'den ayrı bir arama servisidir;
[WebIQ belgelerini](https://learn.microsoft.com/en-us/web-iq/reference/web-search)
ve kurumunuzun bu servis için veri işleme koşullarını değerlendirin.

Repo kökündeki `.env` dosyası varsa Demo anahtarı kapatılınca bağlantı formu otomatik
doldurulur. `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`,
`FOUNDRY_IMAGE_DEPLOYMENT`, `FOUNDRY_LAB_DEPLOYMENT` ve isteğe bağlı
`FOUNDRY_SPEECH_VOICE` ve `WEBIQ_API_KEY` alanlarını
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
Azure SAS girilmezse senaryolar ve cihazdan indirme çalışır, ancak canlı
sonuç için telefon bağlantısı oluşturulmaz. Demo QR/linkleri seçili temanın
statik JPEG’ine, Laboratuvarın kayıtlı ambalajına veya Podcast MP4’üne doğrudan
gider; paylaşım sunucusu gerekmez.

### Azure Blob ile isteğe bağlı fotoğraf paylaşımı

Klasik kiosk bağlantı formunda veya Copilot **Ayarlar** menüsünde tek bir
**Azure Blob container SAS URL’si** girin. GitHub Pages’te backend gerekmez.
Alan boş bırakılabilir; SAS diğer bağlantı ayarlarıyla birlikte aynı origin'in
`mai-kiosk-foundry` yerel tarayıcı kaydında saklanır, repoya yazılmaz.
Yenileme ve Kiosk / Chat / Cowork geçişlerinde yeniden doldurulur.
Demo modu kayıtlı SAS'ı silmez ve paylaşımı etkinleştirmez; canlı bağlantı
onaylandığında SAS'ın süresi ve yetkileri yeniden doğrulanır.
Kaydı kaldırmak için SAS alanını boş bırakıp bağlantı ayarlarını kaydedin.
SAS bu cihazdaki tarayıcı verilerine erişebilenlerce okunabilir;
yalnızca güvendiğiniz cihazda kullanın.

Private, yalnızca bu etkinliğe ayrılmış bir container kullanın. HTTPS ile
sınırlı, başlangıcı geçmiş ve bitişi belirli bir **container SAS** üretin:
**Read + Create** (`rc`), **Read + Write** (`rw`) veya **Read + Create + Write**
(`rcw`). List ve Delete yetkileri verilmez. Account SAS ve stored access
policy bağlı SAS bu arayüzde desteklenmez. Shared Key kapalıysa kurumun izin
verdiği Entra tabanlı user delegation SAS kullanılabilir. SAS, ağ veya Azure
Policy engellerini aşmaz. Storage account key’i uygulamaya girmeyin.

**Önemli:** Tek SAS, QR ve indirme linklerinde de bulunur. Linki alan kişi
aynı yetkilerle container’a dosya yükleyebilir; Write varsa mevcut dosyaları
da değiştirebilir. GUID tahmin edilmesi zor bir dosya adıdır, yetki izolasyonu
değildir; başka fotoğrafın adını bilen kişi ona da erişebilir. Silme kuralı
bu yetkileri veya kötüye kullanım riskini ortadan kaldırmaz. Kısa SAS süresi,
ayrı container ve kurum/katılımcı onayı kullanın.

Storage hesabının **Blob service CORS** ayarında origin olarak
`https://mustafaasiroglu.github.io` (yerelde kullanılan tam origin de ayrıca),
method olarak `PUT`, izin verilen başlıklar olarak `Content-Type`,
`x-ms-blob-type`, `x-ms-blob-cache-control`, `If-None-Match` ekleyin.
Tarayıcıdaki Blob GET istekleri için `GET` de izinli olabilir; doğrudan
fotoğrafı açan telefonun container’a ağ erişimi bulunmalıdır.

Canlı Fotoğraf ve Laboratuvar sonuçlarında **Azure’a yükle ve QR oluştur**
düğmesi yüklemeyi ayrıca onaylatır. Yalnızca üretilen PNG/JPEG/WebP,
`<GUID>.<uzantı>` adıyla yüklenir; referans selfie ve metinler yüklenmez.
Mevcut dosya üzerine yazılmaz; cache başlığı `private, no-store` olur.
QR doğrudan Blob dosyasını açar, ayrı sosyal paylaşım sayfası sunmaz.
Hata durumunda çıktı korunur ve yeniden yükleme mümkündür.
Podcast video yüklemesi bu fotoğraf paylaşımı kapsamında değildir.

Eski dosyaları temizlemek için Azure Portal’da **Lifecycle management**
altına yalnızca etkinlik container’ını hedefleyen bir silme kuralı ekleyin.
Örneğin `kiosk-results` container’ındaki bir günden eski dosyalar için:

```json
{
  "rules": [{
    "name": "deleteKioskResults",
    "enabled": true,
    "type": "Lifecycle",
    "definition": {
      "filters": {
        "blobTypes": ["blockBlob"],
        "prefixMatch": ["kiosk-results/"]
      },
      "actions": {
        "baseBlob": { "delete": { "daysAfterCreationGreaterThan": 1 } },
        "version": { "delete": { "daysAfterCreationGreaterThan": 1 } },
        "snapshot": { "delete": { "daysAfterCreationGreaterThan": 1 } }
      }
    }
  }]
}
```

Bu kural uygulama tarafından kurulmaz; mevcut policy’ye ilgili kuralı ekleyin,
diğer kuralları değiştirmeyin. Lifecycle gün bazlı ve asenkrondur; **bir saat
sonra silinme veya tam 24 saatte temizlenme garantisi yoktur**. Soft delete
açıksa silinen veriler onun retention süresince tutulabilir. Linkler, dosya
silinirse veya ortak SAS biterse erişilemez olur; SAS bitişi dosyayı silmez.
Blob kullanımı ücretsiz depolama garantisi sağlamaz.

## Canlı test örnekleri

`samples.html` her örnek kimliğinin en güncel çıktısını gösteren ortak galeridir:
altı fotoğraf teması, bir Podcast ve dört Lezzet Laboratuvarı kartı.
Laboratuvarda Vişkora, Fıstamel, Çivana (çilek ve Hindistan cevizi bisküvisi)
ve Portahve (portakal ve Türk kahveli çikolata barı) yer alır.
Galeri ana sayfayla aynı renkleri kullanır; ortak renkler `kiosk-theme.css`
dosyasında tanımlıdır. Deneyim ve arama filtreleri vardır; sürüm ayrımı yoktur.
Yeni denemeleri farklı dosya adlarıyla `samples/` altında saklayıp
`samples.js` içindeki `SAMPLE_ATTEMPTS` listesine ekleyin. Aynı senaryonun `id`
değerini koruyun; en sona eklenen kayıt öncekinin yerini galeride alır.
Farklı Laboratuvar tarifleri için `lab-wafer`, `lab-biscuit` ve `lab-chocolate`
gibi ayrı kimlikler kullanın; `lab` kimliği Demo'nun Vişkora çıktısını korur.
Eski çıktıları yalnızca
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