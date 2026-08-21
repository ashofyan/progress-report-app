export interface JobSubTask {
    id: number
    task_name: string
}

export interface JobTask {
    id: number
    task_name: string
    children: JobSubTask[]
}

export interface JobAdditionalTask {
    id: number
    task_name: string
    parent_id: number | null
    status: string
}

export interface MasterJob {
    id: number
    job_code: string
    description: string
    tasks: JobTask[]
    task_additionals: JobAdditionalTask[]
    created_at: string
    updated_at: string
}

export interface JobSubTaskPayload {
    id?: number
    task_name: string
}

export interface JobTaskPayload {
    id?: number
    task_name: string
    children: JobSubTaskPayload[]
}

export interface CreateMasterJobRequest {
    job_code: string
    description: string
    tasks: JobTaskPayload[]
}

export interface UpdateMasterJobRequest {
    job_code: string
    description: string
    tasks?: JobTaskPayload[]
}

export interface MasterJobListResponse {
    success: true
    data: MasterJob[]
}

export interface MasterJobDetailResponse {
    success: true
    data: MasterJob
}

export interface MasterJobMutationResponse {
    success: true
    message: string
    data: MasterJob
}

export interface MasterJobDeleteResponse {
    success: true
    message: string
}

export interface MasterJobErrorResponse {
    success: false
    message: string
}

export interface LaravelValidationErrorResponse {
    message: string
    errors: Record<string, string[]>
}

export interface MasterJobApiResult<T> {
    success: boolean
    status: number
    message: string
    data?: T
    errors?: Record<string, string[]>
}
