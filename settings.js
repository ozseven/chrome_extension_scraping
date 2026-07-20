// =================================================================
// VARSAYILAN SYSTEM PROMPT
// =================================================================
const DEFAULT_SYSTEM_PROMPT = `Sen kıdemli bir Python ve Scrapy geliştiricisisi ve Reverse Engineering uzmanısın.
Kullanıcı senin için hedef sitelerde adım adım dolaştı ve verileri topladı.

JSON formatında yapılandırılmış veri alacaksın. Her adımda:
1. HTML öğeleri ve onların bulunduğu sayfa
2. API istekleri ve yanıtları

KURALLAR:
1. API (XHR/Fetch) verisi varsa DAİMA onu kullanmayı (JSON Parse) önceliklendir.
2. Sınıf ismi \`{SPIDER_NAME}Spider\` olsun.
3. Çıktıyı \`yield\` kullanarak verilen format'taki dictionary döndür.
4. Çekilen verilerdeki boşlukları \`.strip()\` ile temizle.
5. Hata almamak için try-except kullan.
6. SADECE ÇALIŞTIRILABİLİR PYTHON KODUNU VER. Markdown backticks dışında açıklama yazma.`;

// =================================================================
// VARSAYILAN AYARLAR
// =================================================================
const DEFAULT_SETTINGS = {
  apiKey: '',
  apiModel: 'gemini-3.5-flash',
  apiTimeout: 30,
  maxElements: 500,
  delayMs: 1000,
  autoScroll: true,
  theme: 'light',
  notifications: true,
  logLevel: 'info',
  enableDebug: false,
  cacheData: true,
  retryAttempts: 3,
  systemPrompt: DEFAULT_SYSTEM_PROMPT
};

// =================================================================
// AYARLAR YÖNETİMİ
// =================================================================
async function loadSettings() {
  return new Promise((resolve) => {
    // systemPrompt boyutu sync'in 8KB/item limitini kolayca aşabildiği için
    // ayrı olarak local storage'dan okunuyor.
    const { systemPrompt, ...syncDefaults } = DEFAULT_SETTINGS;

    chrome.storage.sync.get(syncDefaults, (syncSettings) => {
      chrome.storage.local.get(['systemPrompt'], (localSettings) => {
        const settings = { ...syncSettings, ...localSettings };

        // systemPrompt boşsa default'u kullan
        if (!settings.systemPrompt || settings.systemPrompt.trim() === '') {
          settings.systemPrompt = DEFAULT_SYSTEM_PROMPT;
        }
        // apiModel boşsa default'u kullan
        if (!settings.apiModel || settings.apiModel.trim() === '') {
          settings.apiModel = DEFAULT_SETTINGS.apiModel;
        }
        resolve(settings);
      });
    });
  });
}

async function saveSettings(settings) {
  // systemPrompt'u local'e, geri kalan (küçük) ayarları sync'e ayır.
  const { systemPrompt, ...syncSettings } = settings;

  await new Promise((resolve, reject) => {
    chrome.storage.local.set({ systemPrompt }, () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve();
    });
  });

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(syncSettings, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// =================================================================
// FORM DOLDURMA
// =================================================================
async function populateForm() {
  const settings = await loadSettings();

  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const element = document.getElementById(key);
    if (!element) return;

    if (element.type === 'checkbox') {
      element.checked = !!settings[key];
    } else {
      element.value = settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key];
    }
  });

  // API Key uyarısını göster/gizle
  const warningEl = document.getElementById('apiKeyWarning');
  if (warningEl) {
    warningEl.style.display = (!settings.apiKey || settings.apiKey.trim() === '') ? 'block' : 'none';
  }
}

// =================================================================
// FORM GÖNDERİMİ
// =================================================================
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusMessage = document.getElementById('statusMessage');
  const settings = {};

  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const element = document.getElementById(key);
    if (!element) return;

    if (element.type === 'checkbox') {
      settings[key] = element.checked;
    } else if (element.type === 'number') {
      settings[key] = parseInt(element.value) || DEFAULT_SETTINGS[key];
    } else {
      settings[key] = element.value;
    }
  });

  // API anahtarı zorunlu
  if (!settings.apiKey || settings.apiKey.trim() === '') {
    showStatus('⚠️ Lütfen Google Gemini API anahtarınızı girin!', 'error');
    document.getElementById('apiKey').focus();
    return;
  }

  // Model adı boşsa default kullan
  if (!settings.apiModel || settings.apiModel.trim() === '') {
      settings.apiModel = DEFAULT_SETTINGS.apiModel;
      document.getElementById('apiModel').value = settings.apiModel;
  }

  // System prompt boşsa default kullan
  if (!settings.systemPrompt || settings.systemPrompt.trim() === '') {
    settings.systemPrompt = DEFAULT_SYSTEM_PROMPT;
    document.getElementById('systemPrompt').value = DEFAULT_SYSTEM_PROMPT;
  }

  try {
    await saveSettings(settings);
    showStatus('✅ Ayarlar başarıyla kaydedildi!', 'success');

    // API key uyarısını gizle
    const warningEl = document.getElementById('apiKeyWarning');
    if (warningEl) warningEl.style.display = 'none';

    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 2500);
  } catch (error) {
    showStatus(`❌ Kayıt hatası: ${error.message}`, 'error');
  }
});

// =================================================================
// FORM SIFIRLAMA
// =================================================================
document.getElementById('settingsForm').addEventListener('reset', () => {
  setTimeout(() => {
    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      const element = document.getElementById(key);
      if (!element) return;

      if (element.type === 'checkbox') {
        element.checked = DEFAULT_SETTINGS[key];
      } else {
        element.value = DEFAULT_SETTINGS[key];
      }
    });

    showStatus('↻ Ayarlar varsayılana sıfırlandı (henüz kaydedilmedi)', 'success');
    setTimeout(() => {
      document.getElementById('statusMessage').style.display = 'none';
    }, 2500);
  }, 50);
});

// =================================================================
// DURUM MESAJI
// =================================================================
function showStatus(message, type) {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

// =================================================================
// TEMA UYGULAMA
// =================================================================
async function applyTheme() {
  const settings = await loadSettings();
  const theme = settings.theme;
  const container = document.querySelector('.container');

  if (theme === 'dark') {
    document.body.style.background = '#1a1a2e';
    container.style.background = '#16213e';
    container.style.color = '#eee';
  } else if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.style.background = '#1a1a2e';
      container.style.background = '#16213e';
      container.style.color = '#eee';
    }
  }
}

// =================================================================
// SAYFA YÜKLENME
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
  await populateForm();
  applyTheme();

  document.getElementById('theme').addEventListener('change', applyTheme);

  // System Prompt Sıfırlama Butonu
  const resetSystemPromptBtn = document.getElementById('resetSystemPromptBtn');
  if (resetSystemPromptBtn) {
    resetSystemPromptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('systemPrompt').value = DEFAULT_SYSTEM_PROMPT;
      showStatus('✅ Varsayılan System Prompt yüklendi (kaydetmeyi unutmayın)', 'success');
      setTimeout(() => {
        document.getElementById('statusMessage').style.display = 'none';
      }, 2500);
    });
  }
});

// =================================================================
// GLOBAL ERİŞİM
// =================================================================
window.getExtensionSettings = loadSettings;
window.saveExtensionSettings = saveSettings;
