import { AgentState, RuntimeMessage, SelectedHTMLItem } from '../types';

declare global {
  interface Window {
    __SA_CONTENT_LOADED__?: boolean;
  }
}

// =================================================================
// GUARD: Birden fazla inject'i önle
// =================================================================
if (typeof window.__SA_CONTENT_LOADED__ !== 'undefined') {
    // Zaten çalışıyor, yeniden başlatma
} else {
window.__SA_CONTENT_LOADED__ = true;

// Google Fonts - Outfit fontunu yükle
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
document.head.appendChild(fontLink);

let storageLoaded = false;
let tabId: string | number = "global"; // default fallback
const tempApiRequests: any[] = [];

// Sekme ID'sini al
chrome.runtime.sendMessage({ action: 'GET_TAB_ID' }, (response: any) => {
    if (response && response.tabId) {
        tabId = response.tabId;
    }
    initializeState();
});

// =================================================================
// 1. CASUS SCRIPT VE API DİNLEME
// =================================================================
window.addEventListener("message", (event) => {
    if (event.source === window && event.data && event.data.type === "SA_INTERCEPTED_API") {
        const newApi = {
            page_url: window.location.href.split('?')[0],
            url: event.data.url,
            method: event.data.method,
            headers: event.data.headers,
            request_body: event.data.request_body,
            response_body: event.data.data
        };
        
        if (storageLoaded) {
            if (!agentState.apiRequests.some(api => api.url === newApi.url)) {
                agentState.apiRequests.push(newApi);
                saveState();
            }
        } else {
            if (!tempApiRequests.some(api => api.url === newApi.url)) {
                tempApiRequests.push(newApi);
            }
        }
    }
});

// =================================================================
// 2. GELİŞMİŞ VE SEKME BAZLI HAFIZA (STATE MANAGEMENT)
// =================================================================
let agentState: AgentState = {
    isPanelOpen: false,
    isMinimized: false,
    projectName: "",
    promptText: "",
    isInfinite: false,
    selectedItems: [],
    apiRequests: [],
    conversationHistory: [],
    lastCode: "",
    panelPos: null
};
const activeNodes: Record<number, HTMLElement> = {}; 

function getStateKey(): string {
    return `sa_state_${tabId}`;
}

function saveState() {
    if (document.getElementById('scrapy-agent-panel')) {
        const projNameInput = document.getElementById('sa-project-name') as HTMLInputElement | null;
        const userPromptInput = document.getElementById('sa-user-prompt') as HTMLTextAreaElement | null;
        const isInfiniteInput = document.getElementById('sa-is-infinite') as HTMLInputElement | null;
        
        if (projNameInput) agentState.projectName = projNameInput.value;
        if (userPromptInput) agentState.promptText = userPromptInput.value;
        if (isInfiniteInput) agentState.isInfinite = isInfiniteInput.checked;
    }
    const stateObj: Record<string, AgentState> = {};
    stateObj[getStateKey()] = agentState;
    chrome.storage.local.set(stateObj);
}

function initializeState() {
    const key = getStateKey();
    chrome.storage.local.get([key], (result) => {
        if (result[key]) {
            agentState = result[key];
            if (!agentState.apiRequests) agentState.apiRequests = [];
            if (!agentState.selectedItems) agentState.selectedItems = [];
            if (!agentState.conversationHistory) agentState.conversationHistory = [];
            if (!agentState.lastCode) agentState.lastCode = "";
        }
        
        // Geçici olarak biriken istekleri ana listeye aktar
        tempApiRequests.forEach(newApi => {
            if (!agentState.apiRequests.some(api => api.url === newApi.url)) {
                agentState.apiRequests.push(newApi);
            }
        });
        storageLoaded = true;
        saveState();

        if (agentState.isPanelOpen) {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", initializeUI);
            } else {
                initializeUI();
            }
        }
    });
}

function initializeUI() {
    createFloatingPanel();
    
    const projNameInput = document.getElementById('sa-project-name') as HTMLInputElement | null;
    const userPromptInput = document.getElementById('sa-user-prompt') as HTMLTextAreaElement | null;
    const isInfiniteInput = document.getElementById('sa-is-infinite') as HTMLInputElement | null;
    
    if (projNameInput) projNameInput.value = agentState.projectName || "";
    if (userPromptInput) userPromptInput.value = agentState.promptText || "";
    if (isInfiniteInput) isInfiniteInput.checked = agentState.isInfinite || false;
    
    // Panel konumunu geri yükle
    const panel = document.getElementById('scrapy-agent-panel');
    if (panel && agentState.panelPos) {
        panel.style.top = agentState.panelPos.top + "px";
        panel.style.left = agentState.panelPos.left + "px";
        panel.style.bottom = "auto";
        panel.style.right = "auto";
    }
    
    // Küçültülmüş durumu geri yükle
    if (agentState.isMinimized) {
        toggleMinimize(true);
    }
    
    updateSelectionList();
    restoreVisualHighlights();
}

// Seçili elemanların yeşil çerçevelerini sayfada tekrar çiz
function restoreVisualHighlights() {
    agentState.selectedItems.forEach(item => {
        if (item.page_url === window.location.href.split('?')[0]) {
            const elements = document.querySelectorAll('*');
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i] as HTMLElement;
                if (el.id === item.domId || (el.className === item.className && el.textContent?.substring(0, 50).trim() === item.textContent)) {
                    el.style.outline = "2px solid #10b981";
                    activeNodes[item.id] = el;
                    break;
                }
            }
        }
    });
}

// =================================================================
// 3. YAPILI PAYLOAD VE HTML TEMİZLEYİCI (Token Tasarrufu için)
// =================================================================
function cleanHtml(htmlString: string): string {
    if (!htmlString) return "";
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const body = doc.body;

        function cleanNode(node: Node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                // Inline stilleri temizle (Token tasarrufu)
                element.removeAttribute('style');
                
                // Gereksiz data ve erişilebilirlik niteliklerini temizle
                Array.from(element.attributes).forEach(attr => {
                    const name = attr.name.toLowerCase();
                    if (name.startsWith('data-v-') || name.startsWith('aria-') || name.startsWith('on') || name === 'draggable') {
                        element.removeAttribute(attr.name);
                    }
                });

                // Kod ve stil etiketlerini tamamen kaldır
                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(element.tagName)) {
                    element.remove();
                    return;
                }

                // Çok büyük SVG'leri küçült
                if (element.tagName === 'SVG') {
                    element.innerHTML = '<path desc="svg icon placeholder"></path>';
                    element.setAttribute('width', '16');
                    element.setAttribute('height', '16');
                    return;
                }

                // Alt öğeleri temizle
                Array.from(element.childNodes).forEach(cleanNode);
            }
        }

        Array.from(body.childNodes).forEach(cleanNode);
        return body.innerHTML.trim();
    } catch (e) {
        console.error("HTML temizleme hatası:", e);
        return htmlString.substring(0, 1000);
    }
}

function buildStructuredPayload(projName: string, promptText: string, selectedItems: SelectedHTMLItem[], apiRequests: any[]) {
    let steps: any[] = [];
    let stepMap: Record<string, { html_elements: any[], api_requests: any[] }> = {};
    
    selectedItems.forEach(item => {
        const pageUrl = item.page_url; 
        if (!stepMap[pageUrl]) {
            stepMap[pageUrl] = { html_elements: [], api_requests: [] };
        }
        stepMap[pageUrl].html_elements.push({
            name: item.name,
            html: cleanHtml(item.html)
        });
    });
    
    apiRequests.forEach(api => {
        const pageUrl = api.page_url;
        if (!stepMap[pageUrl]) {
            stepMap[pageUrl] = { html_elements: [], api_requests: [] };
        }
        
        let sampleResponse = null;
        if (api.response_body) {
            const bodyStr = JSON.stringify(api.response_body);
            sampleResponse = bodyStr.length > 1500 ? bodyStr.substring(0, 1500) + "... [Truncated]" : bodyStr;
        }

        stepMap[pageUrl].api_requests.push({
            url: api.url,
            method: api.method,
            headers: api.headers || {},
            request_body: api.request_body || null,
            response_sample: sampleResponse
        });
    });
    
    let stepCount = 1;
    for (const [pageUrl, data] of Object.entries(stepMap)) {
        steps.push({
            step_number: stepCount,
            page_url: pageUrl,
            html_elements: data.html_elements,
            api_requests: data.api_requests
        });
        stepCount++;
    }
    
    return {
        spider_name: projName,
        user_instruction: promptText,
        steps: steps,
        output_format: {
            provider_id: "string",
            category_id: "string",
            card_ids: ["string"],
            title: "string (min 3 karakter)",
            description: "string",
            source_url: "string (Geçerli bir URL olmalı)",
            start_date: "2026-05-18T12:00:00",
            end_date: "2026-06-18T12:00:00"
        }
    };
}

async function buildSystemPrompt(): Promise<string> {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['systemPrompt'], (result) => {
            const defaultPrompt = `Sen kıdemli bir Python ve Scrapy geliştiricisisi ve Reverse Engineering uzmanısın.
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
            
            const prompt = result.systemPrompt || defaultPrompt;
            resolve(prompt);
        });
    });
}

// =================================================================
// 4. ŞIK VE MODERN YÜZEN ARAYÜZ (GLASSMORPHISM)
// =================================================================
let selectionModeActive = false;
let hoveredElement: HTMLElement | null = null;

function createFloatingPanel() {
    if (document.getElementById('scrapy-agent-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'scrapy-agent-panel';
    panel.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; width: 350px;
        background: rgba(26, 26, 46, 0.98); 
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 2147483647;
        padding: 15px; 
        box-shadow: 0 15px 35px rgba(0,0,0,0.4);
        font-family: 'Outfit', 'Segoe UI', sans-serif; 
        border-radius: 12px; 
        color: #e2e8f0;
        box-sizing: border-box; 
        text-align: left; 
        line-height: 1.5;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s, border-radius 0.3s, padding 0.3s;
    `;

    panel.innerHTML = `
        <!-- KÜÇÜLTÜLMÜŞ BALONCUK ARAYÜZÜ (İLK BAŞTA GİZLİ) -->
        <div id="sa-minimized-bubble" style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; cursor: pointer; font-size: 24px;" title="Paneli Büyüt">
            🤖
        </div>

        <!-- TAM PANEL ARAYÜZÜ -->
        <div id="sa-panel-content-container">
            <!-- Header (Sürükleme Alanı) -->
            <div id="sa-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin: 0 0 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; cursor: move; user-select: none;">
                <span style="font-weight: 600; font-size: 15px; color: #10b981; display: flex; align-items: center; gap: 6px;">
                    🤖 Otonom Scrapy Ajanı
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button id="sa-minimize-btn" style="background: transparent; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: background 0.2s;" title="Küçült">─</button>
                    <button id="sa-panel-close-btn" style="background: transparent; border: none; color: #ef4444; font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: background 0.2s;" title="Kapat ve Hafızayı Sıfırla">✕</button>
                </div>
            </div>

            <!-- Proje Adı -->
            <div style="margin-bottom: 10px;">
                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: 500;">PROJE ADI</label>
                <input type="text" id="sa-project-name" placeholder="örn: EcommerceSpider" style="width: 100%; padding: 8px 10px; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; font-size: 12px; font-family: inherit; transition: border-color 0.2s;">
            </div>
            
            <!-- API İstekleri Dinleme -->
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.15); padding: 8px 12px; border-radius: 8px; margin-bottom: 12px;">
                <label style="font-size: 12px; display: flex; align-items: center; font-weight: 500; cursor: pointer; color: #34d399; margin: 0;">
                    <input type="checkbox" id="sa-is-infinite" style="margin-right: 8px; accent-color: #10b981; width: 15px; height: 15px;"> API İsteklerini Yakala (XHR/Fetch)
                </label>
            </div>

            <!-- HTML Eleman Seçici -->
            <div style="border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px; margin-bottom: 12px; background: rgba(255,255,255,0.02);">
                <button id="sa-add-element-btn" style="width: 100%; padding: 8px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; font-family: inherit; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59,130,246,0.2);">
                    ➕ Sayfadan HTML Alanı Seç
                </button>
                <div id="sa-selection-status" style="font-size: 11px; color: #f59e0b; display: none; text-align: center; margin-top: 6px; font-weight: 500; animation: pulse 1.5s infinite;">
                    Seçim Modu Aktif: Sayfada bir öğeye tıklayın...
                </div>
                <ul id="sa-selected-list" style="list-style: none; padding: 0; margin: 8px 0 0 0; max-height: 110px; overflow-y: auto;"></ul>
            </div>

            <!-- Kullanıcı Promtu -->
            <div style="margin-bottom: 12px;">
                <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; font-weight: 500;">YAPAY ZEKA TALİMATI</label>
                <textarea id="sa-user-prompt" placeholder="Gemini'ye bu verileri nasıl parse edeceğini söyleyin..." style="width: 100%; height: 55px; padding: 8px 10px; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; font-size: 12px; font-family: inherit; resize: none; line-height: 1.4; transition: border-color 0.2s;"></textarea>
            </div>

            <!-- Çalıştır Butonu -->
            <button id="sa-generate-btn" style="width: 100%; padding: 10px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; font-family: inherit; transition: all 0.2s; box-shadow: 0 4px 12px rgba(16,185,129,0.25);">
                🚀 Ajanı Çalıştır & Kodu Üret
            </button>
            <div id="sa-status" style="font-size: 12px; margin-top: 10px; text-align: center; display: none; font-weight: 500; padding: 8px; border-radius: 6px; background: rgba(255,255,255,0.03);"></div>

            <!-- SOHBET ARAYÜZÜ (İLK BAŞTA GİZLİ) -->
            <div id="sa-chat-container" style="display: none; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                <div style="font-weight: 600; font-size: 12px; color: #38bdf8; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                    💬 Kod Geliştirme Sohbeti
                </div>
                <div id="sa-chat-messages" style="border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 8px; height: 140px; overflow-y: auto; background: rgba(0,0,0,0.2); margin-bottom: 8px; font-size: 11px; line-height: 1.4; display: flex; flex-direction: column; gap: 8px;">
                    <!-- Mesajlar buraya eklenecek -->
                </div>
                <div style="display: flex; gap: 6px;">
                    <input id="sa-chat-input" type="text" placeholder="Kod hakkında düzeltme gönder..." style="flex: 1; padding: 6px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; font-size: 11px; color: white; font-family: inherit;">
                    <button id="sa-chat-send-btn" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 11px; font-family: inherit; transition: background 0.2s;">Gönder</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // Girdi alanlarının odaklanmasında çerçeve değişimi
    const inputs = ['sa-project-name', 'sa-user-prompt'];
    inputs.forEach(id => {
        const el = document.getElementById(id) as HTMLElement | null;
        if (el) {
            el.addEventListener('focus', () => el.style.borderColor = '#10b981');
            el.addEventListener('blur', () => el.style.borderColor = 'rgba(255,255,255,0.1)');
        }
    });

    // Sürükleme Özelliği
    const header = document.getElementById('sa-panel-header') as HTMLElement;
    makeElementDraggable(panel, header);

    // Minimize Butonu
    (document.getElementById('sa-minimize-btn') as HTMLElement).addEventListener('click', () => {
        toggleMinimize(true);
    });

    // Minimize Baloncuğuna Tıklama (Geri Büyüt)
    (document.getElementById('sa-minimized-bubble') as HTMLElement).addEventListener('click', () => {
        toggleMinimize(false);
    });

    // Girdi alanlarında değişiklik oldukça hafızayı güncelle
    (document.getElementById('sa-project-name') as HTMLInputElement).addEventListener('input', saveState);
    (document.getElementById('sa-user-prompt') as HTMLTextAreaElement).addEventListener('input', saveState);
    (document.getElementById('sa-is-infinite') as HTMLInputElement).addEventListener('change', saveState);

    // Eleman Seçme Butonu
    (document.getElementById('sa-add-element-btn') as HTMLElement).addEventListener('click', () => {
        selectionModeActive = true;
        document.body.style.cursor = "crosshair";
        (document.getElementById('sa-selection-status') as HTMLElement).style.display = "block";
    });

    // Paneli Kapat ve HAFIZAYI SIFIRLA
    (document.getElementById('sa-panel-close-btn') as HTMLElement).addEventListener('click', () => {
        panel.remove();
        selectionModeActive = false;
        document.body.style.cursor = "default";
        if (hoveredElement) hoveredElement.style.outline = "";
        
        // Çerçeveleri temizle
        Object.values(activeNodes).forEach(node => { if (node) node.style.outline = ""; });
        // Empty activeNodes
        for (const key in activeNodes) {
            delete activeNodes[key];
        }

        // Hafızayı sıfırla
        agentState = { isPanelOpen: false, isMinimized: false, projectName: "", promptText: "", isInfinite: false, selectedItems: [], apiRequests: [], conversationHistory: [], lastCode: "", panelPos: null };
        saveState();
    });

    // KOD ÜRETİM DETAYI (BACKGROUND İLETİŞİMİ)
    (document.getElementById('sa-generate-btn') as HTMLElement).addEventListener('click', async () => {
        saveState();
        
        // API key'i ayarlardan al
        const stored = await new Promise<any>((resolve) => {
            chrome.storage.sync.get(['apiKey', 'apiModel'], (r) => resolve(r));
        });
        const apiKey = stored.apiKey || '';
        const apiModel = stored.apiModel || 'gemini-2.5-flash';
        
        if (!apiKey) {
            alert('⚠️ Google Gemini API Anahtarı bulunamadı!\n\nLütfen eklenti ayarlarından API anahtarınızı girin.');
            return;
        }
        
        const projName = (agentState.projectName || "AutoSpider").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        if (!agentState.promptText) { alert("Lütfen prompt girin!"); return; }
        if (agentState.selectedItems.length === 0 && !agentState.isInfinite) {
            alert("Lütfen en az bir HTML alanı seçin veya API Yakala işaretleyin!"); return;
        }

        const status = document.getElementById('sa-status') as HTMLElement;
        status.style.display = 'block';
        status.style.color = '#38bdf8';
        status.textContent = '🧠 Gemini düşünüyor, kod yazılıyor...';
        (document.getElementById('sa-generate-btn') as HTMLButtonElement).disabled = true;

        // Yapılandırılmış payload oluştur
        const structuredPayload = buildStructuredPayload(projName, agentState.promptText, agentState.selectedItems, agentState.isInfinite ? agentState.apiRequests : []);
        const systemPromptBase = await buildSystemPrompt();
        const systemPrompt = systemPromptBase.replace('{SPIDER_NAME}', projName);

        // API İsteğini Arka Plana Gönder
        const message: RuntimeMessage = {
            action: 'GEMINI_CALL',
            payload: {
                apiKey,
                apiModel,
                systemPrompt,
                content: structuredPayload
            }
        };

        chrome.runtime.sendMessage(message, (response: any) => {
            (document.getElementById('sa-generate-btn') as HTMLButtonElement).disabled = false;

            if (chrome.runtime.lastError) {
                status.style.color = '#ef4444';
                status.textContent = `❌ Bağlantı hatası: ${chrome.runtime.lastError.message}`;
                return;
            }

            if (!response.success) {
                status.style.color = '#ef4444';
                status.textContent = `❌ Hata: ${response.error}`;
                return;
            }

            try {
                let code = response.data.candidates[0].content.parts[0].text;
                code = code.replace(/^```python\n?/i, '').replace(/\n?```$/i, '').trim();
                
                // Kodu kaydet (chat için)
                agentState.lastCode = code;
                agentState.conversationHistory = [];  // Chat geçmişini sıfırla
                saveState();
                
                navigator.clipboard.writeText(code);
                status.style.color = '#10b981';
                status.textContent = '✅ Kod Panoya Kopyalandı! Düzeltme isteyebilirsin 👇';
                console.log("🐍 SCRAPY SPIDER CODE:\n", code);
                
                // Chat container'ı göster
                const chatContainer = document.getElementById('sa-chat-container') as HTMLElement;
                chatContainer.style.display = 'block';
                const chatMessagesEl = document.getElementById('sa-chat-messages') as HTMLElement;
                chatMessagesEl.textContent = '';
                const msgDiv = document.createElement('div');
                msgDiv.style.color = '#94a3b8';
                msgDiv.style.fontStyle = 'italic';
                msgDiv.textContent = 'Kod başarıyla oluşturuldu! Sayfa panosuna kopyalandı. Düzeltme istemek için aşağıya yaz.';
                chatMessagesEl.appendChild(msgDiv);
                
                // Chat input'u hazırla
                setupChatListeners();
            } catch (err: any) {
                status.style.color = '#ef4444';
                status.textContent = `❌ Yanıt ayrıştırma hatası: ${err.message}`;
            }
        });
    });
}

// Sürüklenebilir Panel Fonksiyonu
function makeElementDraggable(elmnt: HTMLElement, handle: HTMLElement) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  handle.onmousedown = dragMouseDown;

  function dragMouseDown(e: MouseEvent) {
    if (['BUTTON', 'INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e: MouseEvent) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    let newTop = elmnt.offsetTop - pos2;
    let newLeft = elmnt.offsetLeft - pos1;
    
    const maxLeft = window.innerWidth - elmnt.offsetWidth - 10;
    const maxTop = window.innerHeight - elmnt.offsetHeight - 10;
    
    newLeft = Math.max(10, Math.min(newLeft, maxLeft));
    newTop = Math.max(10, Math.min(newTop, maxTop));
    
    elmnt.style.top = newTop + "px";
    elmnt.style.left = newLeft + "px";
    elmnt.style.bottom = "auto";
    elmnt.style.right = "auto";
    
    agentState.panelPos = { top: newTop, left: newLeft };
    saveState();
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Küçültme/Büyütme Geçişi
function toggleMinimize(isMin: boolean) {
    agentState.isMinimized = isMin;
    saveState();
    
    const panel = document.getElementById('scrapy-agent-panel');
    if (!panel) return;
    
    const contentContainer = document.getElementById('sa-panel-content-container') as HTMLElement;
    const minBubble = document.getElementById('sa-minimized-bubble') as HTMLElement;
    
    if (isMin) {
        contentContainer.style.display = 'none';
        minBubble.style.display = 'flex';
        panel.style.width = '60px';
        panel.style.height = '60px';
        panel.style.borderRadius = '50%';
        panel.style.padding = '0';
        panel.style.border = '2px solid #10b981';
        panel.style.background = '#1a1a2e';
        panel.style.overflow = 'hidden';
    } else {
        contentContainer.style.display = 'block';
        minBubble.style.display = 'none';
        panel.style.width = '350px';
        panel.style.height = 'auto';
        panel.style.borderRadius = '12px';
        panel.style.padding = '15px';
        panel.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        panel.style.background = 'rgba(26, 26, 46, 0.98)';
        panel.style.overflow = 'visible';
    }
}

// Seçilenleri Arayüzde Güncelleyen Fonksiyon
function updateSelectionList() {
    const listEl = document.getElementById('sa-selected-list');
    if (!listEl) return;
    listEl.textContent = ''; 

    if (agentState.selectedItems.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.style.cssText = 'font-size: 11px; color: #94a3b8; text-align: center; padding: 4px 0;';
        emptyLi.textContent = 'Henüz öğe seçilmedi';
        listEl.appendChild(emptyLi);
        return;
    }

    agentState.selectedItems.forEach(item => {
        const li = document.createElement('li');
        li.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.04); padding: 6px 10px; margin-bottom: 5px; border-radius: 6px; font-size: 12px;";
        
        let pathName = "/";
        try {
            pathName = new URL(item.page_url).pathname;
        } catch(e) {}
        const shortUrl = pathName === "/" ? "/" : pathName.substring(0, 12) + (pathName.length > 12 ? '..' : '');
        
        const textSpan = document.createElement('span');
        textSpan.style.cssText = "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 75%; color: #f1f5f9;";
        
        // Securely build textSpan content using DOM elements
        textSpan.textContent = '🟢 ';
        const nameBold = document.createElement('b');
        nameBold.textContent = item.name;
        textSpan.appendChild(nameBold);
        
        const urlItalic = document.createElement('i');
        urlItalic.style.cssText = 'color:#94a3b8; font-size:10px; margin-left: 4px;';
        urlItalic.textContent = `(${shortUrl})`;
        textSpan.appendChild(urlItalic);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "🗑️ Sil";
        deleteBtn.style.cssText = "background: #ef4444; color: white; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 10px; transition: background 0.2s;";
        deleteBtn.addEventListener('mouseover', () => deleteBtn.style.background = '#dc2626');
        deleteBtn.addEventListener('mouseout', () => deleteBtn.style.background = '#ef4444');
        
        // Silme İşlemi
        deleteBtn.addEventListener('click', () => {
            if (activeNodes[item.id]) {
                activeNodes[item.id].style.outline = "";
                delete activeNodes[item.id];
            }
            agentState.selectedItems = agentState.selectedItems.filter(i => i.id !== item.id);
            saveState();
            updateSelectionList();
        });

        li.appendChild(textSpan);
        li.appendChild(deleteBtn);
        listEl.appendChild(li);
    });
}

// Popup'tan Gelen Başlatma Emri
chrome.runtime.onMessage.addListener((request: RuntimeMessage) => {
    if (request.action === "START_SELECTION") {
        agentState.isPanelOpen = true;
        saveState();
        createFloatingPanel();
        updateSelectionList();
    }
});

// FARE HAREKETLERİ (Seçim Modunda Üzerine Gelinen Öğe Çerçevesi)
document.addEventListener("mouseover", (e) => {
    if (!selectionModeActive) return;
    const target = e.target as HTMLElement;
    if (target.closest('#scrapy-agent-panel')) return; 

    const isAlreadySelected = Object.values(activeNodes).includes(target);
    if (hoveredElement && !isAlreadySelected) {
        hoveredElement.style.outline = ""; 
    }
    hoveredElement = target;
    hoveredElement.style.outline = "2px dashed #3b82f6"; 
});

// TIKLAMA VE SEÇİMİ HAFIZAYA ALMA
document.addEventListener("click", (e) => {
    if (!selectionModeActive) return;
    const target = e.target as HTMLElement;
    if (target.closest('#scrapy-agent-panel')) return;

    e.preventDefault();  
    e.stopPropagation(); 
    
    selectionModeActive = false;
    document.body.style.cursor = "default";
    (document.getElementById('sa-selection-status') as HTMLElement).style.display = "none";
    
    const selectedNode = target;
    const areaName = prompt("Seçtiğiniz bu HTML alanı için bir isim girin (örn: 'Urun_Kutusu'):", "Alan_" + (agentState.selectedItems.length + 1));
    
    if (areaName) {
        selectedNode.style.outline = "2px solid #10b981"; 
        
        const newItemId = Date.now();
        activeNodes[newItemId] = selectedNode;
        
        agentState.selectedItems.push({
            id: newItemId,
            domId: selectedNode.id || "",
            className: selectedNode.className || "",
            textContent: selectedNode.textContent ? selectedNode.textContent.substring(0, 50).trim() : "",
            name: areaName,
            page_url: window.location.href.split('?')[0],
            html: selectedNode.outerHTML
        });
        
        saveState();
        updateSelectionList();
    } else {
        selectedNode.style.outline = "";
    }
    
    hoveredElement = null;
}, true);

// =================================================================
// CHAT SİSTEMİ FONKSİYONLARI (BACKGROUND ARACILIĞIYLA)
// =================================================================
function setupChatListeners() {
    const chatInput = document.getElementById('sa-chat-input') as HTMLInputElement | null;
    const chatSendBtn = document.getElementById('sa-chat-send-btn') as HTMLButtonElement | null;
    
    if (!chatInput || !chatSendBtn) return;
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    chatSendBtn.addEventListener('click', sendChatMessage);
}

async function sendChatMessage() {
    const chatInput = document.getElementById('sa-chat-input') as HTMLInputElement;
    const userMessage = chatInput.value.trim();
    
    if (!userMessage) return;
    
    const chatMessages = document.getElementById('sa-chat-messages') as HTMLElement;
    const chatSendBtn = document.getElementById('sa-chat-send-btn') as HTMLButtonElement;
    
    // Kullanıcı mesajını göster
    const userMsgDiv = document.createElement('div');
    userMsgDiv.style.cssText = 'padding: 6px 10px; background: rgba(59, 130, 246, 0.15); border-radius: 6px; border-left: 3px solid #3b82f6; align-self: flex-end; max-width: 90%; color: #f1f5f9; word-break: break-word;';
    userMsgDiv.textContent = '';
    const strongUser = document.createElement('strong');
    strongUser.style.cssText = 'color: #60a5fa; font-size: 10px; display: block; margin-bottom: 2px;';
    strongUser.textContent = '👤 Sen';
    userMsgDiv.appendChild(strongUser);
    userMsgDiv.appendChild(document.createTextNode(userMessage));
    chatMessages.appendChild(userMsgDiv);
    
    // Mesaj geçmişine ekle
    agentState.conversationHistory.push({
        role: 'user',
        content: userMessage
    });
    
    chatInput.value = '';
    chatSendBtn.disabled = true;
    chatSendBtn.textContent = '⏳ ...';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        const stored = await new Promise<any>((resolve) => {
            chrome.storage.sync.get(['apiKey', 'apiModel'], (r) => resolve(r));
        });
        const apiKey = stored.apiKey || '';
        const chatApiModel = stored.apiModel || 'gemini-2.5-flash';

        if (!apiKey) {
            throw new Error('API anahtarı bulunamadı! Lütfen ayarlar sayfasından girin.');
        }
        
        const codeContext = `Mevcut kod:\n\`\`\`python\n${agentState.lastCode}\n\`\`\`\n\nKullanıcı bu kod hakkında düzeltme istiyor.`;
        
        const contents: any[] = [
            {
                parts: [{ text: codeContext }]
            }
        ];
        
        agentState.conversationHistory.forEach(msg => {
            contents.push({
                role: msg.role,
                parts: [{ text: msg.content }]
            });
        });
        
        const chatSystemPrompt = await buildSystemPrompt();
        const chatSystemInstructionText = `${chatSystemPrompt}\n\n---\n\nKullanıcı bu kod hakkında düzeltme veya geliştirme istedi. 
Eğer kod değişikliği gerekiyorsa, TAM ÇALIŞIR DURUMDA PYTHON KOD döndür (markdown backticks olmadan).
Eğer sadece açıklama istiyorsa, kısaca cevap ver.
SADECE KOD döndürürsen otomatik olarak panoya kopyalanıp konsola yazdırılacak.`;
        
        // API çağrısını background'a devret
        const message: RuntimeMessage = {
            action: 'GEMINI_CALL',
            payload: {
                apiKey,
                apiModel: chatApiModel,
                systemPrompt: chatSystemInstructionText,
                content: contents
            }
        };

        chrome.runtime.sendMessage(message, (response: any) => {
            chatSendBtn.disabled = false;
            chatSendBtn.textContent = 'Gönder';

            if (chrome.runtime.lastError) {
                showChatError(chatMessages, `Bağlantı hatası: ${chrome.runtime.lastError.message}`);
                return;
            }

            if (!response.success) {
                showChatError(chatMessages, response.error);
                return;
            }

            const aiResponse = response.data.candidates[0].content.parts[0].text;
            
            agentState.conversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });
            
            const aiMsgDiv = document.createElement('div');
            const isPythonCode = /^(def|class|import|from|async def|@|\s*#.*\n)/.test(aiResponse.trim());
            
            if (isPythonCode) {
                let extractedCode = aiResponse.replace(/^```python\n?/i, '').replace(/\n?```$/i, '').trim();
                agentState.lastCode = extractedCode;
                saveState();
                
                navigator.clipboard.writeText(extractedCode);
                console.log("🐍 GÜNCELLENMIŞ KOD:\n", extractedCode);
                
                aiMsgDiv.style.cssText = 'padding: 6px 10px; background: rgba(16, 185, 129, 0.15); border-radius: 6px; border-left: 3px solid #10b981; align-self: flex-start; max-width: 90%; color: #f1f5f9;';
                
                const strongAi = document.createElement('strong');
                strongAi.style.cssText = 'color: #34d399; font-size: 10px; display: block; margin-bottom: 2px;';
                strongAi.textContent = '🤖 Ajan';
                aiMsgDiv.appendChild(strongAi);
                aiMsgDiv.appendChild(document.createTextNode(' ✅ Kod güncellendi ve kopyalandı!'));
            } else {
                aiMsgDiv.style.cssText = 'padding: 6px 10px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; border-left: 3px solid #94a3b8; align-self: flex-start; max-width: 90%; color: #cbd5e1; word-break: break-word;';
                
                const strongAi = document.createElement('strong');
                strongAi.style.cssText = 'color: #94a3b8; font-size: 10px; display: block; margin-bottom: 2px;';
                strongAi.textContent = '🤖 Ajan';
                aiMsgDiv.appendChild(strongAi);
                aiMsgDiv.appendChild(document.createTextNode(aiResponse));
            }
            
            chatMessages.appendChild(aiMsgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
        
    } catch (error: any) {
        showChatError(chatMessages, error.message);
        chatSendBtn.disabled = false;
        chatSendBtn.textContent = 'Gönder';
    }
}

function showChatError(container: HTMLElement, message: string) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 6px 10px; background: rgba(239, 68, 68, 0.15); border-radius: 6px; border-left: 3px solid #ef4444; align-self: flex-start; max-width: 90%; color: #fca5a5;';
    
    const strongErr = document.createElement('strong');
    strongErr.style.cssText = 'color: #f87171; font-size: 10px; display: block; margin-bottom: 2px;';
    strongErr.textContent = '❌ Hata';
    
    errorDiv.appendChild(strongErr);
    errorDiv.appendChild(document.createTextNode(" " + message));
    
    container.appendChild(errorDiv);
    container.scrollTop = container.scrollHeight;
}

} // end guard
