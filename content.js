// =================================================================
// GUARD: Birden fazla inject'i önle (Extension context invalidated hatası için)
// =================================================================
if (typeof window.__SA_CONTENT_LOADED__ !== 'undefined') {
    // Zaten çalışıyor, yeniden başlatma
} else {
window.__SA_CONTENT_LOADED__ = true;

// =================================================================
// 1. CASUS SCRIPT VE API DİNLEME
// =================================================================
// Not: inject.js artık manifest.json tarafından MAIN world içinde otomatik yükleniyor.

let storageLoaded = false;
const tempApiRequests = [];

window.addEventListener("message", (event) => {
    if (event.source === window && event.data.type === "SA_INTERCEPTED_API") {
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
// 2. GELİŞMİŞ HAFIZA (STATE MANAGEMENT)
// =================================================================
let agentState = {
    isPanelOpen: false,
    projectName: "",
    promptText: "",
    isInfinite: false,
    selectedItems: [],
    apiRequests: [],
    conversationHistory: [],
    lastCode: ""
};
let activeNodes = {}; 

function saveState() {
    if (document.getElementById('scrapy-agent-panel')) {
        agentState.projectName = document.getElementById('sa-project-name').value;
        agentState.promptText = document.getElementById('sa-user-prompt').value;
        agentState.isInfinite = document.getElementById('sa-is-infinite').checked;
    }
    chrome.storage.local.set({ 'sa_persistent_state': agentState });
}

chrome.storage.local.get(['sa_persistent_state'], (result) => {
    if (result.sa_persistent_state) {
        agentState = result.sa_persistent_state;
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

function initializeUI() {
    createFloatingPanel();
    document.getElementById('sa-project-name').value = agentState.projectName || "";
    document.getElementById('sa-user-prompt').value = agentState.promptText || "";
    document.getElementById('sa-is-infinite').checked = agentState.isInfinite || false;
    updateSelectionList();
}

// =================================================================
// 3. YAPILI PAYLOAD OLUŞTURUCU (Structured JSON Format)
// =================================================================
function buildStructuredPayload(projName, promptText, selectedItems, apiRequests) {
    let steps = [];
    let stepMap = {};
    
    // Seçilen HTML öğelerini sayfa başına grupla (HATA BURADA DÜZELTİLDİ: item.page_url kullanılıyor)
    selectedItems.forEach(item => {
        const pageUrl = item.page_url; 
        if (!stepMap[pageUrl]) {
            stepMap[pageUrl] = { html_elements: [], api_requests: [] };
        }
        stepMap[pageUrl].html_elements.push({
            name: item.name,
            html: item.html
        });
    });
    
    // API isteklerini sayfa başına grupla
    apiRequests.forEach(api => {
        if (!stepMap[api.page_url]) {
            stepMap[api.page_url] = { html_elements: [], api_requests: [] };
        }
        stepMap[api.page_url].api_requests.push({
            url: api.url,
            method: api.method,
            headers: api.headers || {},
            request_body: api.request_body || null,
            response_sample: api.response_body ? JSON.stringify(api.response_body).substring(0, 1000) : null
        });
    });
    
    // Adımları oluştur
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
    
    // Yapılandırılmış payload
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

// Gemini'ye gönderilecek system prompt (ayarlardan dinamik olarak al)
async function buildSystemPrompt() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['systemPrompt'], (result) => {
            const defaultPrompt = `Sen kıdemli bir Python ve Scrapy geliştiricisisi ve Reverse Engineering uzmanısın.
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
            
            const prompt = result.systemPrompt || defaultPrompt;
            resolve(prompt || defaultPrompt);
        });
    });
}

// =================================================================
// 4. ŞIK VE MODERN YÜZEN ARAYÜZ VE APİ ÇAĞRISI
// =================================================================
let selectionModeActive = false;
let hoveredElement = null;

function createFloatingPanel() {
    if (document.getElementById('scrapy-agent-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'scrapy-agent-panel';
    panel.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; width: 340px;
        background: #ffffff; border: 2px solid #333; z-index: 2147483647;
        padding: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        font-family: 'Segoe UI', sans-serif; border-radius: 8px; color: #333;
        box-sizing: border-box; text-align: left; line-height: 1.5;
    `;

    panel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 2px solid #ddd; padding-bottom: 5px;">🤖 Otonom Ajan</h3>
        
        <input type="text" id="sa-project-name" placeholder="Proje Adı (örn: ECommerce)" style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 10px;">
        
        <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 8px; border-radius: 4px; margin-bottom: 10px;">
            <label style="font-size: 13px; display: flex; align-items: center; font-weight: bold; cursor: pointer;">
                <input type="checkbox" id="sa-is-infinite" style="margin-right: 8px;"> API İsteği Yakala (JSON ve Metin)
            </label>
        </div>

        <div style="border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin-bottom: 10px; background: #f8f9fa;">
            <button id="sa-add-element-btn" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 10px;">➕ Yeni HTML Alanı Seç</button>
            <div id="sa-selection-status" style="font-size: 11px; color: #dc3545; display: none; text-align: center; margin-bottom: 5px; font-weight: bold;">Seçim Modu Aktif: Sayfada bir öğeye tıklayın...</div>
            <ul id="sa-selected-list" style="list-style: none; padding: 0; margin: 0; max-height: 120px; overflow-y: auto;"></ul>
        </div>

        <textarea id="sa-user-prompt" placeholder="Yapay zekaya ne yapacağını söyle..." style="width: 100%; height: 60px; padding: 8px; box-sizing: border-box; border: 1px solid #0056b3; border-radius: 4px; margin-bottom: 10px; resize: none;"></textarea>

        <button id="sa-generate-btn" style="width: 100%; padding: 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;">🚀 Ajanı Çalıştır</button>
        <div id="sa-status" style="font-size: 12px; margin-top: 10px; text-align: center; display: none; font-weight: bold;"></div>

        <!-- CHAT ARAYÜZÜ (ilk başta gizli) -->
        <div id="sa-chat-container" style="display: none; margin-top: 15px; border-top: 2px solid #ddd; padding-top: 10px;">
            <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #333;">💬 Kod Geliştirme Sohbeti</h4>
            <div id="sa-chat-messages" style="border: 1px solid #ddd; border-radius: 4px; padding: 8px; height: 150px; overflow-y: auto; background: #f9f9f9; margin-bottom: 8px; font-size: 11px; line-height: 1.4;">
                <!-- Mesajlar buraya eklenecek -->
            </div>
            <div style="display: flex; gap: 5px;">
                <input id="sa-chat-input" type="text" placeholder="Kod hakkında düzeltme gönder..." style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px;">
                <button id="sa-chat-send-btn" style="padding: 6px 12px; background: #0056b3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px;">Gönder</button>
            </div>
        </div>

        <button id="sa-close-btn" style="width: 100%; padding: 5px; background: transparent; color: #dc3545; border: none; cursor: pointer; margin-top: 10px; font-size: 12px; text-decoration: underline;">Paneli Kapat (Hafızayı Temizle)</button>
    `;

    document.body.appendChild(panel);

    // Girdi alanlarında değişiklik oldukça hafızayı güncelle
    document.getElementById('sa-project-name').addEventListener('input', saveState);
    document.getElementById('sa-user-prompt').addEventListener('input', saveState);
    document.getElementById('sa-is-infinite').addEventListener('change', saveState);

    // 1. Yeni Eleman Seçme Butonu
    document.getElementById('sa-add-element-btn').addEventListener('click', () => {
        selectionModeActive = true;
        document.body.style.cursor = "crosshair";
        document.getElementById('sa-selection-status').style.display = "block";
    });

    // 2. Paneli Kapat ve HAFIZAYI SIFIRLA
    document.getElementById('sa-close-btn').addEventListener('click', () => {
        panel.remove();
        selectionModeActive = false;
        document.body.style.cursor = "default";
        if (hoveredElement) hoveredElement.style.outline = "";
        
        // Çerçeveleri temizle
        Object.values(activeNodes).forEach(node => { if (node) node.style.outline = ""; });
        activeNodes = {};

        // Hafızayı sıfırla
        agentState = { isPanelOpen: false, projectName: "", promptText: "", isInfinite: false, selectedItems: [], apiRequests: [], conversationHistory: [], lastCode: "" };
        saveState();
    });

    // 3. DOĞRUDAN GEMİNİ API'YE BAĞLANAN YER
    document.getElementById('sa-generate-btn').addEventListener('click', async () => {
        saveState();
        
        // API key'i ayarlardan al
        const stored = await new Promise((resolve) => {
            chrome.storage.sync.get(['apiKey', 'apiModel'], (r) => resolve(r));
        });
        const apiKey = stored.apiKey || '';
        const apiModel = stored.apiModel || 'gemini-3.5-flash';
        
        if (!apiKey) {
            alert('⚠️ Google Gemini API Anahtarı bulunamadı!\n\nLütfen eklenti ayarlarından API anahtarınızı girin.');
            return;
        }
        
        const projName = (agentState.projectName || "AutoSpider").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        if (!agentState.promptText) { alert("Lütfen prompt girin!"); return; }
        if (agentState.selectedItems.length === 0 && !agentState.isInfinite) {
            alert("Lütfen en az bir HTML alanı seçin veya API Yakala işaretleyin!"); return;
        }

        const status = document.getElementById('sa-status');
        status.style.display = 'block';
        status.style.color = '#007bff';
        status.textContent = '🧠 Gemini düşünüyor, kod yazılıyor...';
        document.getElementById('sa-generate-btn').disabled = true;

        // Yapılandırılmış payload oluştur
        const structuredPayload = buildStructuredPayload(projName, agentState.promptText, agentState.selectedItems, agentState.isInfinite ? agentState.apiRequests : []);
        const systemPromptBase = await buildSystemPrompt();
        const systemPrompt = systemPromptBase.replace('{SPIDER_NAME}', projName);

        // Console'da payload'ı göster (debug)
        console.log("📦 GEMİNİ'YE GİDEN SAF JSON YÜKÜ:\n", JSON.stringify(structuredPayload, null, 2));

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents: [{
                        parts: [{
                            text: JSON.stringify(structuredPayload, null, 2)
                        }]
                    }]
                })
            });

            if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
            const result = await response.json();
            
            let code = result.candidates[0].content.parts[0].text;
            code = code.replace(/^```python\n?/i, '').replace(/\n?```$/i, '').trim();
            
            // Kodu kaydet (chat için)
            agentState.lastCode = code;
            agentState.conversationHistory = [];  // Chat geçmişini sıfırla
            saveState();
            
            navigator.clipboard.writeText(code);
            status.style.color = '#28a745';
            status.textContent = '✅ Kod Panoya Kopyalandı! Düzeltme isteyebilirsin 👇';
            console.log("🐍 SCRAPY SPIDER CODE:\n", code);
            
            // Chat container'ı göster
            document.getElementById('sa-chat-container').style.display = 'block';
            document.getElementById('sa-chat-messages').innerHTML = '<div style="color: #666;"><strong>Kod başarıyla oluşturuldu!</strong> Düzeltme istemek için aşağıya yaz.</div>';
            
            // Chat input'u hazırla
            setupChatListeners();
        } catch (error) {
            status.style.color = '#dc3545';
            status.textContent = `❌ Hata: ${error.message}`;
            console.error("API Hatası:", error);
            alert("Hata oluştu. Lütfen kotanızı ve API anahtarınızı kontrol edin.");
        } finally {
            document.getElementById('sa-generate-btn').disabled = false;
        }
    });
}

// Seçilenleri Arayüzde Güncelleyen Fonksiyon
function updateSelectionList() {
    const listEl = document.getElementById('sa-selected-list');
    listEl.innerHTML = ''; 

    if (agentState.selectedItems.length === 0) {
        listEl.innerHTML = '<li style="font-size: 11px; color: #666; text-align: center;">Henüz öğe seçilmedi</li>';
        return;
    }

    agentState.selectedItems.forEach(item => {
        const li = document.createElement('li');
        li.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #e9ecef; padding: 6px; margin-bottom: 5px; border-radius: 4px; font-size: 12px;";
        
        const shortUrl = new URL(item.page_url).pathname;
        const textSpan = document.createElement('span');
        textSpan.style.cssText = "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;";
        textSpan.innerHTML = `✅ <b>${item.name}</b> <i style="color:#666; font-size:10px;">(${shortUrl})</i>`;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "🗑️ Sil";
        deleteBtn.style.cssText = "background: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 10px;";
        
        // Silme İşlemi
        deleteBtn.addEventListener('click', () => {
            // Eğer aynı sayfadaysak yeşil çerçeveyi kaldır
            if (activeNodes[item.id]) {
                activeNodes[item.id].style.outline = "";
                delete activeNodes[item.id];
            }
            // Hafızadan çıkart ve kaydet
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
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "START_SELECTION") {
        agentState.isPanelOpen = true; // Hafızada panelin açık olduğunu işaretle
        saveState();
        createFloatingPanel();
        updateSelectionList();
    }
});

// FARE HAREKETLERİ
document.addEventListener("mouseover", (e) => {
    if (!selectionModeActive) return;
    if (e.target.closest('#scrapy-agent-panel')) return; 

    // Seçili olanlara dokunma
    const isAlreadySelected = Object.values(activeNodes).includes(e.target);
    if (hoveredElement && !isAlreadySelected) {
        hoveredElement.style.outline = ""; 
    }
    hoveredElement = e.target;
    hoveredElement.style.outline = "3px dashed rgba(0, 123, 255, 0.5)"; 
});

// TIKLAMA VE SEÇİMİ HAFIZAYA ALMA
document.addEventListener("click", (e) => {
    if (!selectionModeActive) return;
    if (e.target.closest('#scrapy-agent-panel')) return;

    e.preventDefault();  
    e.stopPropagation(); 
    
    selectionModeActive = false;
    document.body.style.cursor = "default";
    document.getElementById('sa-selection-status').style.display = "none";
    
    const selectedNode = e.target;
    const areaName = prompt("Seçtiğiniz bu HTML alanı için bir isim girin (örn: 'Urun_Kutusu'):", "Alan_" + (agentState.selectedItems.length + 1));
    
    if (areaName) {
        selectedNode.style.outline = "3px solid #28a745"; 
        
        const newItemId = Date.now();
        activeNodes[newItemId] = selectedNode; // RAM'de tut
        
        // Storage'a gidecek veriyi ekle
        agentState.selectedItems.push({
            id: newItemId,
            name: areaName,
            page_url: window.location.href.split('?')[0],
            html: selectedNode.outerHTML
        });
        
        saveState(); // Kalıcı hafızaya yaz
        updateSelectionList();
    } else {
        selectedNode.style.outline = "";
    }
    
    hoveredElement = null;
}, true);

// =================================================================
// CHAT SİSTEMİ FONKSİYONLARI
// =================================================================
function setupChatListeners() {
    const chatInput = document.getElementById('sa-chat-input');
    const chatSendBtn = document.getElementById('sa-chat-send-btn');
    
    if (!chatInput || !chatSendBtn) return;
    
    // Enter tuşu ile gönder
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // Buton ile gönder
    chatSendBtn.addEventListener('click', sendChatMessage);
}

async function sendChatMessage() {
    const chatInput = document.getElementById('sa-chat-input');
    const userMessage = chatInput.value.trim();
    
    if (!userMessage) return;
    
    const chatMessages = document.getElementById('sa-chat-messages');
    const chatSendBtn = document.getElementById('sa-chat-send-btn');
    
    // Kullanıcı mesajını göster
    const userMsgDiv = document.createElement('div');
    userMsgDiv.style.cssText = 'margin-bottom: 6px; padding: 6px; background: #e7f3ff; border-radius: 4px; border-left: 3px solid #0056b3;';
    userMsgDiv.innerHTML = `<strong style="color: #0056b3;">👤 Sen:</strong> ${userMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`;
    chatMessages.appendChild(userMsgDiv);
    
    // Mesaj geçmişine ekle
    agentState.conversationHistory.push({
        role: 'user',
        content: userMessage
    });
    
    chatInput.value = '';
    chatSendBtn.disabled = true;
    chatSendBtn.textContent = '⏳ Düşünüyor...';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // API key ve model'i ayarlardan al
        const stored = await new Promise((resolve) => {
            chrome.storage.sync.get(['apiKey', 'apiModel'], (r) => resolve(r));
        });
        const apiKey = stored.apiKey || '';
        const chatApiModel = stored.apiModel || 'gemini-3.5-flash';

        if (!apiKey) {
            throw new Error('API anahtarı bulunamadı! Lütfen ayarlar sayfasından girin.');
        }
        
        // Sistem promotu (kodla ilgili)
        const codeContext = `Mevcut kod:\n\`\`\`python\n${agentState.lastCode}\n\`\`\`\n\nKullanıcı bu kod hakkında düzeltme istiyor.`;
        
        // API çağrısı (conversation history ile)
        const contents = [
            {
                parts: [{
                    text: codeContext
                }]
            }
        ];
        
        // Tüm mesaj geçmişini ekle
        agentState.conversationHistory.forEach(msg => {
            contents.push({
                role: msg.role,
                parts: [{
                    text: msg.content
                }]
            });
        });
        
        // Ayarlardan system prompt'u al (chat için)
        const chatSystemPrompt = await buildSystemPrompt();
        const chatSystemInstructionText = `${chatSystemPrompt}\n\n---\n\nKullanıcı bu kod hakkında düzeltme veya geliştirme istedi. 
Eğer kod değişikliği gerekiyorsa, TAM ÇALIŞIR DURUMDA PYTHON KOD döndür (markdown backticks olmadan).
Eğer sadece açıklama istiyorsa, kısaca cevap ver.
SADECE KOD döndürürsen otomatik olarak panoya kopyalanıp konsola yazdırılacak.`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${chatApiModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{
                        text: chatSystemInstructionText
                    }]
                },
                contents: contents
            })
        });
        
        if (!response.ok) throw new Error(`API Hatası: ${response.status}`);
        
        const result = await response.json();
        let aiResponse = result.candidates[0].content.parts[0].text;
        
        // Mesaj geçmişine ekle
        agentState.conversationHistory.push({
            role: 'assistant',
            content: aiResponse
        });
        
        // AI cevabını göster
        const aiMsgDiv = document.createElement('div');
        
        // Eğer yanıt Python kodu gibi görünüyorsa (def, class, import vs varsa)
        const isPythonCode = /^(def|class|import|from|async def|@|\s*#.*\n)/.test(aiResponse.trim());
        
        if (isPythonCode) {
            // Kodu çıkar ve kaydet
            let extractedCode = aiResponse.replace(/^```python\n?/i, '').replace(/\n?```$/i, '').trim();
            agentState.lastCode = extractedCode;
            saveState();
            
            // Panoya kopyala
            navigator.clipboard.writeText(extractedCode);
            
            // Konsola yaz
            console.log("🐍 GÜNCELLENMIŞ KOD:\n", extractedCode);
            
            aiMsgDiv.style.cssText = 'margin-bottom: 6px; padding: 6px; background: #d4edda; border-radius: 4px; border-left: 3px solid #28a745;';
            aiMsgDiv.innerHTML = `<strong style="color: #28a745;">🤖 Ajan:</strong> ✅ Kod güncellenmiş! Panoya kopyalandı.`;
        } else {
            // Normal metin yanıtı
            aiMsgDiv.style.cssText = 'margin-bottom: 6px; padding: 6px; background: #fff3cd; border-radius: 4px; border-left: 3px solid #ff9800;';
            aiMsgDiv.innerHTML = `<strong style="color: #ff9800;">🤖 Ajan:</strong> ${aiResponse.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${aiResponse.length > 200 ? '...' : ''}`;
        }
        
        chatMessages.appendChild(aiMsgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        console.error('Chat Hatası:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin-bottom: 6px; padding: 6px; background: #f8d7da; border-radius: 4px; border-left: 3px solid #dc3545;';
        errorDiv.innerHTML = `<strong style="color: #dc3545;">❌ Hata:</strong> ${error.message}`;
        chatMessages.appendChild(errorDiv);
    } finally {
        chatSendBtn.disabled = false;
        chatSendBtn.textContent = 'Gönder';
    }
}

} // end guard (__SA_CONTENT_LOADED__)
