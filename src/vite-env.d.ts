/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_PLAYABLES_SDK: 'mock' | 'youtube';
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
