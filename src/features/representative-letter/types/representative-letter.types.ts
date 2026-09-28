export type RepresentativeLetterContentFormat = 'html'

export type RepresentativeLetterSourceType =
    | 'master'
    | 'additional'

export type RepresentativeLetterSaveState =
    | 'saved'
    | 'saving'
    | 'unsaved'
    | 'failed'

export interface RepresentativeLetterMeta {
    current_page: number
    last_page: number
    per_page: number
    total: number
}

export interface RepresentativeLetterSpk {
    id: number
    no_spk: string
    client_code: string
}

export interface RepresentativeLetterJob {
    id: number
    job_code: string
    description: string
}

export interface RepresentativeLetterPeriode {
    bulan: number
    tahun: number
    label: string
}

export interface RepresentativeLetterHeaderSummary {
    id: number
    code: string
    name: string
    image_url: string
}

export interface RepresentativeLetterDocumentSettings {
    page: {
        size: 'A4'
        orientation: 'portrait' | 'landscape'
        margin_top: number
        margin_right: number
        margin_bottom: number
        margin_left: number
    }
    header: {
        enabled: boolean
    }
    footer: {
        enabled: boolean
    }
    watermark: {
        enabled: boolean
        opacity: number
        width: number
    }
}

export interface RepresentativeLetterProgressReportRef {
    id: number
    nomor: string
    tanggal: string
}

export interface RepresentativeLetterEmployee {
    employee_code: string
    name: string
}

export interface RepresentativeLetterDetail {
    id: number
    progress_report: RepresentativeLetterProgressReportRef
    employee: RepresentativeLetterEmployee
    type: RepresentativeLetterSourceType
    parent_task_name: string
    task_name: string
    status: 'selesai'
    notes?: RepresentativeLetterPreviewNote[]
}

export interface RepresentativeLetter {
    id: number
    nomor: string
    header: RepresentativeLetterHeaderSummary | null
    spk: RepresentativeLetterSpk
    job: RepresentativeLetterJob
    periode: RepresentativeLetterPeriode
    created_by: string
    created_by_level: number | null
    content: string | null
    content_format: RepresentativeLetterContentFormat
    document_settings: RepresentativeLetterDocumentSettings | null
    details: RepresentativeLetterDetail[]
    created_at: string | null
    updated_at: string | null
}

export interface RepresentativeLetterListItem {
    id: number
    nomor: string
    spk: RepresentativeLetterSpk
    job: RepresentativeLetterJob
    periode: RepresentativeLetterPeriode
    total_detail: number
    created_by: string
    created_by_level: number | null
    created_at: string | null
}

export interface RepresentativeLetterPreviewNote {
    id: number
    catatan: string
}

export interface RepresentativeLetterPreviewTask {
    progress_report: RepresentativeLetterProgressReportRef
    employee: RepresentativeLetterEmployee
    type: RepresentativeLetterSourceType
    parent: {
        id: number
        task_name: string
    }
    task: {
        id: number
        task_name: string
    }
    status: 'selesai'
    notes: RepresentativeLetterPreviewNote[]
}

export interface RepresentativeLetterPreview {
    spk: RepresentativeLetterSpk
    job: RepresentativeLetterJob
    periode: RepresentativeLetterPeriode
    summary: {
        total_progress_report: number
        total_task_selesai: number
        total_employee: number
    }
    tasks: RepresentativeLetterPreviewTask[]
}

export interface RepresentativeLetterHeaderImage {
    path: string
    url: string
}

export interface RepresentativeLetterHeader {
    id: number
    code: string
    name: string
    is_active: boolean
    image: RepresentativeLetterHeaderImage
    created_by: string
    created_at: string | null
    updated_at: string | null
}

export interface RepresentativeLetterFilters {
    als_spk_id?: number
    bulan?: number
    tahun?: number
    page?: number
    per_page?: number
}

export interface RepresentativeLetterPreviewFilters {
    als_spk_id: number
    bulan: number
    tahun: number
}

export interface CreateRepresentativeLetterRequest {
    als_spk_id: number
    bulan: number
    tahun: number
}

export interface UpdateRepresentativeLetterRequest {
    content: string | null
    content_format: RepresentativeLetterContentFormat
    document_settings: RepresentativeLetterDocumentSettings
}

export interface RepresentativeLetterHeaderFilters {
    page?: number
    per_page?: number
}

export interface RepresentativeLetterHeaderFormPayload {
    code?: string
    name?: string
    is_active?: boolean
    header_image?: File
}

export interface RepresentativeLetterListResponse {
    status: true
    message: string
    data: RepresentativeLetterListItem[]
    meta: RepresentativeLetterMeta
}

export interface RepresentativeLetterPreviewResponse {
    status: true
    message: string
    data: RepresentativeLetterPreview
}

export interface RepresentativeLetterDetailResponse {
    status: true
    message: string
    data: RepresentativeLetter
}

export interface RepresentativeLetterMutationResponse {
    status: true
    message: string
    data: RepresentativeLetter
}

export interface RepresentativeLetterHeaderListResponse {
    status: true
    message: string
    data: RepresentativeLetterHeader[]
    meta: RepresentativeLetterMeta
}

export interface RepresentativeLetterHeaderDetailResponse {
    status: true
    message: string
    data: RepresentativeLetterHeader
}

export interface RepresentativeLetterHeaderMutationResponse {
    status: true
    message: string
    data: RepresentativeLetterHeader
}

export interface RepresentativeLetterErrorResponse {
    status?: false
    success?: false
    message: string
}

export interface LaravelValidationErrorResponse {
    message: string
    errors: Record<string, string[]>
}

export interface RepresentativeLetterApiResult<T> {
    success: boolean
    status: number
    message: string
    data?: T
    meta?: RepresentativeLetterMeta
    errors?: Record<string, string[]>
}
