import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'

import type {
    CreateTemuanRequest,
    LaravelValidationErrorResponse,
    Temuan,
    TemuanApiResult,
    TemuanDeleteResponse,
    TemuanDetailResponse,
    TemuanErrorResponse,
    TemuanFile,
    TemuanFileResponse,
    TemuanFilters,
    TemuanListResponse,
    TemuanMutationResponse,
    UpdateTemuanRequest,
} from '@/features/temuan/types/temuan.types'

type TemuanError =
    | TemuanErrorResponse
    | LaravelValidationErrorResponse

const getErrorResult = (
    response: AxiosResponse<TemuanError>,
): TemuanApiResult<never> => {
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
    filters: TemuanFilters = {},
): Promise<TemuanApiResult<Temuan[]>> => {
    return httpClient
        .get<TemuanListResponse | TemuanError>(
            '/temuan',
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
                response as AxiosResponse<TemuanError>,
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
): Promise<TemuanApiResult<Temuan>> => {
    return httpClient
        .get<TemuanDetailResponse | TemuanError>(
            `/temuan/${id}`,
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
                response as AxiosResponse<TemuanError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const create = async (
    payload: CreateTemuanRequest,
): Promise<TemuanApiResult<Temuan>> => {
    return httpClient
        .post<TemuanMutationResponse | TemuanError>(
            '/temuan',
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
                response as AxiosResponse<TemuanError>,
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
    payload: UpdateTemuanRequest,
): Promise<TemuanApiResult<Temuan>> => {
    return httpClient
        .put<TemuanMutationResponse | TemuanError>(
            `/temuan/${id}`,
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
                response as AxiosResponse<TemuanError>,
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
): Promise<TemuanApiResult<null>> => {
    return httpClient
        .delete<TemuanDeleteResponse | TemuanError>(
            `/temuan/${id}`,
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
                response as AxiosResponse<TemuanError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const uploadFiles = async (
    temuanId: number,
    files: File[],
): Promise<TemuanApiResult<TemuanFile[]>> => {
    const formData = new FormData()

    files.forEach((file) => {
        formData.append('files[]', file)
    })

    return httpClient
        .post<TemuanFileResponse | TemuanError>(
            `/temuan/${temuanId}/files`,
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
                response as AxiosResponse<TemuanError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const deleteFile = async (
    temuanId: number,
    fileId: number,
): Promise<TemuanApiResult<null>> => {
    return httpClient
        .delete<TemuanDeleteResponse | TemuanError>(
            `/temuan/${temuanId}/files/${fileId}`,
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
                response as AxiosResponse<TemuanError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

export const temuanApi = {
    getAll,
    getById,
    create,
    update,
    remove,
    uploadFiles,
    deleteFile,
}
