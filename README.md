# mai-kiosk

Yıldız Holding × Microsoft yapay zekâ kiosku. `index.html` doğrudan
tarayıcıda çalışır; derleme veya sunucu uygulaması gerekmez.

## Kullanım

Yerelde `python local_server.py` çalıştırıp `http://localhost:8000/`
adresini açın. Demo modu Foundry anahtarı istemez ve model çağrısı yapmaz.

Repo kökündeki `.env` dosyası varsa Canlı seçildiğinde bağlantı formu otomatik
doldurulur. `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`,
`FOUNDRY_IMAGE_DEPLOYMENT` ve isteğe bağlı `FOUNDRY_LAB_DEPLOYMENT` alanlarını
`AD=değer` biçiminde yazın; değerler tek veya çift tırnak içine alınabilir.
Değişken genişletme ve satır sonu yorumları desteklenmez.
Dosyadaki alanlar tarayıcıda kayıtlı değerlerin önüne geçer; boş değerler de
ilgili alanı temizler. `.env` Git tarafından yok sayılır; commit etmeyin.
Yerel sunucu yalnızca bu cihazdan erişilir, `.env` ve diğer gizli yolları
doğrudan sunmaz; form ayarları aynı origin üzerinden önbelleksiz okunur.
GitHub Pages bu yerel ayarları istemez. Canlı moda devam etmeden model çağrısı
yapılmaz. HTML'yi doğrudan açarsanız ayarları elle girebilirsiniz.

Canlı mod için Microsoft Foundry kaynak adresini (`https://<kaynak>.services.ai.azure.com`),
anahtarı ve dağıtım adını girin. Görsel modeli alanı `MAI-Image-2-Flash` ile
başlar; Foundry’deki gerçek dağıtım adını kullanın. Lezzet Laboratuvarı için
aynı kaynaktaki `MAI-Thinking-1` dağıtım adını isteğe bağlı olarak girin.
Bu alan boşsa Lab metni cihazda hazırlanır, ambalaj görseli yine MAI ile üretilir.

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

## GitHub Pages

Yayın kaynağı **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
`index.html` bu dala girince kiosk `https://mustafaasiroglu.github.io/mai-kiosk/`
adresinden açılır. Alternatif `kiosk.html` adresi, ekran ve QR bağlantılarını
koruyarak köke yönlendirir. Eski `yildiz-ai-kiosk.html` dosyası bu adla
değiştirilmiştir; eski dosya adresini kullanan bağlantıları güncelleyin.