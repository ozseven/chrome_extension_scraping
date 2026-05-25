# Otonom Scrapy Ajanı

Bu Chrome eklentisi, hedef web sitelerindeki HTML öğelerini, API (XHR/Fetch) isteklerini ve yanıtlarını kaydederek Google Gemini modelini kullanarak Scrapy örümcekleri (spider) üretmenizi sağlar.

## Özellikler

- **Sayfa İçi Takip**: Sayfada dolaşırken tıklanan elementleri ve DOM yapısını analiz eder.
- **XHR/Fetch İstek Takibi**: Sayfanın arka planda yaptığı API isteklerini yakalar.
- **Yapay Zeka Destekli Kod Üretimi**: Toplanan verileri kullanarak Gemini API aracılığıyla otomatik Scrapy spider kodu üretir.
- **Kolay Ayarlar**: Gemini API anahtarınızı, model seçiminizi ve özel sistem yönergelerinizi kolayca yapılandırabilirsiniz.

## Kurulum

1. Bu depoyu yerel bilgisayarınıza indirin veya klonlayın.
2. Google Chrome tarayıcınızı açın ve `chrome://extensions/` adresine gidin.
3. Sağ üst köşedeki **Geliştirici modu** (Developer mode) seçeneğini aktif hale getirin.
4. Sol üstteki **Paketlenmemiş öğe yükle** (Load unpacked) butonuna tıklayın.
5. Bu projenin dizinini seçin.

## Ayarlar

Eklentiyi kullanmaya başlamadan önce eklenti simgesine sağ tıklayarak **Seçenekler** (Options) sayfasına gidin veya popup üzerinden ayarlara erişin. Buraya Google Gemini API anahtarınızı girmeniz gerekmektedir.
