# Otonom Scrapy Ajanı

Bu Chrome eklentisi, hedef web sitelerindeki HTML öğelerini, API (XHR/Fetch) isteklerini ve yanıtlarını kaydederek Google Gemini modelini kullanarak Scrapy örümcekleri (spider) üretmenizi sağlar.

## Özellikler

- **Sayfa İçi Takip**: Sayfada dolaşırken tıklanan elementleri ve DOM yapısını analiz eder.
- **XHR/Fetch İstek Takibi**: Sayfanın arka planda yaptığı API isteklerini yakalar.
- **Yapay Zeka Destekli Kod Üretimi**: Toplanan verileri kullanarak Gemini API aracılığıyla otomatik Scrapy spider kodu üretir.
- **İnteraktif Sohbet Arayüzü**: Kod üzerinde düzeltme ve geliştirme isteklerinizi doğrudan eklenti içinden iletebilirsiniz.
- **Kolay Ayarlar**: Gemini API anahtarınızı, model seçiminizi ve özel sistem yönergelerinizi kolayca yapılandırabilirsiniz.


<img width="1024" height="1105" alt="Gemini_Generated_Image_qmp7zwqmp7zwqmp7" src="https://github.com/user-attachments/assets/638ff13b-32b9-4c58-99e7-989393b8acf4" />
<img width="1024" height="990" alt="Gemini_Generated_Image_qmp7zwqmp7zwqmp7_1" src="https://github.com/user-attachments/assets/521241a6-5349-4e04-bd31-8e1a8220e50c" />
<img width="1024" height="905" alt="Gemini_Generated_Image_qmp7zwqmp7zwqmp7_2" src="https://github.com/user-attachments/assets/d1cb2aca-a094-4cd0-a634-81abe0818b8c" />
<img width="959" height="928" alt="Gemini_Generated_Image_qmp7zwqmp7zwqmp7_3" src="https://github.com/user-attachments/assets/7580c6b3-7b78-474d-8199-4ccf8c86a9a8" />




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
