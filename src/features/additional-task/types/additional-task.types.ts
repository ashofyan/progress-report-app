import type { MasterJob } from '@/features/master-job/types/master-job.types'

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

export interface AdditionalTask {
    id: number
    nomor: string
    client_code: string
    job: AdditionalTaskJob
    details: AdditionalTaskDetail[]
    created_by: string
    created_at: string
    updated_at: string
}

export interface AdditionalTaskFilters {
    client_code?: string
    job_id?: number
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
    job_id: number
    details: CreateAdditionalTaskDetailRequest[]
}

export interface UpdateAdditionalTaskRequest {
    client_code: string
    job_id: number
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
