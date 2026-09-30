/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
    readonly VITE_NOTES_API_BASE_URL?: string
    readonly VITE_KARYAWAN_SEARCH_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module '@editorjs/header'
declare module '@editorjs/list'
declare module '@editorjs/checklist'
