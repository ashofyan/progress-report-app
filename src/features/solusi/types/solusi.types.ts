export type SolusiSource =
    | 'menu'
    | 'progress_report'

export type SolusiTemuanStatus =
    | 'open'
    | 'selesai'

export interface SolusiSpk {
    id: number
    no_spk: string
}

export interface SolusiJob {
    id: number
    job_code: string
    description: string
}

export interface SolusiTemuan {
    id: number
    nomor: string
    tanggal: string
    client_code: string
    status: SolusiTemuanStatus
    spk?: SolusiSpk | null
    job?: SolusiJob | null
}

export interface SolusiTask {
    id: number
    task_name: string
}

export interface SolusiNote {
    id: number
    task?: SolusiTask | null
    note: string
}

export interface SolusiFile {
    id: number
    original_name: string
    mime_type: string
    size: number
    path: string
    url?: string | null
    created_at: string | null
}

export interface Solusi {
    id: number
    source: SolusiSource
    temuan: SolusiTemuan
    note: SolusiNote
    solution: string
    progress_report: unknown | null
    files?: SolusiFile[]
    created_by: string
    created_by_level: number | null
    resolved_at: string | null
    created_at: string | null
    updated_at: string | null
}

export interface SolusiFormTemuan {
    id: number
    nomor: string
    tanggal: string
    client_code: string
    spk?: SolusiSpk | null
    job?: SolusiJob | null
    notes: SolusiNote[]
}

export interface SolusiFilters {
    client_code?: string
    als_spk_id?: number
    source?: SolusiSource | ''
}

export interface CreateSolusiRequest {
    temuan_note_id: number
    solution: string
}

export interface UpdateSolusiRequest {
    solution: string
}

export interface SolusiListResponse {
    status: true
    message: string
    data: Solusi[]
}

export interface SolusiDetailResponse {
    status: true
    message: string
    data: Solusi
}

export interface SolusiFormDataResponse {
    status: true
    message: string
    data: SolusiFormTemuan[]
}

export interface SolusiMutationResponse {
    status: true
    message: string
    data: Solusi
}

export interface SolusiDeleteResponse {
    status: true
    message: string
}

export interface SolusiFileResponse {
    status: true
    message: string
    data: SolusiFile[]
}

export interface SolusiErrorResponse {
    status?: false
    success?: false
    message: string
}

export interface LaravelValidationErrorResponse {
    message: string
    errors: Record<string, string[]>
}

export interface SolusiApiResult<T> {
    success: boolean
    status: number
    message: string
    data?: T
    errors?: Record<string, string[]>
}
