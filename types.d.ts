declare module 'quill-markdown-shortcuts'; 

export {}

declare global {
  interface Window {
    electron?: {
      send: (channel: string, ...args: any[]) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, val: any) => void;
        delete: (key: string) => void;
        clear: () => void;
      };
      auth: {
        storeCredentials: (credentials: {
          email: string;
          password?: string;
          expiresAt: number;
        }) => Promise<boolean>;
        getCredentials: () => Promise<{
          email: string;
          password?: string;
          expiresAt: number;
        } | null>;
        checkExpiry: () => Promise<boolean>;
      };
    };
    process?: {
      type?: string;
    };
  }
} 