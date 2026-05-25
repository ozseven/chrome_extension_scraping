document.addEventListener('DOMContentLoaded', () => {

  // =====================================================
  // PANEL AÇ butonu
  // =====================================================
  document.getElementById('startBtn').addEventListener('click', async () => {
    try {
      // Önce API key kontrolü yap
      const stored = await new Promise((resolve) => {
        chrome.storage.sync.get(['apiKey'], (result) => resolve(result));
      });

      if (!stored.apiKey || stored.apiKey.trim() === '') {
        // API key kaydedilmemiş — ayarlar sayfasını aç
        const openSettings = confirm(
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

      // API key var, paneli aç
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      chrome.tabs.sendMessage(tab.id, { action: 'START_SELECTION' }, (response) => {
        if (chrome.runtime.lastError) {
          // Script henüz yüklenmemişse, manuel yükle
          chrome.scripting.executeScript(
            { target: { tabId: tab.id }, files: ['content.js'] },
            () => {
              if (!chrome.runtime.lastError) {
                chrome.scripting.executeScript(
                  { target: { tabId: tab.id }, files: ['inject.js'], world: 'MAIN' },
                  () => {
                    chrome.tabs.sendMessage(tab.id, { action: 'START_SELECTION' });
                  }
                );
              }
            }
          );
        }
      });

      window.close();
    } catch (error) {
      alert(`Eklenti hatası: ${error.message}`);
    }
  });

  // =====================================================
  // AYARLAR butonu
  // =====================================================
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // =====================================================
  // API KEY DURUMUNU POPUP'TA GÖSTER
  // =====================================================
  chrome.storage.sync.get(['apiKey', 'apiModel'], (result) => {
    const statusEl = document.getElementById('apiKeyStatus');
    if (!statusEl) return;
    if (result.apiKey && result.apiKey.trim() !== '') {
      const model = result.apiModel || 'gemini-3.5-flash';
      statusEl.textContent = `✅ API Key kayıtlı  |  Model: ${model}`;
      statusEl.style.color = '#155724';
      statusEl.style.background = '#d4edda';
      statusEl.style.border = '1px solid #c3e6cb';
    } else {
      statusEl.textContent = '⚠️ API Key girilmemiş! Ayarlar sayfasından girin.';
      statusEl.style.color = '#856404';
      statusEl.style.background = '#fff3cd';
      statusEl.style.border = '1px solid #ffeeba';
    }
  });

});
