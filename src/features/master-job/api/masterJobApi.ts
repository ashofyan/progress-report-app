import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'

import type {
    CreateMasterJobRequest,
    LaravelValidationErrorResponse,
    MasterJob,
    MasterJobApiResult,
    MasterJobDeleteResponse,
    MasterJobDetailResponse,
    MasterJobErrorResponse,
    MasterJobListResponse,
    MasterJobMutationResponse,
    UpdateMasterJobRequest,
} from '@/features/master-job/types/master-job.types'

type JobError =
    | MasterJobErrorResponse
    | LaravelValidationErrorResponse

const getErrorResult = (
    response: AxiosResponse<JobError>,
): MasterJobApiResult<never> => {
    const responseData = response.data

    if ('errors' in responseData) {
        return {
            success: false,
            status: response.status,
            message: responseData.message,
            errors: responseData.errors,
        }
    }

    return {
        success: false,
        status: response.status,
        message: responseData.message,
    }
}

const getAll = async (): Promise<
    MasterJobApiResult<MasterJob[]>
> => {
    return httpClient
        .get<MasterJobListResponse | JobError>('/jobs')
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: '',
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<JobError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getById = async (
    id: number,
): Promise<MasterJobApiResult<MasterJob>> => {
    return httpClient
        .get<MasterJobDetailResponse | JobError>(
            `/jobs/${id}`,
        )
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: '',
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<JobError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const create = async (
    payload: CreateMasterJobRequest,
): Promise<MasterJobApiResult<MasterJob>> => {
    return httpClient
        .post<MasterJobMutationResponse | JobError>(
            '/jobs',
            payload,
        )
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<JobError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const update = async (
    id: number,
    payload: UpdateMasterJobRequest,
): Promise<MasterJobApiResult<MasterJob>> => {
    return httpClient
        .put<MasterJobMutationResponse | JobError>(
            `/jobs/${id}`,
            payload,
        )
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<JobError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const remove = async (
    id: number,
): Promise<MasterJobApiResult<null>> => {
    return httpClient
        .delete<MasterJobDeleteResponse | JobError>(
            `/jobs/${id}`,
        )
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: null,
                }
            }

            return getErrorResult(
                response as AxiosResponse<JobError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

export const masterJobApi = {
    getAll,
    getById,
    create,
    update,
    remove,
}
