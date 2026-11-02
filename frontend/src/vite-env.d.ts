/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" to read static JSON from public/mock-data instead of calling the backend. */
  readonly VITE_USE_MOCK?: string
  /** Backend origin, e.g. "http://localhost:8000". Empty = same origin (dev proxy). */
  readonly VITE_API_BASE_URL?: string
  /** Dev-server proxy target for /api (default http://localhost:8000). */
  readonly VITE_API_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
