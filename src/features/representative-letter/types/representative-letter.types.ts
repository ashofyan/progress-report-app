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
    id?: number | null
    no_spk?: string | null
    client_code?: string | null
    client_name?: string | null
}

export interface RepresentativeLetterJob {
    id: number
    job_code: string
    description: string
}

export interface RepresentativeLetterPeriode {
    bulan?: number | null
    tahun?: number | null
    tanggal_awal?: string | null
    tanggal_akhir?: string | null
    label: string
}

export interface RepresentativeLetterHeaderSummary {
    id: number
    code: string
    name: string
    image_url: string
    header_image_url?: string | null
    footer_image_url?: string | null
    footer_text?: string | null
    footer_type?: 'image' | 'text' | 'both' | 'none'
}

export interface RepresentativeLetterFooterSummary {
    type: 'image' | 'text' | 'both' | 'none'
    image_url?: string | null
    url?: string | null
    text?: string | null
}

export interface RepresentativeLetterDocumentSettings {
    page: {
        size: 'A4'
        orientation: 'portrait' | 'landscape'
        margin_top: number
        margin_right: number
        margin_bottom: number
        margin_left: number
        background_image_url?: string | null
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
        image_url?: string | null
    }
    header_footer?: {
        header_enabled?: boolean
        footer_enabled?: boolean
        header_image_url?: string | null
        footer_image_url?: string | null
        footer_text?: string | null
        footer_type?: 'image' | 'text' | 'both' | 'none'
    }
}

export interface AvailableProgressReportTaskNote {
    id: number
    catatan: string
}

export interface AvailableProgressReportDocument {
    id: number
    path: string
    url: string
    original_name: string
    mime_type?: string
    is_image: boolean
}

export interface AvailableProgressReportTemuan {
    id?: number
    masalah: string
    saran?: string | null
}

export interface AvailableProgressReportTask {
    id: number
    progress_report_detail_id: number
    als_progress_report_id: number
    task_name: string
    parent_task_name?: string | null
    parent_id?: number | null
    status: string
    source_type?: 'master' | 'additional'
    notes: AvailableProgressReportTaskNote[]
    documents?: AvailableProgressReportDocument[]
    temuans?: AvailableProgressReportTemuan[]
}

export interface AvailableProgressReport {
    id: number
    nomor: string
    tanggal: string
    task_name: string
    status: string
    temuans_count: number
    ringkasan: string
    tasks?: AvailableProgressReportTask[]
}

export interface AvailableProgressReportFilters {
    spk_id?: number
    als_spk_id?: number
    client_code?: string
    job_id?: number
    als_job_id?: number
    start_date?: string
    end_date?: string
    tanggal_awal?: string
    tanggal_akhir?: string
    bulan?: number
    tahun?: number
}

export interface AvailableProgressReportsResponse {
    success: boolean
    status?: boolean
    message?: string
    data: AvailableProgressReport[]
}

export interface GenerateDraftRepresentativeLetterPayload {
    // Target Sumber Data (Wajib salah satu: spk_id atau client_code)
    spk_id?: number | null
    client_code?: string
    client_name?: string

    // Filter Rentang Tanggal / Periode (Baru - Otomatis mengambil seluruh task selesai)
    start_date?: string // Format: YYYY-MM-DD
    end_date?: string   // Format: YYYY-MM-DD
    tanggal_awal?: string
    tanggal_akhir?: string
    bulan?: number      // 1 - 12 (Alternatif rentang tanggal)
    tahun?: number      // YYYY (Alternatif rentang tanggal)

    // Filter Pekerjaan Jasa (Opsional)
    job_id?: number | null
    als_job_id?: number | null
    als_spk_id?: number | null

    // Seleksi Manual Task (OPSIONAL - Boleh dikosongkan/diabaikan)
    progress_report_detail_ids?: number[]
    progress_report_ids?: number[]

    // Template & Header Kop Surat (Opsional)
    template_id?: number | null
    header_id?: number | null
    title?: string
}

export type GenerateDraftPayload = GenerateDraftRepresentativeLetterPayload
export type GenerateDraftRequest = GenerateDraftRepresentativeLetterPayload

export interface GeneratedDraftDocument {
    title: string
    nomor_surat: string | null
    client_code: string
    client_name?: string | null
    created_by?: string | null
    created_by_name?: string | null
    spk_id?: number | null
    job_id?: number | null
    job_description?: string | null
    tanggal_awal?: string | null
    tanggal_akhir?: string | null
    periode_label?: string | null
    header_id: number | null
    header: RepresentativeLetterHeaderSummary | null
    footer?: RepresentativeLetterFooterSummary | null
    settings: RepresentativeLetterDocumentSettings
    content:
        | {
              format?: string
              version?: string
              html?: string
              sections?: Array<{
                  id: string
                  type: string
                  content?: string
                  html?: string
                  items?: unknown[]
              }>
          }
        | string
    status: string
    selected_progress_reports: AvailableProgressReport[]
}

export interface GenerateDraftResponse {
    success: boolean
    status: boolean
    message: string
    data: GeneratedDraftDocument
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
    documents?: AvailableProgressReportDocument[]
    temuans?: AvailableProgressReportTemuan[]
}

export interface RepresentativeLetter {
    id: number
    nomor: string
    nomor_surat?: string | null
    status: 'draft' | 'final' | string
    tanggal_awal?: string | null
    tanggal_akhir?: string | null
    header: RepresentativeLetterHeaderSummary | null
    spk?: RepresentativeLetterSpk | null
    job: RepresentativeLetterJob
    periode: RepresentativeLetterPeriode
    created_by: string
    created_by_name?: string | null
    created_by_level: number | null
    client_name?: string | null
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
    nomor_surat?: string | null
    status: 'draft' | 'final' | string
    tanggal_awal?: string | null
    tanggal_akhir?: string | null
    spk?: RepresentativeLetterSpk | null
    job: RepresentativeLetterJob
    periode: RepresentativeLetterPeriode
    total_detail: number
    created_by: string
    created_by_name?: string | null
    created_by_level: number | null
    client_name?: string | null
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
    documents?: AvailableProgressReportDocument[]
    temuans?: AvailableProgressReportTemuan[]
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
    client_name?: string | null
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
    header?: RepresentativeLetterHeaderImage
    footer?: {
        type: 'image' | 'text' | 'both' | 'none'
        path?: string | null
        url?: string | null
        text?: string | null
    }
    created_by: string
    created_at: string | null
    updated_at: string | null
}

export interface RepresentativeLetterFilters {
    als_spk_id?: number
    spk_id?: number
    client_code?: string
    status?: string
    search?: string
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
    als_spk_id?: number
    spk_id?: number
    client_code?: string
    client_name?: string
    job_id?: number
    als_job_id?: number
    start_date?: string
    end_date?: string
    tanggal_awal?: string
    tanggal_akhir?: string
    bulan?: number
    tahun?: number
    header_id?: number
    template_id?: number
    progress_report_ids?: number[]
    progress_report_detail_ids?: number[]
    title?: string
    created_by_name?: string
    content?: unknown
    content_format?: RepresentativeLetterContentFormat
    document_settings?: RepresentativeLetterDocumentSettings
    settings?: RepresentativeLetterDocumentSettings
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
    footer_image?: File
    footer_text?: string
    footer_type?: 'image' | 'text' | 'both' | 'none'
}

export interface RepresentativeLetterTemplate {
    id: number
    name: string
    default_header_id: number | null
    default_header?: RepresentativeLetterHeaderSummary | null
    default_watermark_url: string | null
    opening_template?: string | null
    closing_template?: string | null
    body_template?: string | null
    settings?: RepresentativeLetterDocumentSettings | null
    is_active: boolean
    created_by?: string | null
    updated_by?: string | null
    created_at?: string | null
    updated_at?: string | null
}

export interface RepresentativeLetterTemplateFilters {
    search?: string
    is_active?: boolean
    page?: number
    per_page?: number
}

export interface RepresentativeLetterTemplateFormPayload {
    name: string
    default_header_id?: number | null
    default_watermark_url?: string | null
    opening_template?: string | null
    closing_template?: string | null
    body_template?: string | null
    settings?: RepresentativeLetterDocumentSettings
    is_active?: boolean
}

export interface RepresentativeLetterTemplateListResponse {
    status: true
    message: string
    data: RepresentativeLetterTemplate[]
    meta: RepresentativeLetterMeta
}

export interface RepresentativeLetterTemplateDetailResponse {
    status: true
    message: string
    data: RepresentativeLetterTemplate
}

export interface RepresentativeLetterTemplateMutationResponse {
    status: true
    message: string
    data: RepresentativeLetterTemplate
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

export interface MasterJob {
    id: number
    job_code: string
    description: string
}
