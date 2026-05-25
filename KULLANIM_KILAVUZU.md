# Otonom Scrapy Ajanı - Detaylı Kullanım Kılavuzu

Bu kılavuz, **Otonom Scrapy Ajanı** Chrome eklentisinin tüm özelliklerini, kurulumunu, yapılandırmasını ve Scrapy örümcekleri (spiders) üretmek için en verimli şekilde nasıl kullanılacağını adım adım açıklamaktadır.

---

## 📋 İçindekiler
1. [Eklenti Hakkında](#1-eklenti-hakkında)
2. [Kurulum Adımları](#2-kurulum-adımları)
3. [Ayarlar ve Yapılandırma](#3-ayarlar-ve-yapılandırma)
4. [Adım Adım Kullanım Rehberi](#4-adım-adım-kullanım-rehberi)
5. [API İsteklerini Yakalama (XHR/Fetch)](#5-api-isteklerini-yakalama-xhrfetch)
6. [İnteraktif Kod Geliştirme Sohbeti](#6-i̇nteraktif-kod-geliştirme-sohbeti)
7. [Örnek Bir Senaryo Çalıştırma](#7-örnek-bir-senaryo-çalıştırma)
8. [Sorun Giderme (Troubleshooting)](#8-sorun-giderme-troubleshooting)

---

## 1. Eklenti Hakkında

**Otonom Scrapy Ajanı**, web scraping (veri kazıma) projeleriniz için otomatik Python Scrapy kodları üreten yapay zeka destekli bir Chrome eklentisidir. Sayfadaki HTML yapısını inceleme, arka planda çalışan API isteklerini yakalama ve bunları Google Gemini API kullanarak tek bir tıkla optimize edilmiş, çalışmaya hazır Python Scrapy koduna dönüştürme yeteneğine sahiptir.

---

## 2. Kurulum Adımları

Eklentiyi Chrome tarayıcınıza yüklemek için şu adımları izleyin:

1. Bu projeyi yerel bilgisayarınıza klonlayın veya indirin.
2. **Google Chrome** tarayıcınızı açın.
3. Adres satırına `chrome://extensions/` yazın ve Enter'a basın.
4. Sayfanın sağ üst köşesindeki **Geliştirici modu** (Developer mode) seçeneğini aktif hale getirin.
5. Sol üstte çıkan **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıklayın.
6. Bilgisayarınızdaki bu projenin (klasörünün) konumunu seçin ve onaylayın.
7. Eklenti simgesi Chrome araç çubuğunda görünecektir. Kolay erişim için eklentiyi **sabitleyebilirsiniz (pin)**.

---

## 3. Ayarlar ve Yapılandırma

Eklentiyi kullanabilmeniz için bir **Google Gemini API Anahtarı** tanımlamanız gerekmektedir.

1. Eklenti simgesine tıklayın ve açılan küçük pencerede **⚙️ Ayarlar** butonuna basın (veya eklentiye sağ tıklayıp "Seçenekler"i seçin).
2. Açılan ayarlar sayfasında şu alanları doldurun:
   - **Google Gemini API Anahtarı**: Google AI Studio üzerinden aldığınız ücretsiz veya ücretli API anahtarınız.
   - **API Model**: Tercih ettiğiniz modeli seçin (Örn: `gemini-3.5-flash` veya `gemini-1.5-pro`). Hızlı ve etkili sonuçlar için varsayılan model tavsiye edilir.
   - **System Prompt**: Yapay zekaya kod yazarken uyması gereken kuralları söyler. Varsayılan istem halihazırda Scrapy kurallarına, try-except bloklarına ve JSON önceliklendirmesine göre optimize edilmiştir. Dilerseniz burayı kendi Scrapy şablonlarınıza göre özelleştirebilirsiniz.
3. **Kaydet** butonuna basın. "Ayarlar başarıyla kaydedildi" onay mesajını göreceksiniz.

---

## 4. Adım Adım Kullanım Rehberi

### Adım 1: Eklentiyi ve Paneli Başlatma
Veri çekmek istediğiniz hedef web sitesini açın. Araç çubuğundaki eklenti simgesine tıklayarak **🚀 Paneli Aç** butonuna basın. Sayfanın sağ alt köşesinde yüzen (floating) otonom kontrol paneli açılacaktır.

### Adım 2: Proje Adını Belirleme
`Proje Adı` alanına örümceğinize vermek istediğiniz ismi girin (Örn: `TrendyolCamp` veya `SahibindenCars`). Bu isim, Python kodunda oluşturulacak class adına (`TrendyolCampSpider`) dönüştürülecektir.

### Adım 3: HTML Elemanı Seçme (İnteraktif Seçici)
1. **➕ Yeni HTML Alanı Seç** butonuna tıklayın.
2. Fare imleciniz hedef sayfa üzerinde gezinirken elementlerin mavi kesikli çizgilerle vurgulandığını göreceksiniz.
3. Çekmek istediğiniz veriyi içeren HTML öğesinin (örneğin ürün kutusu, fiyat alanı veya başlık) üzerine tıklayın.
4. Eklenti sizden bu alan için açıklayıcı bir isim isteyecektir (Örn: `Urun_Kutusu` veya `Fiyat_Alani`).
5. İsim verip onayladığınızda element panele kaydedilir ve sayfa üzerinde yeşil çerçeveyle sabitlenir.
6. Bu şekilde birden fazla HTML alanı seçebilirsiniz. Yanlış seçtiğiniz alanları panel listesinden **🗑️ Sil** butonuyla kaldırabilirsiniz.

---

## 5. API İsteklerini Yakalama (XHR/Fetch)

Modern web siteleri (React, Vue, Angular kullananlar) verileri genellikle sayfa yüklendikten sonra arka planda API istekleri (JSON formatında) ile çekerler. Eklenti bu istekleri otomatik olarak yakalayabilen gelişmiş bir casus script (injector) içerir.

1. Paneldeki **"API İsteği Yakala (JSON ve Metin)"** seçeneğini işaretleyin.
2. Sayfada dolaşmaya, kaydırmaya (infinite scroll) devam edin veya filtreleri değiştirin.
3. Eklenti, sayfanın arka planda yaptığı tüm API isteklerini (XHR/Fetch) ve bunların döndürdüğü örnek JSON yanıtlarını arka planda hafızaya kaydeder.
4. Kod üretilirken Gemini API, yakalanan API verilerini inceleyerek HTML yerine doğrudan bu JSON'lardan veri çekmeyi önceliklendirir. Bu, çok daha stabil ve hızlı çalışan Scrapy örümcekleri üretilmesini sağlar.

---

## 6. İnteraktif Kod Geliştirme Sohbeti

Ajanı çalıştırıp ilk kod çıktısını aldıktan sonra panelde **💬 Kod Geliştirme Sohbeti** arayüzü açılır.

- **Otomatik Kopyalama**: Kod üretildiğinde veya güncellendiğinde otomatik olarak panonuza (clipboard) kopyalanır.
- **Revizyon Talepleri**: Kodda bir hata fark ederseniz veya ekstra bir özellik eklenmesini isterseniz alt kısımdaki mesaj kutusuna doğrudan Türkçe olarak yazabilirsiniz (Örn: *"Verileri sqlite veri tabanına kaydedecek bir pipeline ekle"* veya *"Fiyat alanını çekerken sadece sayıları alacak şekilde regex kullan"*).
- **Yapay Zeka Yanıtı**: Gemini isteğinize göre kodu güncelleyecek ve yeni kodu tekrar panonuza kopyalayacaktır.

---

## 7. Örnek Bir Senaryo Çalıştırma

Bir e-ticaret sitesinden ürün adı ve fiyatlarını çekmek istediğinizi varsayalım:

1. E-ticaret sitesinde arama yapıp ürünleri listeleyin.
2. **🚀 Paneli Aç** diyerek eklenti panelini getirin.
3. Proje adını `ECommerce` yapın.
4. **➕ Yeni HTML Alanı Seç** diyerek listedeki ilk ürünün kutusunu seçin ve ismine `Urun_Karti` deyin.
5. Sayfayı biraz aşağı kaydırarak arka plandaki isteklerin yakalanmasını sağlayın. **API İsteği Yakala** seçeneğini işaretleyin.
6. Prompt alanına: *"Sayfadaki ürün kartlarını dolaş, ürün adını ve fiyatını çek. Sonraki sayfa butonunu takip ederek paginating yap."* yazın.
7. **🚀 Ajanı Çalıştır** butonuna basın.
8. Birkaç saniye içinde kod panonuza kopyalanacaktır. Konsolu (`F12 -> Console`) açarak da yazılan tam kodu görebilirsiniz.
9. Projenizde bu kodu doğrudan bir Python dosyasına yapıştırıp çalıştırabilirsiniz!

---

## 8. Sorun Giderme (Troubleshooting)

- **Gemini Düşünüyor yazısında takılı kalıyor**: 
  - Tarayıcı konsolunu (`F12 -> Console`) açarak API hatası olup olmadığını kontrol edin.
  - API Anahtarınızın doğru girildiğinden ve kotanızın bitmediğinden emin olun.
  - İnternet bağlantınızı kontrol edin.
- **Seçim yaparken sayfa yenileniyor**:
  - Bazı sitelerde bağlantılara tıklandığında sayfa yönlendirmesi tetiklenebilir. Bunu önlemek için seçim modundayken öğelerin üzerine dikkatlice tıklayın veya eklentinin API dinleme özelliğine ağırlık verin.
- **Kod güncellendi ama panoma gelmedi**:
  - Bazı durumlarda tarayıcının pano izni vermesi gerekebilir. Kodu tarayıcı konsolundan (`Console`) kopyalayabilirsiniz.
