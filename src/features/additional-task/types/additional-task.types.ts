import type { MasterJob } from '@/features/master-job/types/master-job.types'

export type AdditionalTaskType =
    | 'custom'
    | 'tambahan'

export type AdditionalTaskStatus =
    | 'open'
    | 'pending'
    | 'batal'
    | 'selesai'

export interface AdditionalTaskJob {
    id: number
    job_code: string
    description: string
}

export interface AdditionalTaskSpk {
    id: number
    no_spk: string
    note?: string | null
    kode_product_jasa?: string | null
}

export interface AdditionalTaskSpkOption {
    id: number
    no_spk: string
    kode_klien: string
    kode_product_jasa?: string | null
    note?: string | null
    job?: {
        id: number
        job_code: string
        description: string
        tasks: Array<{
            id: number
            task_name: string
        }>
    } | null
}

export interface AdditionalTaskItem {
    id: number
    task_name: string
    status: AdditionalTaskStatus
}

export interface AdditionalTaskDetail {
    parent_id: number
    parent_task: string
    tasks: AdditionalTaskItem[]
}

export const PRIORITY_LABELS: Record<number, string> = {
    1: 'P1 - Sangat Rendah',
    2: 'P2 - Rendah',
    3: 'P3 - Sedang',
    4: 'P4 - Tinggi',
    5: 'P5 - Kritis',
}

export const PRIORITY_OPTIONS: Array<{ value: number; label: string }> = [
    { value: 1, label: 'P1 - Sangat Rendah' },
    { value: 2, label: 'P2 - Rendah' },
    { value: 3, label: 'P3 - Sedang' },
    { value: 4, label: 'P4 - Tinggi' },
    { value: 5, label: 'P5 - Kritis' },
]

export interface AdditionalTask {
    id: number
    nomor: string
    client_code: string
    als_spk_id?: number | null
    spk?: AdditionalTaskSpk | null
    job: AdditionalTaskJob
    type?: AdditionalTaskType
    priority?: number
    details: AdditionalTaskDetail[]
    created_by: string
    created_at: string
    updated_at: string
}

export interface AdditionalTaskFilters {
    client_code?: string
    als_spk_id?: number
    job_id?: number
    type?: AdditionalTaskType
    priority?: number
}

export interface CreateAdditionalTaskItemRequest {
    task_name: string
}

export interface UpdateAdditionalTaskItemRequest {
    id?: number
    task_name: string
    status?: AdditionalTaskStatus
}

export interface CreateAdditionalTaskDetailRequest {
    parent_id: number
    tasks: CreateAdditionalTaskItemRequest[]
}

export interface UpdateAdditionalTaskDetailRequest {
    parent_id: number
    tasks: UpdateAdditionalTaskItemRequest[]
}

export interface CreateAdditionalTaskRequest {
    client_code: string
    als_spk_id: number
    job_id: number
    type?: AdditionalTaskType
    priority?: number
    details: CreateAdditionalTaskDetailRequest[]
}

export interface UpdateAdditionalTaskRequest {
    client_code: string
    als_spk_id?: number
    job_id: number
    type?: AdditionalTaskType
    priority?: number
    details: UpdateAdditionalTaskDetailRequest[]
}

export interface AdditionalTaskListResponse {
    success: true
    message: string
    data: AdditionalTask[]
}

export interface AdditionalTaskDetailResponse {
    success: true
    message: string
    data: AdditionalTask
}

export interface AdditionalTaskMutationResponse {
    success: true
    message: string
    data: AdditionalTask
}

export interface AdditionalTaskDeleteResponse {
    success: true
    message: string
    data: null
}

export interface AdditionalTaskErrorResponse {
    success: false
    message: string
    data?: null
}

export interface LaravelValidationErrorResponse {
    message: string
    errors: Record<string, string[]>
}

export interface AdditionalTaskApiResult<T> {
    success: boolean
    status: number
    message: string
    data?: T
    errors?: Record<string, string[]>
}

export type SelectableJob = Pick<
    MasterJob,
    'id' | 'job_code' | 'description' | 'tasks'
>
