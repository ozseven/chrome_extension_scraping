# Otonom Scrapy Ajanı

Bu Chrome eklentisi, hedef web sitelerindeki HTML öğelerini, API (XHR/Fetch) isteklerini ve yanıtlarını kaydederek Google Gemini modelini kullanarak Scrapy örümcekleri (spider) üretmenizi sağlar.

## Özellikler

- **Sayfa İçi Takip**: Sayfada dolaşırken tıklanan elementleri ve DOM yapısını analiz eder.
- **XHR/Fetch İstek Takibi**: Sayfanın arka planda yaptığı API isteklerini yakalar.
- **Yapay Zeka Destekli Kod Üretimi**: Toplanan verileri kullanarak Gemini API aracılığıyla otomatik Scrapy spider kodu üretir.
- **İnteraktif Sohbet Arayüzü**: Kod üzerinde düzeltme ve geliştirme isteklerinizi doğrudan eklenti içinden iletebilirsiniz.
- **Kolay Ayarlar**: Gemini API anahtarınızı, model seçiminizi ve özel sistem yönergelerinizi kolayca yapılandırabilirsiniz.

  <img width="594" height="2314" alt="image" src="https://github.com/user-attachments/assets/b6e24d1f-9490-48f7-a762-70dbf4c0e33b" />


## Hızlı Kurulum

1. Bu depoyu yerel bilgisayarınıza klonlayın:
   ```bash
   git clone git@github.com:ozseven/chrome_extension_scraping.git
   ```
2. Google Chrome tarayıcınızı açın ve `chrome://extensions/` adresine gidin.
3. Sağ üst köşedeki **Geliştirici modu** (Developer mode) seçeneğini aktif hale getirin.
4. Sol üstteki **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıklayın.
5. Bu projenin dizinini seçin.

## Detaylı Kullanım Kılavuzu

Eklentinin tüm özellikleri, arayüz kullanımı, API yakalama adımları ve kod düzeltme sisteminin detaylı anlatımı için **[Kullanım Kılavuzu'na (KULLANIM_KILAVUZU.md)](file:///d:/Programlama/Chrome_web_extension_for_scraping/chrome_extension/KULLANIM_KILAVUZU.md)** göz atın.

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
