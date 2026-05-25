export interface ExtensionSettings {
  apiKey: string;
  apiModel: string;
  apiTimeout: number;
  maxElements: number;
  delayMs: number;
  autoScroll: boolean;
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  logLevel: 'info' | 'debug' | 'error';
  enableDebug: boolean;
  cacheData: boolean;
  retryAttempts: number;
  systemPrompt: string;
}

export interface SelectedHTMLItem {
  id: number;
  domId: string;
  className: string;
  textContent: string;
  name: string;
  page_url: string;
  html: string;
}

export interface InterceptedApiRequest {
  page_url: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  request_body: string | null;
  response_body: any;
}

export interface ChatConversationItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentState {
  isPanelOpen: boolean;
  isMinimized: boolean;
  projectName: string;
  promptText: string;
  isInfinite: boolean;
  selectedItems: SelectedHTMLItem[];
  apiRequests: InterceptedApiRequest[];
  conversationHistory: ChatConversationItem[];
  lastCode: string;
  panelPos: { top: number; left: number } | null;
}

// Runtime messaging types
export type RuntimeMessage =
  | { action: 'GET_TAB_ID' }
  | {
      action: 'GEMINI_CALL';
      payload: {
        apiKey: string;
        apiModel: string;
        systemPrompt: string;
        content: any;
      };
    }
  | {
      action: 'TEST_API_CONNECTION';
      apiKey: string;
      apiModel: string;
    }
  | {
      action: 'START_SELECTION';
      tabId: number;
    };

export type RuntimeResponse =
  | { success: true; data: any }
  | { success: false; error: string }
  | { tabId: number | undefined };
