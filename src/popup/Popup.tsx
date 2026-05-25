import React, { useEffect, useState } from 'react';

const Popup: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [apiModel, setApiModel] = useState<string>('gemini-2.5-flash');
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    // Load font
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);

    // Retrieve storage sync
    chrome.storage.sync.get(['apiKey', 'apiModel'], (result) => {
      if (result.apiKey) setApiKey(result.apiKey);
      if (result.apiModel) setApiModel(result.apiModel);
      setChecking(false);
    });
  }, []);

  const handleStartSelection = async () => {
    if (!apiKey || apiKey.trim() === '') {
      const openSettings = window.confirm(
        '⚠️ Google Gemini API Anahtarı bulunamadı!\n\n' +
        'Eklentiyi kullanmak için önce Ayarlar sayfasından API anahtarınızı girmeniz gerekiyor.\n\n' +
        '✅ Tamam → Ayarlar sayfasını aç\n' +
        '❌ İptal → Kapat'
      );
      if (openSettings) {
        chrome.runtime.openOptionsPage();
      }
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      const messagePayload = { action: 'START_SELECTION', tabId: tab.id };

      chrome.tabs.sendMessage(tab.id, messagePayload, () => {
        if (chrome.runtime.lastError) {
          // If script is not loaded, inject content.js and inject.js
          chrome.scripting.executeScript(
            { target: { tabId: tab.id! }, files: ['content.js'] },
            () => {
              if (!chrome.runtime.lastError) {
                chrome.scripting.executeScript(
                  { target: { tabId: tab.id! }, files: ['inject.js'], world: 'MAIN' },
                  () => {
                    chrome.tabs.sendMessage(tab.id!, messagePayload);
                  }
                );
              }
            }
          );
        }
      });

      window.close();
    } catch (error: any) {
      alert(`Eklenti hatası: ${error.message}`);
    }
  };

  const handleOpenSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <h2 style={styles.h2}>🤖 Otonom <span style={styles.h2Span}>Scrapy</span> Ajanı</h2>

        {/* API Key Status */}
        {checking ? (
          <div style={{ ...styles.statusBox, ...styles.statusChecking }}>⏳ Kontrol ediliyor...</div>
        ) : apiKey && apiKey.trim() !== '' ? (
          <div style={{ ...styles.statusBox, ...styles.statusSuccess }}>
            🟢 API Key Kayıtlı | Model: {apiModel}
          </div>
        ) : (
          <div style={{ ...styles.statusBox, ...styles.statusWarning }}>
            ⚠️ API Key Girilmemiş! Ayarlar sayfasından girin.
          </div>
        )}

        {/* Info Box */}
        <div style={styles.infoBox}>
          ⚡ HTML alanı seçin veya API isteklerini yakalayın; Gemini sizin için anında hazır Scrapy Spider yazsın!
        </div>

        {/* Button Controls */}
        <div style={styles.btnContainer}>
          <button id="startBtn" onClick={handleStartSelection} style={{ ...styles.button, ...styles.startBtn }}>
            🚀 Paneli Aç
          </button>
          <button id="settingsBtn" onClick={handleOpenSettings} style={{ ...styles.button, ...styles.settingsBtn }}>
            ⚙️ Ayarlar
          </button>
        </div>

        <div style={styles.footerText}>
          API Anahtarı ve Model ayarları için <strong style={{ color: '#94a3b8' }}>Ayarlar</strong> sekmesini kullanabilirsiniz.
        </div>
      </div>
    </div>
  );
};

const styles = {
  body: {
    width: '350px',
    padding: '20px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: '#e2e8f0',
    fontFamily: "'Outfit', 'Segoe UI', sans-serif",
    borderRadius: '8px',
  },
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  h2: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '10px',
    margin: 0,
  },
  h2Span: {
    color: '#10b981',
  },
  statusBox: {
    padding: '12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.4,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  statusChecking: {
    background: '#1e293b',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  statusSuccess: {
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  statusWarning: {
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  infoBox: {
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '12px',
    color: '#93c5fd',
    lineHeight: 1.5,
  },
  btnContainer: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  button: {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  startBtn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)',
  },
  settingsBtn: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#e2e8f0',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  footerText: {
    fontSize: '10px',
    color: '#64748b',
    textAlign: 'center' as const,
    paddingTop: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    lineHeight: 1.4,
  },
};

export default Popup;
