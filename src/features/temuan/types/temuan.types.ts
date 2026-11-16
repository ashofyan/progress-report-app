export type TemuanStatus = 'open' | 'pending' | 'selesai'

export type TemuanType = 'TM' | 'PR'

export interface TemuanMeta {
    current_page: number
    last_page: number
    per_page: number
    total: number
}

export interface TemuanSpk {
    id: number
    no_spk: string
    client_code?: string
    kode_product_jasa?: string | null
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

export interface TemuanNoteSolution {
    id?: number
    solution: string
    files?: TemuanFile[]
    created_by?: string
    created_at?: string | null
}

export interface TemuanNote {
    id: number
    als_job_task_id: number
    task?: TemuanTask | null
    note: string
    solution?: string | TemuanNoteSolution | null
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

export interface TemuanComment {
    id: number
    temuan_id: number
    temuan_note_id?: number | null
    comment: string
    created_by: string
    created_by_name: string
    created_by_level?: number | null
    created_at: string | null
    updated_at: string | null
}

export interface TemuanProgressReportSummary {
    id: number
    nomor: string
    tanggal: string
}

export interface Temuan {
    id: number
    nomor: string
    type?: TemuanType
    priority?: number
    als_progress_report_id?: number | null
    no_pr?: string | null
    progress_report?: TemuanProgressReportSummary | null
    tanggal: string
    client_code: string
    spk?: TemuanSpk
    job?: TemuanJob
    status: TemuanStatus
    notes: TemuanNote[]
    files: TemuanFile[]
    comments?: TemuanComment[]
    created_by: string
    created_by_name?: string
    created_by_level: number | null
    created_at: string | null
    updated_at: string | null
}

export interface TemuanFilters {
    client_code?: string
    als_spk_id?: number
    tanggal?: string
    status?: TemuanStatus | string
    type?: TemuanType | ''
    priority?: number
}

export interface CreateTemuanNoteRequest {
    als_job_task_id: number
    note: string
}

export interface CreateTemuanRequest {
    tanggal: string
    client_code: string
    als_spk_id: number
    priority?: number
    type?: TemuanType
    notes: CreateTemuanNoteRequest[]
}

export interface UpdateTemuanNoteRequest {
    id?: number
    als_job_task_id?: number
    note: string
}

export interface UpdateTemuanRequest {
    tanggal?: string
    priority?: number
    notes?: UpdateTemuanNoteRequest[]
}

export interface CreateTemuanCommentRequest {
    comment: string
    temuan_note_id?: number | null
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

export interface TemuanCommentListResponse {
    status: true
    message: string
    data: TemuanComment[]
}

export interface TemuanCommentMutationResponse {
    status: true
    message: string
    data: TemuanComment
}

export interface TemuanCommentDeleteResponse {
    status: true
    message: string
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
