export type DailyProgressStatus =
    | 'open'
    | 'pending'
    | 'batal'
    | 'selesai'

export type DailyProgressDetailType =
    | 'master'
    | 'additional'

export interface DailyProgressJob {
    id: number
    job_code: string
    description: string
}

export interface DailyProgressTaskParent {
    id: number
    task_name: string
}

export interface DailyProgressTask {
    id: number
    task_name: string
    parent?: DailyProgressTaskParent | null
}

export interface DailyProgressFormTaskNote {
    id: number
    catatan: string
}

export interface DailyProgressFormTaskHistory {
    progress_report_detail_id: number
    progress_report_id: number
    nomor: string
    tanggal: string
    status: Extract<
        DailyProgressStatus,
        'pending' | 'selesai'
    >
    catatan?: string | null
    notes?: DailyProgressFormTaskNote[]
}

export interface DailyProgressFormJobTaskChild {
    id: number
    task_name: string
    parent_id: number
    last_progress_report?: DailyProgressFormTaskHistory | null
    history?: DailyProgressFormTaskHistory[]
}

export interface DailyProgressFormJobTask {
    id: number
    task_name: string
    parent_id: number | null
    children: DailyProgressFormJobTaskChild[]
}

export interface DailyProgressFormJob {
    id: number
    job_code: string
    description: string
    tasks: DailyProgressFormJobTask[]
}

export interface DailyProgressFormFinding {
    id: number
    progress_report_id: number
    nomor_pr: string
    tanggal: string
    source_type: DailyProgressDetailType
    keterangan: string
    status: string
    spk_id?: number
    als_spk_id?: number
}

export interface DailyProgressTemuanNote {
    id: number
    task?: DailyProgressTaskParent | null
    note: string
}

export interface DailyProgressTemuan {
    id: number
    nomor: string
    tanggal: string
    status: string
    notes?: DailyProgressTemuanNote[]
    spk_id?: number
    als_spk_id?: number
}

export interface DailyProgressFormSpk {
    spk_id: number
    source_pt: string
    source_id: number
    no_spk: string
    client_code: string
    periode_awal: string | null
    periode_akhir: string | null
    tanggal: string | null
    jenis: string | null
    status: string | number | null
    kode_product_jasa: string | null
    note: string | null
    job: DailyProgressFormJob | null
    findings?: DailyProgressFormFinding[]
    temuans?: DailyProgressTemuan[]
}

export interface DailyProgressFormEmployee {
    employee_code: string
    employee_name: string
    tingkat: number
}

export interface DailyProgressFormData {
    client_code: string
    employee: DailyProgressFormEmployee
    spks: DailyProgressFormSpk[]
    findings?: DailyProgressFormFinding[]
    temuans?: DailyProgressTemuan[]
    daily_progresses?: DailyProgress[]
}

export interface DailyProgressDocument {
    id: number
    als_daily_progress_detail_id: number
    path: string
    original_name: string
    mime_type: string
    size: number
    created_at: string
    updated_at: string
}

export interface DailyProgressFinding {
    id: number
    progress_report_id: number
    nomor_pr: string
    tanggal: string
    source_type: DailyProgressDetailType
    keterangan: string
    status: string
}

export interface DailyProgressDetail {
    id: number
    als_job_id: number
    job?: DailyProgressJob
    type: DailyProgressDetailType
    als_job_task_id: number | null
    als_task_additional_detail_id: number | null
    task?: DailyProgressTask | null
    status: DailyProgressStatus
    catatan: string | null
    documents?: DailyProgressDocument[]
    created_at: string
    updated_at: string
}

export interface DailyProgress {
    id: number
    nomor: string
    tanggal: string
    client_code: string
    als_spk_id?: number | null
    spk_id?: number | null
    no_spk: string | null
    bulan: number
    tahun: number
    created_by: string
    created_by_level: number
    details: DailyProgressDetail[]
    findings?: DailyProgressFinding[]
    temuans?: DailyProgressTemuan[]
    created_at: string
    updated_at: string
}

export interface DailyProgressFilters {
    client_code?: string
    tanggal?: string
    bulan?: number
    tahun?: number
}

export interface DailyProgressFormDataFilters {
    client_code: string
    tanggal?: string
    bulan?: number
    tahun?: number
}

export interface PendingDailyProgressFilters {
    client_code?: string
}

export interface PendingDailyProgress {
    id?: number
    als_daily_progress_id?: number
    als_job_id?: number
    als_job_task_id?: number | null
    als_task_additional_detail_id?: number | null
    status: 'pending'
    catatan: string | null
    created_at?: string
    updated_at?: string
    detail_id?: number
    task_type?: DailyProgressDetailType
    daily_progress?: Pick<
        DailyProgress,
        | 'id'
        | 'nomor'
        | 'tanggal'
        | 'client_code'
        | 'no_spk'
    > & {
        als_spk_id?: number
        spk_id?: number
    }
    client?: {
        code: string
    }
    spk?: {
        id: number
        source_pt: string
        source_id?: number
        no_spk: string
        kode_product_jasa?: string | null
        note: string | null
        jenis?: string | null
        periode_awal?: string | null
        periode_akhir?: string | null
    }
    job?: DailyProgressJob
    type?: DailyProgressDetailType
    task?: DailyProgressTask
}

export interface CreateDailyProgressDetailRequest {
    als_job_id: number
    als_job_task_id?: number
    als_task_additional_detail_id?: number
    status: DailyProgressStatus
    catatan: string | null
}

export interface CreateDailyProgressRequest {
    tanggal: string
    client_code: string
    als_spk_id: number
    bulan: number
    tahun: number
    finding_ids?: number[] | null
    temuan_ids?: number[] | null
    details: CreateDailyProgressDetailRequest[]
}

export interface UpdateDailyProgressDetailRequest {
    id: number
    status: DailyProgressStatus
    catatan: string | null
}

export interface UpdateDailyProgressRequest {
    no_spk?: string | null
    finding_ids?: number[] | null
    temuan_ids?: number[] | null
    details: UpdateDailyProgressDetailRequest[]
}

export interface EditDailyProgressDetailRequest {
    id?: number | null
    als_job_id: number
    als_job_task_id?: number | null
    als_task_additional_detail_id?: number | null
    status: DailyProgressStatus
    catatan?: string | null
}

export interface EditDailyProgressRequest {
    tanggal: string
    client_code: string
    als_spk_id: number
    bulan: number
    tahun: number
    finding_ids?: number[] | null
    temuan_ids?: number[] | null
    details: EditDailyProgressDetailRequest[]
}

export interface DailyProgressListResponse {
    status: true
    message: string
    data: DailyProgress[]
}

export interface DailyProgressDetailResponse {
    status: true
    message: string
    data: DailyProgress
}

export interface DailyProgressFormDataResponse {
    status: true
    message: string
    data: DailyProgressFormData
}

export interface DailyProgressMutationResponse {
    status: true
    message: string
    data: DailyProgress
}

export interface PendingDailyProgressResponse {
    status: true
    message: string
    data: PendingDailyProgress[]
}

export interface DailyProgressDeleteResponse {
    status: true
    message: string
}

export interface DailyProgressDocumentResponse {
    status: true
    message: string
    data: DailyProgressDocument[]
}

export interface DailyProgressErrorResponse {
    status?: false
    success?: false
    message: string
}

export interface LaravelValidationErrorResponse {
    message: string
    errors: Record<string, string[]>
}

export interface DailyProgressApiResult<T> {
    success: boolean
    status: number
    message: string
    data?: T
    errors?: Record<string, string[]>
}
