/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FORM_ENDPOINT?: string;
  readonly VITE_CHAT_ENDPOINT?: string;
  readonly VITE_GOOGLE_BOOKING_URL?: string;
  readonly VITE_ATTRIBUTION_STORAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
