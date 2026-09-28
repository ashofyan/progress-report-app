import type {
    DailyProgressStatus,
} from '@/features/daily-progress/types/daily-progress.types'

export type ProgressReportStatus =
    | 'pending'
    | 'selesai'

export type ProgressReportSourceType =
    | 'master'
    | 'additional'

export interface ProgressReportEmployee {
    employee_code: string
    employee_name: string
    tingkat: number
}

export interface ProgressReportSpk {
    id: number
    source_pt: string
    source_id?: number
    no_spk: string
    client_code?: string
    kode_product_jasa: string | null
    note: string | null
    jenis?: string | null
    periode_awal?: string | null
    periode_akhir?: string | null
    job?: ProgressReportJob | null
}

export interface ProgressReportJob {
    id: number
    job_code: string
    description: string
}

export interface ProgressReportTaskParent {
    id: number
    task_name: string
}

export interface ProgressReportTask {
    id: number
    task_name: string
    parent: ProgressReportTaskParent | null
}

export interface ProgressReportDailyProgress {
    id: number
    nomor: string
    tanggal: string
    client_code: string
    als_spk_id: number
    no_spk: string | null
}

export interface ProgressReportNote {
    id: number
    judul?: string | null
    catatan: string
    created_at?: string
}

export interface ProgressReportHistory {
    progress_report_id: number
    nomor_pr: string
    tanggal: string
    client_code: string
    spk_id: number
    source_type: ProgressReportSourceType
    job: ProgressReportJob
    task: ProgressReportTask
    status: ProgressReportStatus
    catatan?: string | null
    notes?: ProgressReportNote[]
    documents?: ProgressReportDocument[]
}

export interface ProgressReportFormTask {
    daily_progress_detail_id: number
    daily_progress_id: number
    als_job_id: number
    source_type: ProgressReportSourceType
    task: ProgressReportTask
    daily_progress_status: Exclude<DailyProgressStatus, 'batal'>
    daily_progress_catatan: string | null
    allowed_progress_report_statuses: ProgressReportStatus[]
    default_progress_report_status: ProgressReportStatus | null
    is_already_reported?: boolean
    history: ProgressReportHistory[]
    documents?: ProgressReportDocument[]
}

export interface ProgressReportFindingAdditionalTask {
    id: number
    task_name: string
    parent: ProgressReportTaskParent | null
}

export interface ProgressReportFindingMasterTask {
    id: number
    task_name: string
}

export interface ProgressReportFindingSources {
    master: ProgressReportFindingMasterTask[]
    additional_tasks: ProgressReportFindingAdditionalTask[]
}

export interface ProgressReportFormData {
    tanggal: string
    client_code: string
    employee: ProgressReportEmployee
    spk: ProgressReportSpk
    daily_progress: ProgressReportDailyProgress[]
    tasks: ProgressReportFormTask[]
    finding_sources: ProgressReportFindingSources
}

export interface ProgressReportDocument {
    id: number
    als_progress_report_id?: number
    als_progress_report_detail_id?: number
    als_progress_report_finding_id?: number
    als_daily_progress_detail_id?: number
    path?: string
    url?: string
    original_name?: string
    mime_type?: string
    size?: number
    created_at?: string
    updated_at?: string
}

export interface ProgressReportDetail {
    id: number
    daily_progress_detail_id: number
    source_type: ProgressReportSourceType
    task: ProgressReportTask
    status: ProgressReportStatus
    catatan?: string | null
    notes?: ProgressReportNote[]
    documents?: ProgressReportDocument[]
}

export interface ProgressReportFinding {
    id: number
    source_type: ProgressReportSourceType
    master_task: ProgressReportFindingMasterTask | null
    additional_task: ProgressReportFindingAdditionalTask | null
    keterangan: string
    documents?: ProgressReportDocument[]
}

export interface ProgressReport {
    id: number
    nomor: string
    tanggal: string
    client_code: string
    spk: ProgressReportSpk
    job: ProgressReportJob
    notes?: ProgressReportNote[]
    documents?: ProgressReportDocument[]
    created_by: string
    created_by_level: number
    details: ProgressReportDetail[]
    findings: ProgressReportFinding[]
    created_at: string
    updated_at: string
}

export interface ProgressReportSummary {
    id: number
    nomor: string
    tanggal: string
    client_code: string
    spk: ProgressReportSpk
    job: ProgressReportJob
    total_task: number
    total_temuan: number
    total_catatan: number
    total_dokumen: number
    created_at: string
}

export interface ProgressReportFilters {
    client_code?: string
    als_spk_id?: number
    tanggal_awal?: string
    tanggal_akhir?: string
    search?: string
    page?: number
    per_page?: number
}

export interface ProgressReportFormDataFilters {
    client_code: string
    als_spk_id: number
    tanggal: string
}

export interface ProgressReportHistoryFilters {
    client_code: string
    als_spk_id: number
    als_job_task_id?: number
    als_task_additional_detail_id?: number
}

export interface CreateProgressReportDetailRequest {
    daily_progress_detail_id: number
    status?: ProgressReportStatus
    notes?: Array<{
        catatan: string
    }>
}

export interface CreateProgressReportFindingRequest {
    source_type: ProgressReportSourceType
    als_job_task_id?: number
    als_task_additional_detail_id?: number
    keterangan: string
}

export interface CreateProgressReportRequest {
    tanggal: string
    client_code: string
    als_spk_id: number
    notes?: Array<{
        judul?: string
        catatan: string
    }>
    details: CreateProgressReportDetailRequest[]
    findings?: CreateProgressReportFindingRequest[]
}

export interface ProgressReportMeta {
    current_page: number
    last_page: number
    per_page: number
    total: number
}

export interface ProgressReportListResponse {
    status: true
    message: string
    data: ProgressReportSummary[]
    meta: ProgressReportMeta
}

export interface ProgressReportFormDataResponse {
    status: true
    message: string
    data: ProgressReportFormData
}

export interface ProgressReportHistoryResponse {
    status: true
    message: string
    data: ProgressReportHistory[]
}

export interface ProgressReportDetailResponse {
    status: true
    message: string
    data: ProgressReport
}

export interface ProgressReportMutationResponse {
    status: true
    message: string
    data: ProgressReport
}

export interface ProgressReportDocumentResponse {
    status: true
    message: string
    data: ProgressReportDocument[]
}

export interface ProgressReportDeleteResponse {
    status: true
    message: string
}

export interface ProgressReportErrorResponse {
    status?: false
    success?: false
    message: string
}

export interface LaravelValidationErrorResponse {
    message: string
    errors: Record<string, string[]>
}

export interface ProgressReportApiResult<T> {
    success: boolean
    status: number
    message: string
    data?: T
    meta?: ProgressReportMeta
    errors?: Record<string, string[]>
}
