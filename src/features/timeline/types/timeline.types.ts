export type TimelineFeedType = 'daily_progress' | 'progress_report'

export type TimelineTaskStatus = 'selesai' | 'pending'

export interface TimelineSpkItem {
    id: number
    no_spk: string
    kode_klien: string
    jenis: string
    periode_awal?: string | null
    periode_akhir?: string | null
    job_code?: string | null
    job_description?: string | null
    total_daily_progress: number
    total_progress_report: number
}

export interface TimelineTeamMember {
    kode_employee: string
    name_employee: string
    tingkat: number
    status_employee?: number
}

export interface TimelineCurrentSpk {
    id: number
    no_spk: string
    source_pt?: string
    kode_klien: string
    jenis: string
    periode_awal?: string | null
    periode_akhir?: string | null
    tanggal?: string
    kode_product_jasa?: string | null
    note?: string | null
    job?: {
        id?: number
        job_code: string
        description: string
    } | null
    teams: TimelineTeamMember[]
}

export interface TimelineSummary {
    total_feeds: number
    total_daily_progress: number
    total_progress_report: number
    total_tasks_completed: number
    total_tasks_pending: number
    active_contributors_count: number
}

export interface TimelineDocument {
    id: number
    path?: string
    url?: string
    original_name?: string
    mime_type?: string
    size?: number
    created_at?: string
}

export interface TimelineTaskNote {
    id: number
    catatan: string
    judul?: string | null
}

export interface TimelineTask {
    id: number
    type: 'master' | 'additional'
    task_id?: number
    task_name: string
    parent_task_name?: string | null
    status: TimelineTaskStatus
    catatan?: string | null
    notes?: TimelineTaskNote[]
    documents?: TimelineDocument[]
}

export interface TimelineFinding {
    id: number
    source_type?: 'master' | 'additional'
    master_task?: {
        id?: number
        task_name: string
    } | null
    additional_task?: {
        id?: number
        task_name: string
    } | null
    keterangan: string
    documents?: TimelineDocument[]
}

export interface TimelineGeneralNote {
    id: number
    judul?: string | null
    catatan: string
}

export interface TimelineFeedItem {
    feed_id: string
    type: TimelineFeedType
    reference_id: number
    nomor: string
    tanggal: string
    bulan?: number | null
    tahun?: number | null
    created_at: string
    creator?: {
        employee_code?: string
        employee_name?: string
        tingkat?: number
    } | null
    tasks?: TimelineTask[]
    findings?: TimelineFinding[]
    notes?: TimelineGeneralNote[]
    documents?: TimelineDocument[]
}

export interface TimelineData {
    current_spk: TimelineCurrentSpk | null
    available_spks: TimelineSpkItem[]
    summary: TimelineSummary
    feeds: TimelineFeedItem[]
}

export interface TimelineFilters {
    als_spk_id?: number
    client_code?: string
    employee_code?: string
    tanggal?: string
    bulan?: number
    tahun?: number
    type?: 'all' | 'daily_progress' | 'progress_report'
}

export interface TimelineSpksResponse {
    status: boolean
    message: string
    data: TimelineSpkItem[]
}

export interface TimelineResponse {
    status: boolean
    message: string
    data: TimelineData
}

export interface TimelineApiResult<T> {
    success: boolean
    status: number
    message: string
    data?: T
}
