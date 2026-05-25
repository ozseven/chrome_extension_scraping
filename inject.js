// ==========================================
// GUARD: Birden fazla inject'i önle
// ==========================================
if (window.__SA_INJECT_LOADED__) {
    // Zaten yüklendi, tekrar çalışma
} else {
window.__SA_INJECT_LOADED__ = true;

// ==========================================
// KURAL DIŞI URL VE UZANTILAR (ASSET) FİLTRESİ
// ==========================================
function shouldSkip(url) {
    if (!url || typeof url !== 'string') return true;
    if (url.includes("google") || url.includes("127.0.0.1") || url.includes("chatgpt")) return true;
    // Resim, yazı tipi, stil dosyaları ve diğer statik dosyaları atla
    const isAsset = /\.(png|jpe?g|gif|svg|webp|woff2?|ttf|css|js|ico|mp4|webm)(\?.*)?$/i.test(url);
    return isAsset;
}

// ==========================================
// 1. FETCH İSTEKLERİNİ DİNLE
// ==========================================
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || "");
    const options = args[1] || {};
    const method = options.method ? options.method.toUpperCase() : "GET";
    const headers = options.headers || {};
    const reqBody = typeof options.body === 'string' ? options.body : null;

    const response = await originalFetch.apply(this, args);

    if (!shouldSkip(url)) {
        try {
            const responseClone = response.clone();
            responseClone.text().then(text => {
                let jsonData = null;
                let isJson = false;
                try {
                    jsonData = JSON.parse(text);
                    isJson = true;
                } catch (e) {
                    // JSON değilse ham metin olarak tut (ilk 5000 karakterle sınırla ki bellek şişmesin)
                    jsonData = text.substring(0, 5000);
                }
                
                window.postMessage({
                    type: "SA_INTERCEPTED_API",
                    url: url,
                    method: method,
                    headers: headers,
                    request_body: reqBody,
                    data: jsonData,
                    is_json: isJson
                }, "*");
            });
        } catch (e) {
            console.error("Fetch intercept error:", e);
        }
    }
    return response;
};

// ==========================================
// 2. XHR (AJAX) İSTEKLERİNİ DİNLE
// ==========================================
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
const originalXhrSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url) {
    this._method = method.toUpperCase();
    this._url = url;
    this._requestHeaders = {}; // Başlıkları biriktireceğimiz sepet
    originalXhrOpen.apply(this, arguments);
};

// Giden başlıkları (Headers) tek tek yakala
XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    this._requestHeaders[header] = value;
    originalXhrSetRequestHeader.apply(this, arguments);
};

// Giden gövdeyi (Payload) yakala ve yanıtı bekle
XMLHttpRequest.prototype.send = function(body) {
    this._requestBody = typeof body === 'string' ? body : null;
    
    this.addEventListener('load', function() {
        const url = this._url;
        if (!shouldSkip(url)) {
            try {
                const responseText = this.responseText;
                let jsonData = null;
                let isJson = false;
                try {
                    jsonData = JSON.parse(responseText);
                    isJson = true;
                } catch (e) {
                    jsonData = responseText.substring(0, 5000);
                }
                
                window.postMessage({
                    type: "SA_INTERCEPTED_API",
                    url: url,
                    method: this._method,
                    headers: this._requestHeaders,
                    request_body: this._requestBody,
                    data: jsonData,
                    is_json: isJson
                }, "*");
            } catch (e) {
                console.error("XHR intercept error:", e);
            }
        }
    });
    originalXhrSend.apply(this, arguments);
};

} // end guard