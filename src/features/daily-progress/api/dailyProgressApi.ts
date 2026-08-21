import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'

import type {
    CreateDailyProgressRequest,
    DailyProgress,
    DailyProgressApiResult,
    DailyProgressDeleteResponse,
    DailyProgressDetailResponse,
    DailyProgressDocument,
    DailyProgressDocumentResponse,
    DailyProgressErrorResponse,
    DailyProgressFormData,
    DailyProgressFormDataFilters,
    DailyProgressFormDataResponse,
    DailyProgressFilters,
    DailyProgressListResponse,
    DailyProgressMutationResponse,
    LaravelValidationErrorResponse,
    PendingDailyProgressFilters,
    PendingDailyProgress,
    PendingDailyProgressResponse,
    UpdateDailyProgressRequest,
} from '@/features/daily-progress/types/daily-progress.types'

type ProgressError =
    | DailyProgressErrorResponse
    | LaravelValidationErrorResponse

const getErrorResult = (
    response: AxiosResponse<ProgressError>,
): DailyProgressApiResult<never> => {
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

const getAll = async (
    filters: DailyProgressFilters = {},
): Promise<DailyProgressApiResult<DailyProgress[]>> => {
    return httpClient
        .get<DailyProgressListResponse | ProgressError>(
            '/daily-progress',
            { params: filters },
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getFormData = async (
    filters: DailyProgressFormDataFilters,
): Promise<DailyProgressApiResult<DailyProgressFormData>> => {
    return httpClient
        .get<DailyProgressFormDataResponse | ProgressError>(
            '/daily-progress/form-data',
            { params: filters },
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
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
): Promise<DailyProgressApiResult<DailyProgress>> => {
    return httpClient
        .get<DailyProgressDetailResponse | ProgressError>(
            `/daily-progress/${id}`,
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const create = async (
    payload: CreateDailyProgressRequest,
): Promise<DailyProgressApiResult<DailyProgress>> => {
    return httpClient
        .post<DailyProgressMutationResponse | ProgressError>(
            '/daily-progress',
            payload,
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
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
    payload: UpdateDailyProgressRequest,
): Promise<DailyProgressApiResult<DailyProgress>> => {
    return httpClient
        .put<DailyProgressMutationResponse | ProgressError>(
            `/daily-progress/${id}`,
            payload,
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
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
): Promise<DailyProgressApiResult<null>> => {
    return httpClient
        .delete<DailyProgressDeleteResponse | ProgressError>(
            `/daily-progress/${id}`,
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: null,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getPending = async (
    filters: PendingDailyProgressFilters = {},
): Promise<DailyProgressApiResult<PendingDailyProgress[]>> => {
    const params =
        filters.client_code === undefined
            ? {}
            : { client_code: filters.client_code }

    return httpClient
        .get<PendingDailyProgressResponse | ProgressError>(
            '/daily-progress/pending',
            { params },
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const deleteDetail = async (
    dailyProgressId: number,
    detailId: number,
): Promise<DailyProgressApiResult<DailyProgress>> => {
    return httpClient
        .delete<DailyProgressMutationResponse | ProgressError>(
            `/daily-progress/${dailyProgressId}/details/${detailId}`,
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const uploadDocuments = async (
    dailyProgressId: number,
    detailId: number,
    files: File[],
): Promise<
    DailyProgressApiResult<DailyProgressDocument[]>
> => {
    const formData = new FormData()

    files.forEach((file) => {
        formData.append('documents[]', file)
    })

    return httpClient
        .post<DailyProgressDocumentResponse | ProgressError>(
            `/daily-progress/${dailyProgressId}/details/${detailId}/documents`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            },
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const deleteDocument = async (
    dailyProgressId: number,
    detailId: number,
    documentId: number,
): Promise<DailyProgressApiResult<null>> => {
    return httpClient
        .delete<DailyProgressDeleteResponse | ProgressError>(
            `/daily-progress/${dailyProgressId}/details/${detailId}/documents/${documentId}`,
        )
        .then((response) => {
            if (
                'status' in response.data &&
                response.data.status
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: null,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

export const dailyProgressApi = {
    getAll,
    getFormData,
    getById,
    create,
    update,
    remove,
    getPending,
    deleteDetail,
    uploadDocuments,
    deleteDocument,
}
