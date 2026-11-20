export interface DashboardSummary {
    total_progress_report?: number
    total_spk_progress_report?: number
    total_dokumen_progress_report?: number
    total_progress_report_saya?: number
    total_progress_report_approved?: number
    total_progress_report_pending?: number
    total_progress_report_rejected?: number
    total_pekerjaan_pr_pending?: number
    total_pekerjaan_pr_pending_saya?: number
    total_pekerjaan_pr_pending_pribadi?: number
    total_pekerjaan_pr_pending_team?: number
    total_pekerjaan_pr_pending_tim?: number
    total_pekerjaan_pr_pending_luar_team?: number
    total_spk?: number
    total_spk_aktif?: number
    total_temuan: number
    total_temuan_pr: number
    total_temuan_global: number
    total_temuan_open: number
    total_temuan_pending: number
    total_temuan_selesai: number
    total_perlu_approval_pr: number
    total_menunggu_approval_saya: number
}

export interface DashboardSpkProgressReportSummary {
    total: number
    saya: number
    approved: number
    pending: number
    rejected: number
}

export interface DashboardSpkTemuanSummary {
    total: number
    pr: number
    global: number
    open: number
    pending: number
    selesai: number
}

export interface DashboardSpkTeamMember {
    id: number
    kode_employee: string
    name_employee: string
    tingkat: number
    status_employee: number
}

export interface DashboardSpkPekerjaanPrPendingSummary {
    total: number
    saya?: number
    pribadi?: number
    team?: number
    tim?: number
    luar_team?: number
}

export interface DashboardSpkItem {
    id: number
    no_spk: string
    client_code: string
    client_name?: string
    periode_awal?: string | null
    periode_akhir?: string | null
    tanggal?: string | null
    jenis?: string | null
    status: number
    job?: {
        id: number
        job_code: string
        description: string
    }
    teams_count?: number
    teams?: DashboardSpkTeamMember[]
    progress_report?: DashboardSpkProgressReportSummary
    pekerjaan_pr_pending?: DashboardSpkPekerjaanPrPendingSummary
    temuan?: DashboardSpkTemuanSummary
    perlu_approval_pr?: number
    menunggu_approval_saya?: number
}

export interface DashboardData {
    summary: DashboardSummary
    spks: DashboardSpkItem[]
}

export interface DashboardResponse {
    status: boolean
    message: string
    data: DashboardData
}

export interface DashboardFilters {
    client_code?: string
    als_spk_id?: number
    employee_code?: string
    bulan?: number
    tahun?: number
    tanggal?: string
}

export interface DashboardAnnouncementItem {
    id: number
    feed_id: string
    type: 'progress_report' | 'daily_progress' | string
    type_code: 'pr' | 'dp' | string
    type_label: string
    nomor: string
    announcement: {
        title: string
        message: string
        short_message?: string
        text: string
        creator_name: string
        action: string
        target_type: string
        target_nomor: string
    }
    navigation: {
        type: string
        id: number
        detail_path: string
        route_name: string
        api_endpoint: string
        url: string
    }
    creator: {
        employee_code: string
        employee_name: string
        tingkat?: number
        is_me?: boolean
    }
    spk: {
        id: number
        no_spk: string
        client_code: string
        client_name: string
        job_code?: string
        job_description?: string
    }
    approval_status?: string
    tanggal?: string
    bulan?: number
    tahun?: number
    tasks_count?: number
    created_at?: string
    time_ago?: string
}

export interface DashboardAnnouncementResponse {
    status: boolean
    message: string
    data: DashboardAnnouncementItem[]
    meta?: {
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
}

export interface DashboardAnnouncementFilters {
    als_spk_id?: number
    client_code?: string
    type?: string
    employee_code?: string
    bulan?: number
    tahun?: number
    tanggal?: string
    per_page?: number
    page?: number
}

