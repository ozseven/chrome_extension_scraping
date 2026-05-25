import { ExtensionSettings, RuntimeMessage } from '../types';

const DEFAULT_SYSTEM_PROMPT = `Sen kıdemli bir Python ve Scrapy geliştiricisisi ve Reverse Engineering uzmanısın.
Kullanıcı senin için hedef sitelerde adım adım dolaştı ve verileri topladı.

JSON formatında yapılandırılmış veri alacaksın. Her adımda:
1. HTML öğeleri ve onun bulunduğu sayfa
2. API istekleri ve yanıtları

KURALLAR:
1. API (XHR/Fetch) verisi varsa DAİMA onu kullanmayı (JSON Parse) önceliklendir.
2. Sınıf ismi \`{SPIDER_NAME}Spider\` olsun.
3. Çıktıyı \`yield\` kullanarak verilen format'taki dictionary döndür.
4. Çekilen verilerdeki boşlukları \`.strip()\` ile temizle.
5. Hata almamak için try-except kullan.
6. SADECE ÇALIŞTIRILABİLİR PYTHON KODUNU VER. Markdown backticks dışında açıklama yazma.`;

const DEFAULT_SETTINGS: ExtensionSettings = {
  apiKey: '',
  apiModel: 'gemini-2.5-flash',
  apiTimeout: 30,
  maxElements: 500,
  delayMs: 1000,
  autoScroll: true,
  theme: 'dark',
  notifications: true,
  logLevel: 'info',
  enableDebug: false,
  cacheData: true,
  retryAttempts: 3,
  systemPrompt: DEFAULT_SYSTEM_PROMPT
};

// Kurulumda varsayılan ayarları yükle
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (settings) => {
    const updatedSettings = { ...DEFAULT_SETTINGS, ...settings };
    chrome.storage.sync.set(updatedSettings);
    console.log("🤖 Otonom Scrapy Ajanı: Varsayılan ayarlar yüklendi.");
  });
});

// Mesaj dinleyici
chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (message.action === 'GET_TAB_ID') {
    sendResponse({ tabId: sender.tab?.id });
    return false;
  }

  if (message.action === 'GEMINI_CALL') {
    handleGeminiCall(message.payload)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Asenkron sendResponse için true
  }

  if (message.action === 'TEST_API_CONNECTION') {
    handleTestConnection(message.apiKey, message.apiModel)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Asenkron sendResponse için true
  }
});

// Gemini API'sini çağır
async function handleGeminiCall(payload: { apiKey: string; apiModel: string; systemPrompt: string; content: any }) {
  const { apiKey, apiModel, systemPrompt, content } = payload;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [{
      parts: [{ text: typeof content === 'string' ? content : JSON.stringify(content, null, 2) }]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Hata Yanıtı:", errorText);
    let errorMessage = `HTTP Hata Kodu: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error && errorJson.error.message) {
        errorMessage = errorJson.error.message;
      }
    } catch (e) {}
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result;
}

// API Anahtarını test et (Bağlantı Testi)
async function handleTestConnection(apiKey: string, apiModel: string) {
  const model = apiModel || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      parts: [{ text: "Hello! Reply with exactly one word: OK" }]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP Hata Kodu: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error && errorJson.error.message) {
        errorMessage = errorJson.error.message;
      }
    } catch (e) {}
    throw new Error(errorMessage);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  return text;
}
