# Otonom Scrapy Ajanı - Detaylı Kullanım Kılavuzu

Bu kılavuz, **Otonom Scrapy Ajanı** Chrome eklentisinin tüm özelliklerini, kurulumunu, yapılandırmasını ve Scrapy örümcekleri (spiders) üretmek için en verimli şekilde nasıl kullanılacağını adım adım açıklamaktadır.

---

## 📋 İçindekiler
1. [Eklenti Hakkında](#1-eklenti-hakkında)
2. [Mühendislik Standartları ve Yenilikler](#2-mühendislik-standartları-ve-yenilikler)
3. [Kurulum Adımları](#3-kurulum-adımları)
4. [Ayarlar ve Yapılandırma](#4-ayarlar-ve-yapılandırma)
5. [Adım Adım Kullanım Rehberi](#5-adım-adım-kullanım-rehberi)
6. [API İsteklerini Yakalama (XHR/Fetch) ve Güvenlik](#6-api-isteklerini-yakalama-xhrfetch-ve-güvenlik)
7. [İnteraktif Kod Geliştirme Sohbeti](#7-i̇nteraktif-kod-geliştirme-sohbeti)
8. [Örnek Bir Senaryo Çalıştırma](#8-örnek-bir-senaryo-çalıştırma)
9. [Sorun Giderme (Troubleshooting)](#9-sorun-giderme-troubleshooting)

---

## 1. Eklenti Hakkında

**Otonom Scrapy Ajanı**, web scraping (veri kazıma) projeleriniz için otomatik Python Scrapy kodları üreten yapay zeka destekli bir Chrome eklentisidir. Sayfadaki HTML yapısını inceleme, arka planda çalışan API isteklerini yakalama ve bunları Google Gemini API kullanarak tek bir tıkla optimize edilmiş, çalışmaya hazır Python Scrapy koduna dönüştürme yeteneğine sahiptir.

---

## 2. Mühendislik Standartları ve Yenilikler

Bu eklenti, endüstri standartlarına uygun olarak tasarlanmış ve aşağıdaki gelişmiş özelliklerle donatılmıştır:

- **Background Service Worker Altyapısı**: Gemini API çağrıları doğrudan sayfa (`content.js`) içerisinden değil, eklentinin arka plan servis işçisi (`background.js`) üzerinden yapılır. Bu sayede hedef sitelerin **İçerik Güvenlik Politikası (CSP)** engelleri aşılır ve eklentinin tüm sitelerde kesintisiz çalışması sağlanır.
- **Gelişmiş Veri Temizleme (Token Tasarrufu)**: Seçtiğiniz HTML elemanlarının `outerHTML` içeriklerinden gereksiz SVG çizim yolları (paths), satır içi stiller (`style="..."`), JavaScript betikleri (`<script>`) ve reklam/analitik etiketleri otomatik olarak temizlenir. Bu işlem Gemini API'ye giden yükü (payload) **%70'e varan oranda azaltır** ve daha doğru kod üretimi sağlar.
- **Sürüklenebilir ve Küçültülebilir Panel**: Yüzen kontrol paneli üst kısmından tutularak ekranın herhangi bir yerine taşınabilir. Ayrıca panel üzerindeki küçültme `─` butonu ile küçük bir yüzen `🤖` simgesine dönüştürülebilir. Böylece sayfa içeriğini görmek veya seçmek çok daha kolaylaşır.
- **Bağlantı Doğrulama (API Test Butonu)**: Ayarlar sayfasında girilen API anahtarının ve modelin geçerliliği, tek bir tıkla "Bağlantıyı Test Et" butonu aracılığıyla sınanabilir.
- **Sekme Bazlı Bağımsız Hafıza**: Farklı tarayıcı sekmelerindeki kazıma işlemleri tamamen izoledir. Sekmeler arası geçişlerde projelerinizin seçili elemanları ve ayarları birbirinin üzerine yazılmaz.

---

## 3. Kurulum Adımları

Eklentiyi Chrome tarayıcınıza yüklemek için şu adımları izleyin:

1. Bu projeyi yerel bilgisayarınıza klonlayın veya indirin.
2. **Google Chrome** tarayıcınızı açın.
3. Adres satırına `chrome://extensions/` yazın ve Enter'a basın.
4. Sayfanın sağ üst köşesindeki **Geliştirici modu** (Developer mode) seçeneğini aktif hale getirin.
5. Sol üstte çıkan **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıklayın.
6. Bilgisayarınızdaki bu projenin (klasörünün) konumunu seçin ve onaylayın.
7. Eklenti simgesi Chrome araç çubuğunda görünecektir. Kolay erişim için eklentiyi **sabitleyebilirsiniz (pin)**.

---

## 4. Ayarlar ve Yapılandırma

Eklentiyi kullanabilmeniz için bir **Google Gemini API Anahtarı** tanımlamanız gerekmektedir.

1. Eklenti simgesine tıklayın ve açılan küçük pencerede **⚙️ Ayarlar** butonuna basın.
2. Açılan modern koyu tema ayarlar sayfasında şu alanları doldurun:
   - **Google Gemini API Anahtarı**: Google AI Studio üzerinden aldığınız ücretsiz veya ücretli API anahtarınız.
   - **Bağlantıyı Test Et Butonu**: API anahtarınızı girdikten sonra bu butona basarak bağlantınızın durumunu ve Gemini'den gelen cevabı anında görün.
   - **AI Model Adı**: Tercih ettiğiniz modeli seçin (Varsayılan: `gemini-2.5-flash`).
   - **System Prompt**: Yapay zekaya kod yazarken uyması gereken kuralları söyler.
3. **Kaydet** butonuna basın. "Ayarlar başarıyla kaydedildi" onay mesajını göreceksiniz.

---

## 5. Adım Adım Kullanım Rehberi

### Adım 1: Eklentiyi ve Paneli Başlatma
Veri çekmek istediğiniz hedef web sitesini açın. Araç çubuğundaki eklenti simgesine tıklayarak **🚀 Paneli Aç** butonuna basın. Sayfanın sağ alt köşesinde yüzen modern otonom kontrol paneli açılacaktır.

### Adım 2: Proje Adını Belirleme
`PROJE ADI` alanına örümceğinize vermek istediğiniz ismi girin (Örn: `TrendyolCamp`). Bu isim, Python kodunda oluşturulacak class adına (`TrendyolCampSpider`) dönüştürülecektir.

### Adım 3: HTML Elemanı Seçme (İnteraktif Seçici)
1. **➕ Sayfadan HTML Alanı Seç** butonuna tıklayın.
2. Fare imlecinizi hedef sayfa üzerinde gezinirken elementlerin mavi kesikli çizgilerle vurgulandığını göreceksiniz.
3. Çekmek istediğiniz veriyi içeren HTML öğesinin (örneğin ürün kutusu, fiyat alanı veya başlık) üzerine tıklayın.
4. Eklenti sizden bu alan için açıklayıcı bir isim isteyecektir (Örn: `Urun_Kutusu` veya `Fiyat_Alani`).
5. İsim verip onayladığınızda element panele kaydedilir ve sayfa üzerinde yeşil çerçeveyle sabitlenir.
6. Yanlış seçtiğiniz alanları panel listesinden **🗑️ Sil** butonuyla kaldırabilirsiniz.

---

## 6. API İsteklerini Yakalama (XHR/Fetch) ve Güvenlik

Eklenti, sayfaların arka planda yaptığı API isteklerini otomatik olarak yakalayan bir altyapıya sahiptir.

- **API İsteklerini Yakala**: Paneldeki seçeneği işaretlediğinizde, sayfanın arka planda yaptığı tüm API istekleri (XHR/Fetch) ve bunların döndürdüğü örnek JSON yanıtları hafızaya kaydedilir.
- **Hassas Başlık Maskeleme (Güvenlik)**: İstekler yakalanırken, `Cookie`, `Authorization`, `Proxy-Authorization`, `X-Auth-Token` gibi hassas oturum bilgileri eklenti içerisinde otomatik olarak **[MASKED_FOR_SECURITY]** etiketiyle maskelenir. Bu sayede sayfa üzerindeki üçüncü taraf betiklerin kimlik bilgilerinizi ele geçirmesi önlenir ve Gemini'ye şifreleriniz/çerezleriniz gönderilmez.

---

## 7. İnteraktif Kod Geliştirme Sohbeti

Ajanı çalıştırıp ilk kod çıktısını aldıktan sonra panelde **💬 Kod Geliştirme Sohbeti** arayüzü açılır.

- **Otomatik Kopyalama**: Kod üretildiğinde veya güncellendiğinde otomatik olarak panonuza (clipboard) kopyalanır.
- **Revizyon Talepleri**: Kodda bir hata fark ederseniz veya ekstra bir özellik eklenmesini isterseniz alt kısımdaki mesaj kutusuna doğrudan Türkçe olarak yazabilirsiniz (Örn: *"Fiyat alanını çekerken sadece sayıları alacak şekilde regex kullan"*).
- **Yapay Zeka Yanıtı**: Gemini isteğinize göre kodu güncelleyecek ve yeni kodu tekrar panonuza kopyalayacaktır.

---

## 8. Örnek Bir Senaryo Çalıştırma

Bir e-ticaret sitesinden ürün adı ve fiyatlarını çekmek istediğinizi varsayalım:

1. E-ticaret sitesinde arama yapıp ürünleri listeleyin.
2. **🚀 Paneli Aç** diyerek eklenti panelini getirin.
3. Proje adını `ECommerce` yapın.
4. **➕ Sayfadan HTML Alanı Seç** diyerek listedeki ilk ürünün kutusunu seçin ve ismine `Urun_Karti` deyin.
5. Sayfayı biraz aşağı kaydırarak arka plandaki isteklerin yakalanmasını sağlayın. **API İsteklerini Yakala** seçeneğini işaretleyin.
6. Prompt alanına: *"Sayfadaki ürün kartlarını dolaş, ürün adını ve fiyatını çek."* yazın.
7. **Ajanı Çalıştır** butonuna basın.
8. Birkaç saniye içinde kod panonuza kopyalanacaktır.
9. Projenizde bu kodu doğrudan bir Python dosyasına yapıştırıp çalıştırabilirsiniz!

---

## 9. Sorun Giderme (Troubleshooting)

- **Gemini Düşünüyor yazısında takılı kalıyor**: 
  - Tarayıcı konsolunu (`F12 -> Console`) açarak hata mesajını kontrol edin.
  - API Anahtarınızın doğru girildiğinden ve geçerli olduğundan emin olmak için Ayarlar sayfasındaki **Bağlantıyı Test Et** butonunu kullanın.
- **Seçim yaparken sayfa yenileniyor**:
  - Bazı sitelerde bağlantılara tıklandığında sayfa yönlendirmesi tetiklenebilir. Bunu önlemek için seçim modundayken öğelerin üzerine tıklarken dikkatli olun.
- **Panel web sitesindeki butonların üstünü kapatıyor**:
  - Paneli üst kısmındaki başlık alanından fareyle tutarak ekranın başka bir yerine sürükleyin veya küçültme (`─`) butonunu kullanarak simge durumuna getirin.
