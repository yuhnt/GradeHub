/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin without the trailing /api. Empty means same origin. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
