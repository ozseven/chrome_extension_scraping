// Declare global extensions for types
declare global {
  interface Window {
    __SA_INJECT_LOADED__?: boolean;
  }
  interface XMLHttpRequest {
    _method?: string;
    _url?: string;
    _requestHeaders?: Record<string, string>;
    _requestBody?: string | null;
  }
}

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
function shouldSkip(url: string | null | undefined): boolean {
    if (!url || typeof url !== 'string') return true;
    if (url.includes("google") || url.includes("127.0.0.1") || url.includes("chatgpt")) return true;
    // Resim, yazı tipi, stil dosyaları ve diğer statik dosyaları atla
    const isAsset = /\.(png|jpe?g|gif|svg|webp|woff2?|ttf|css|js|ico|mp4|webm)(\?.*)?$/i.test(url);
    return isAsset;
}

// ==========================================
// GÜVENLİK FİLTRESİ: Hassas Başlıkları Maskele
// ==========================================
function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    if (!headers || typeof headers !== 'object') return {};
    const sanitized: Record<string, string> = {};
    const sensitiveKeys = ['authorization', 'cookie', 'proxy-authorization', 'token', 'x-auth-token', 'xsrf-token', 'csrf-token'];
    
    for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(s => lowerKey.includes(s))) {
            sanitized[key] = "[MASKED_FOR_SECURITY]";
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

// Fetch headers yapısını nesneye çevir
function getHeadersObject(headersInput: HeadersInit | undefined): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!headersInput) return headers;
    
    if (headersInput instanceof Headers) {
        headersInput.forEach((value, key) => {
            headers[key] = value;
        });
    } else if (Array.isArray(headersInput)) {
        headersInput.forEach(pair => {
            if (pair && pair.length >= 2) {
                headers[pair[0]] = pair[1];
            }
        });
    } else if (typeof headersInput === 'object') {
        Object.assign(headers, headersInput);
    }
    return headers;
}

// ==========================================
// 1. FETCH İSTEKLERİNİ DİNLE
// ==========================================
const originalFetch = window.fetch;
window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url = "";
    if (typeof input === 'string') {
        url = input;
    } else if (input instanceof URL) {
        url = input.href;
    } else if (input instanceof Request) {
        url = input.url;
    }
    
    const options = init || {};
    const method = options.method ? options.method.toUpperCase() : "GET";
    const rawHeaders = getHeadersObject(options.headers);
    const headers = sanitizeHeaders(rawHeaders);
    const reqBody = typeof options.body === 'string' ? options.body : null;

    const response = await originalFetch.apply(this, [input, init]);

    if (!shouldSkip(url)) {
        try {
            const responseClone = response.clone();
            responseClone.text().then(text => {
                let jsonData: any = null;
                let isJson = false;
                try {
                    jsonData = JSON.parse(text);
                    isJson = true;
                } catch (e) {
                    // JSON değilse ham metin olarak tut (ilk 5000 karakterle sınırla)
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

XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    this._method = method.toUpperCase();
    this._url = typeof url === 'string' ? url : url.href;
    this._requestHeaders = {}; // Başlıkları biriktireceğimiz sepet
    originalXhrOpen.apply(this, [method, url, ...args] as any);
};

// Giden başlıkları (Headers) tek tek yakala ve gerekirse maskele
XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
    const lowerHeader = header.toLowerCase();
    const sensitiveKeys = ['authorization', 'cookie', 'proxy-authorization', 'token', 'x-auth-token', 'xsrf-token', 'csrf-token'];
    
    if (!this._requestHeaders) {
        this._requestHeaders = {};
    }
    
    if (sensitiveKeys.some(s => lowerHeader.includes(s))) {
        this._requestHeaders[header] = "[MASKED_FOR_SECURITY]";
    } else {
        this._requestHeaders[header] = value;
    }
    originalXhrSetRequestHeader.apply(this, [header, value]);
};

// Giden gövdeyi (Payload) yakala ve yanıtı bekle
XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    this._requestBody = typeof body === 'string' ? body : null;
    
    this.addEventListener('load', function() {
        const url = this._url;
        if (!shouldSkip(url)) {
            try {
                const responseText = this.responseText;
                let jsonData: any = null;
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
                    method: this._method || "GET",
                    headers: this._requestHeaders || {},
                    request_body: this._requestBody || null,
                    data: jsonData,
                    is_json: isJson
                }, "*");
            } catch (e) {
                console.error("XHR intercept error:", e);
            }
        }
    });
    originalXhrSend.apply(this, arguments as any);
};

} // end guard

export {};
