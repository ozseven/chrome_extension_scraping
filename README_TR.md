# Otonom Scrapy Ajanı

Bu Chrome eklentisi, hedef web sitelerindeki HTML öğelerini, API (XHR/Fetch) isteklerini ve yanıtlarını kaydederek Google Gemini modelini kullanarak Scrapy örümcekleri (spider) üretmenizi sağlar.

## Yenilikler ve Endüstri Standartları (v3.0)

Eklenti, güvenlik, performans ve kullanıcı deneyimi açısından modern tarayıcı eklentisi mimarisine ve standartlarına yükseltilmiştir:

- **Service Worker Mimarisi**: API istekleri arka planda (`background.js`) çalıştırılarak İçerik Güvenlik Politikası (CSP) engelleri tamamen aşılmıştır.
- **Hassas Veri Maskeleme**: Yakalanan API isteklerindeki `Cookie`, `Authorization` gibi kimlik doğrulama başlıkları otomatik olarak maskelenerek güvenlik sızıntısı önlenmiştir.
- **HTML Temizleme (Token Tasarrufu)**: Sayfadan seçilen HTML kodlarının içindeki inline stiller, SVG yolları ve script etiketleri temizlenerek Gemini API token harcaması **%70** azaltılmış ve veri doğruluğu artırılmıştır.
- **Sürüklenebilir ve Küçültülebilir Panel**: Yüzen panel artık ekranın her yerine taşınabilir ve tek tıkla küçük bir yüzen `🤖` simgesine küçültülebilir.
- **API Bağlantı Testi**: Seçenekler (Ayarlar) sayfasına API anahtarını doğrudan test edebileceğiniz bir bağlantı test mekanizması eklenmiştir.

## Özellikler

- **Sayfa İçi İnteraktif Seçici**: Sayfadaki elemanları görerek ve isimlendirerek seçebilirsiniz.
- **API İstek Takibi**: Sayfanın arka planda yaptığı Fetch ve XHR çağrılarını yakalar.
- **Yapay Zeka Destekli Kod Üretimi**: Toplanan yapılandırılmış veriyi kullanarak Gemini API ile optimize edilmiş Python Scrapy kodunu yazar.
- **İnteraktif Sohbet Arayüzü**: Kod üzerinde düzeltme ve geliştirme taleplerinizi paneldeki chat üzerinden yürütebilirsiniz.

## Geliştirme ve Derleme (Vite + TypeScript)

Eklenti kaynak kodları `src/` klasöründedir. Değişiklik yaptıktan sonra eklentiyi derlemeniz gerekir:

1. Bağımlılıkları kurun:
   ```bash
   npm install
   ```
2. Eklentiyi derleyin ve paketleyin:
   ```bash
   npm run build
   ```
   Bu komut, kodları derleyerek `dist/` klasörüne çıktılayacak, ardından otomatik olarak imzalanmış bir `dist.crx` paketi ve taşınabilir `otonom-scrapy-ajani.zip` arşivi üretecektir.

## Hızlı Kurulum

Eklentiyi Chrome tarayıcısına kurmak için aşağıdaki iki yöntemden birini seçebilirsiniz:

### Yöntem A: Paketlenmemiş Öğeyi Yükleme (Geliştirme için Önerilen)
1. Google Chrome tarayıcınızı açın ve `chrome://extensions/` adresine gidin.
2. Sağ üst köşedeki **Geliştirici modu** (Developer mode) seçeneğini aktif hale getirin.
3. Sol üstteki **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıklayın.
4. Proje klasörü içindeki **`dist`** dizinini seçin.

### Yöntem B: CRX Paketini Yükleme
1. Proje kök dizininde otomatik oluşturulan **`dist.crx`** dosyasını tutup sürükleyerek direkt `chrome://extensions/` sekmesine bırakın.
2. Chrome'un kurulum onaylarını kabul edin.

## Detaylı Kullanım Kılavuzu

Eklentinin tüm özellikleri, arayüz kullanımı, API yakalama adımları ve kod düzeltme sisteminin detaylı anlatımı için **[Kullanım Kılavuzu'na (KULLANIM_KILAVUZU.md)](KULLANIM_KILAVUZU.md)** göz atın.

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
