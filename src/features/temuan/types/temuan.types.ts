export type TemuanStatus = 'open' | 'selesai'

export interface TemuanMeta {
    current_page: number
    last_page: number
    per_page: number
    total: number
}

export interface TemuanSpk {
    id: number
    no_spk: string
    client_code: string
    kode_product_jasa: string | null
}

export interface TemuanJob {
    id: number
    job_code: string
    description: string
}

export interface TemuanTask {
    id: number
    task_name: string
}

export interface TemuanNote {
    id: number
    als_job_task_id: number
    task?: TemuanTask | null
    note: string
    created_at?: string | null
    updated_at?: string | null
}

export interface TemuanFile {
    id: number
    original_name: string
    mime_type: string
    size: number
    path: string
    url?: string | null
    created_at: string | null
}

export interface Temuan {
    id: number
    nomor: string
    tanggal: string
    client_code: string
    spk?: TemuanSpk
    job?: TemuanJob
    status: TemuanStatus
    notes: TemuanNote[]
    files: TemuanFile[]
    created_by: string
    created_by_level: number | null
    created_at: string | null
    updated_at: string | null
}

export interface TemuanFilters {
    client_code?: string
    als_spk_id?: number
    tanggal?: string
    status?: TemuanStatus | ''
}

export interface CreateTemuanNoteRequest {
    als_job_task_id: number
    note: string
}

export interface CreateTemuanRequest {
    tanggal: string
    client_code: string
    als_spk_id: number
    notes: CreateTemuanNoteRequest[]
}

export interface UpdateTemuanNoteRequest {
    id?: number
    als_job_task_id: number
    note: string
}

export interface UpdateTemuanRequest {
    tanggal?: string
    notes?: UpdateTemuanNoteRequest[]
}

export interface TemuanListResponse {
    status: true
    message: string
    data: Temuan[]
}

export interface TemuanDetailResponse {
    status: true
    message: string
    data: Temuan
}

export interface TemuanMutationResponse {
    status: true
    message: string
    data: Temuan
}

export interface TemuanDeleteResponse {
    status: true
    message: string
}

export interface TemuanFileResponse {
    status: true
    message: string
    data: TemuanFile[]
}

export interface TemuanErrorResponse {
    status?: false
    success?: false
    message: string
}

export interface LaravelValidationErrorResponse {
    message: string
    errors: Record<string, string[]>
}

export interface TemuanApiResult<T> {
    success: boolean
    status: number
    message: string
    data?: T
    errors?: Record<string, string[]>
}
