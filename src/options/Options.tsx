import React, { useEffect, useState } from 'react';
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

const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [testStatus, setTestStatus] = useState<{ text: string; type: 'success' | 'error' | 'info' | '' }>({ text: '', type: '' });
  const [saveStatus, setSaveStatus] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [testing, setTesting] = useState<boolean>(false);

  useEffect(() => {
    // Load fonts
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);

    // Load initial settings
    chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
      const merged = { ...DEFAULT_SETTINGS, ...stored } as ExtensionSettings;
      if (!merged.systemPrompt || merged.systemPrompt.trim() === '') {
        merged.systemPrompt = DEFAULT_SYSTEM_PROMPT;
      }
      setSettings(merged);
      applyTheme(merged.theme);
    });
  }, []);

  const applyTheme = (theme: ExtensionSettings['theme']) => {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.body.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
      document.body.style.color = '#cbd5e1';
    } else {
      document.body.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)';
      document.body.style.color = '#1e293b';
    }
  };

  const handleInputChange = (key: keyof ExtensionSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    if (key === 'theme') {
      applyTheme(value);
    }
  };

  const handleTestConnection = () => {
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      setTestStatus({ text: '⚠️ Önce API anahtarı alanını doldurun!', type: 'error' });
      return;
    }

    setTesting(true);
    setTestStatus({ text: '🔄 Gemini API ile güvenli bağlantı kuruluyor...', type: 'info' });

    const message: RuntimeMessage = {
      action: 'TEST_API_CONNECTION',
      apiKey: settings.apiKey,
      apiModel: settings.apiModel
    };

    chrome.runtime.sendMessage(message, (response: any) => {
      setTesting(false);
      if (chrome.runtime.lastError) {
        setTestStatus({ text: `❌ Bağlantı hatası: ${chrome.runtime.lastError.message}`, type: 'error' });
        return;
      }

      if (response.success) {
        setTestStatus({
          text: `✅ Bağlantı Başarılı! Gemini yanıt verdi: "${response.data}"`,
          type: 'success'
        });
      } else {
        setTestStatus({ text: `❌ Test Başarısız! Hata: ${response.error}`, type: 'error' });
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!settings.apiKey || settings.apiKey.trim() === '') {
      setSaveStatus({ text: '⚠️ Lütfen Google Gemini API anahtarınızı girin!', type: 'error' });
      return;
    }

    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        setSaveStatus({ text: `❌ Kayıt hatası: ${chrome.runtime.lastError.message}`, type: 'error' });
      } else {
        setSaveStatus({ text: '✅ Ayarlar başarıyla kaydedildi!', type: 'success' });
        setTimeout(() => {
          setSaveStatus({ text: '', type: '' });
        }, 2500);
      }
    });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
    setSaveStatus({ text: '↻ Ayarlar varsayılana sıfırlandı (henüz kaydedilmedi)', type: 'success' });
    setTimeout(() => {
      setSaveStatus({ text: '', type: '' });
    }, 2500);
  };

  const handleRestoreSystemPrompt = () => {
    handleInputChange('systemPrompt', DEFAULT_SYSTEM_PROMPT);
    setSaveStatus({ text: '✅ Varsayılan System Prompt yüklendi (kaydetmeyi unutmayın)', type: 'success' });
    setTimeout(() => {
      setSaveStatus({ text: '', type: '' });
    }, 2500);
  };

  const isDarkTheme = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="container" style={isDarkTheme ? darkStyles.container : lightStyles.container}>
      {/* Dynamic styling override */}
      <style>{`
        body {
          font-family: 'Outfit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          min-height: 100vh;
          padding: 40px 20px;
          transition: background 0.3s, color 0.3s;
        }
        .container {
          max-width: 650px;
          margin: 0 auto;
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          padding: 40px;
          transition: background 0.3s, color 0.3s, border-color 0.3s;
        }
        h1 {
          margin-bottom: 30px;
          text-align: center;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 20px;
          font-size: 26px;
          font-weight: 700;
        }
        h1 span {
          color: #10b981;
        }
        .settings-group {
          margin-bottom: 30px;
          padding: 25px;
          border-radius: 12px;
          border-left: 4px solid #10b981;
          transition: background 0.3s, border-color 0.3s;
        }
        .settings-group h2 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 0;
        }
        .setting-item {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .setting-item:last-child {
          margin-bottom: 0; padding-bottom: 0; border-bottom: none;
        }
        .setting-item label {
          display: block; font-weight: 500;
          margin-bottom: 8px; font-size: 13px;
        }
        .setting-item .description {
          font-size: 12px; color: #64748b; margin-top: 6px; line-height: 1.5;
        }
        .setting-item .description a {
          color: #3b82f6;
          text-decoration: none;
        }
        .setting-item .description a:hover {
          text-decoration: underline;
        }
        input[type="text"],
        input[type="password"],
        input[type="number"],
        select,
        textarea {
          width: 100%; padding: 10px 12px; 
          border-radius: 8px; font-family: inherit;
          font-size: 13px; transition: all 0.3s;
        }
        input[type="checkbox"] {
          margin-right: 10px; cursor: pointer; width: 16px; height: 16px;
          accent-color: #10b981;
        }
        .checkbox-label { display: flex; align-items: center; font-size: 13px; cursor: pointer; }
        .button-group {
          display: flex; gap: 15px; margin-top: 30px; justify-content: center;
        }
        button {
          padding: 12px 30px; border: none; border-radius: 8px;
          cursor: pointer; font-weight: 600; font-size: 13px;
          transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.5px;
          font-family: inherit;
        }
        .divider {
          height: 1px;
          margin: 30px 0;
        }
        .model-hint {
          font-size: 11px; color: #64748b; margin-top: 6px;
        }
      `}</style>

      <h1>🔧 Eklenti <span>Ayarları</span></h1>

      {/* Warning banner if API key is missing */}
      {(!settings.apiKey || settings.apiKey.trim() === '') && (
        <div style={isDarkTheme ? darkStyles.apiKeyWarning : lightStyles.apiKeyWarning}>
          ⚠️ <strong>API Anahtarı Bulunamadı!</strong> Eklentiyi kullanmak için aşağıya Google Gemini API anahtarınızı girin ve <strong>Kaydet</strong>'e basın.
        </div>
      )}

      <div style={isDarkTheme ? darkStyles.infoBanner : lightStyles.infoBanner}>
        💡 Tüm ayarları buradan özelleştirebilirsiniz. Gemini API anahtarı ve model adı burada saklanır ve güvenli bir şekilde arka plan servisinde (Service Worker) çalıştırılır.
      </div>

      <form onSubmit={handleSave}>
        
        {/* API Settings */}
        <div className="settings-group" style={isDarkTheme ? darkStyles.settingsGroup : lightStyles.settingsGroup}>
          <h2>🔑 API Ayarları</h2>

          <div className="setting-item">
            <label>Google Gemini API Anahtarı</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="AIza... şeklinde API anahtarınızı girin"
                style={isDarkTheme ? darkStyles.input : lightStyles.input}
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  minWidth: '140px',
                  margin: 0,
                  textTransform: 'none',
                  letterSpacing: 0,
                  fontWeight: 600,
                  boxShadow: '0 4px 10px rgba(59,130,246,0.15)'
                }}
              >
                {testing ? '⏳ Test Ediliyor...' : '⚡ Bağlantıyı Test Et'}
              </button>
            </div>
            {testStatus.text && (
              <div style={{
                fontSize: '12px',
                marginTop: '8px',
                fontWeight: 500,
                padding: '6px 10px',
                borderRadius: '4px',
                ...getStatusBoxStyle(testStatus.type)
              }}>
                {testStatus.text}
              </div>
            )}
            <div className="description">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>'dan ücretsiz alabilirsiniz.
            </div>
          </div>

          <div className="setting-item">
            <label>AI Model Adı</label>
            <input
              type="text"
              value={settings.apiModel}
              onChange={(e) => handleInputChange('apiModel', e.target.value)}
              placeholder="gemini-2.5-flash"
              style={isDarkTheme ? darkStyles.input : lightStyles.input}
            />
            <div className="model-hint">
              Örnek modeller: <code>gemini-2.5-flash</code> · <code>gemini-2.5-pro</code> · <code>gemini-2.0-flash</code> · <code>gemini-1.5-pro</code>
            </div>
            <div className="description">Kullanmak istediğiniz Gemini model adını yazın.</div>
          </div>

          <div className="setting-item">
            <label>API Zaman Aşımı (saniye)</label>
            <input
              type="number"
              value={settings.apiTimeout}
              min="5"
              max="300"
              onChange={(e) => handleInputChange('apiTimeout', parseInt(e.target.value) || DEFAULT_SETTINGS.apiTimeout)}
              style={isDarkTheme ? darkStyles.input : lightStyles.input}
            />
            <div className="description">API isteğinin maksimum bekleme süresi.</div>
          </div>
        </div>

        <div className="divider" style={isDarkTheme ? darkStyles.divider : lightStyles.divider}></div>

        {/* Scraping Settings */}
        <div className="settings-group" style={isDarkTheme ? darkStyles.settingsGroup : lightStyles.settingsGroup}>
          <h2>🕷️ Web Kazıcı Ayarları</h2>

          <div className="setting-item">
            <label>Maksimum Eleman Sayısı</label>
            <input
              type="number"
              value={settings.maxElements}
              min="1"
              max="1000"
              onChange={(e) => handleInputChange('maxElements', parseInt(e.target.value) || DEFAULT_SETTINGS.maxElements)}
              style={isDarkTheme ? darkStyles.input : lightStyles.input}
            />
            <div className="description">Tek seferde işlenecek maksimum sayfa elemanı.</div>
          </div>

          <div className="setting-item">
            <label>İstekler Arası Gecikme (ms)</label>
            <input
              type="number"
              value={settings.delayMs}
              min="0"
              max="5000"
              onChange={(e) => handleInputChange('delayMs', parseInt(e.target.value) || DEFAULT_SETTINGS.delayMs)}
              style={isDarkTheme ? darkStyles.input : lightStyles.input}
            />
            <div className="description">Ardışık istekler arasında bekleme süresi.</div>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.autoScroll}
                onChange={(e) => handleInputChange('autoScroll', e.target.checked)}
              />
              <span>Otomatik Kaydırma</span>
            </label>
            <div className="description">Veri toplama sırasında sayfayı otomatik kaydır.</div>
          </div>
        </div>

        <div className="divider" style={isDarkTheme ? darkStyles.divider : lightStyles.divider}></div>

        {/* Appearance Settings */}
        <div className="settings-group" style={isDarkTheme ? darkStyles.settingsGroup : lightStyles.settingsGroup}>
          <h2>🎨 Görünüm ve Davranış</h2>

          <div className="setting-item">
            <label>Tema</label>
            <select
              value={settings.theme}
              onChange={(e) => handleInputChange('theme', e.target.value as ExtensionSettings['theme'])}
              style={isDarkTheme ? darkStyles.select : lightStyles.select}
            >
              <option value="light">Açık Tema</option>
              <option value="dark">Koyu Tema</option>
              <option value="auto">Sistem Teması</option>
            </select>
            <div className="description">Eklentinin görünüm teması.</div>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleInputChange('notifications', e.target.checked)}
              />
              <span>Bildirimleri Göster</span>
            </label>
            <div className="description">İşlem sonuçları hakkında bildirim göster.</div>
          </div>

          <div className="setting-item">
            <label>Günlük Seviyesi</label>
            <select
              value={settings.logLevel}
              onChange={(e) => handleInputChange('logLevel', e.target.value as ExtensionSettings['logLevel'])}
              style={isDarkTheme ? darkStyles.select : lightStyles.select}
            >
              <option value="info">Bilgi</option>
              <option value="debug">Hata Ayıklama</option>
              <option value="error">Sadece Hatalar</option>
            </select>
            <div className="description">Kaydedilecek günlük detay seviyesi.</div>
          </div>
        </div>

        <div className="divider" style={isDarkTheme ? darkStyles.divider : lightStyles.divider}></div>

        {/* Advanced Settings */}
        <div className="settings-group" style={isDarkTheme ? darkStyles.settingsGroup : lightStyles.settingsGroup}>
          <h2>⚙️ Gelişmiş Ayarlar</h2>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.enableDebug}
                onChange={(e) => handleInputChange('enableDebug', e.target.checked)}
              />
              <span>Hata Ayıklama Modu</span>
            </label>
            <div className="description">Tarayıcı konsolunda ayrıntılı günlükler göster.</div>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.cacheData}
                onChange={(e) => handleInputChange('cacheData', e.target.checked)}
              />
              <span>Verileri Önbelleğe Al</span>
            </label>
            <div className="description">Başarılı istekleri yerel belleğe kaydet.</div>
          </div>

          <div className="setting-item">
            <label>Yeniden Deneme Sayısı</label>
            <input
              type="number"
              value={settings.retryAttempts}
              min="0"
              max="10"
              onChange={(e) => handleInputChange('retryAttempts', parseInt(e.target.value) || DEFAULT_SETTINGS.retryAttempts)}
              style={isDarkTheme ? darkStyles.input : lightStyles.input}
            />
            <div className="description">Başarısız istekleri yeniden deneme sayısı.</div>
          </div>
        </div>

        <div className="divider" style={isDarkTheme ? darkStyles.divider : lightStyles.divider}></div>

        {/* System Prompt Customization */}
        <div className="settings-group" style={isDarkTheme ? darkStyles.settingsGroup : lightStyles.settingsGroup}>
          <h2>🧠 System Prompt Özelleştirmesi</h2>

          <div className="setting-item">
            <label>AI Komut Sistemi (System Prompt)</label>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
              style={{
                width: '100%', height: '180px', padding: '10px',
                fontFamily: "'Courier New', monospace", fontSize: '12px',
                resize: 'vertical', lineHeight: 1.5,
                ...(isDarkTheme ? darkStyles.textarea : lightStyles.textarea)
              }}
            />
            <div className="description">Yapay zekaya verilen talimatlar. Boş bırakırsanız veya sıfırlarsanız varsayılan prompt kullanılır.</div>
            <button
              type="button"
              onClick={handleRestoreSystemPrompt}
              style={{
                width: '100%', padding: '10px', marginTop: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                textTransform: 'none', letterSpacing: 0,
                boxShadow: '0 4px 10px rgba(245,158,11,0.15)'
              }}
            >
              ⟲ VARSAYILAN SYSTEM PROMPT'U GERİ YÜKLE
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="button-group">
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white', minWidth: '140px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)'
            }}
          >
            💾 Kaydet
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: isDarkTheme ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
              color: isDarkTheme ? '#cbd5e1' : '#1e293b',
              border: isDarkTheme ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1',
              minWidth: '140px'
            }}
          >
            ↻ Sıfırla
          </button>
        </div>

        {/* Global Success / Error Status messages */}
        {saveStatus.text && (
          <div style={{
            marginTop: '20px', padding: '12px', borderRadius: '8px',
            textAlign: 'center', fontWeight: 600, fontSize: '13px',
            animation: 'slideIn 0.3s ease',
            ...getStatusBoxStyle(saveStatus.type)
          }}>
            {saveStatus.text}
          </div>
        )}
      </form>
    </div>
  );
};

const getStatusBoxStyle = (type: string) => {
  if (type === 'success') {
    return {
      background: 'rgba(16, 185, 129, 0.1)',
      color: '#34d399',
      border: '1px solid rgba(16, 185, 129, 0.2)'
    };
  } else if (type === 'error') {
    return {
      background: 'rgba(239, 68, 68, 0.1)',
      color: '#f87171',
      border: '1px solid rgba(239, 68, 68, 0.2)'
    };
  } else {
    // info
    return {
      background: 'rgba(56, 189, 248, 0.1)',
      color: '#38bdf8',
      border: '1px solid rgba(56, 189, 248, 0.2)'
    };
  }
};

const darkStyles = {
  container: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  settingsGroup: {
    background: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  input: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
  },
  select: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
  },
  textarea: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
  },
  divider: {
    background: 'rgba(255, 255, 255, 0.06)',
  },
  apiKeyWarning: {
    background: 'rgba(245, 158, 11, 0.1)',
    borderLeft: '4px solid #f59e0b',
    padding: '12px 16px',
    marginBottom: '25px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#fbbf24',
    lineHeight: 1.5,
  },
  infoBanner: {
    background: 'rgba(59, 130, 246, 0.08)',
    borderLeft: '4px solid #3b82f6',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#93c5fd',
    lineHeight: 1.5,
  }
};

const lightStyles = {
  container: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
  },
  settingsGroup: {
    background: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  input: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#1e293b',
  },
  select: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#1e293b',
  },
  textarea: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#1e293b',
  },
  divider: {
    background: '#cbd5e1',
  },
  apiKeyWarning: {
    background: '#fef3c7',
    borderLeft: '4px solid #d97706',
    padding: '12px 16px',
    marginBottom: '25px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#92400e',
    lineHeight: 1.5,
  },
  infoBanner: {
    background: '#dbeafe',
    borderLeft: '4px solid #2563eb',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: 1.5,
  }
};

export default Options;
