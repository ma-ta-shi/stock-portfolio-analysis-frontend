/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. "http://localhost:8000". Empty = same origin (dev proxy). */
  readonly VITE_API_BASE_URL?: string
  /** Dev-server proxy target for /api (default http://localhost:8000). */
  readonly VITE_API_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
