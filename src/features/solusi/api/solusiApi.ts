import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'

import type {
    CreateSolusiRequest,
    LaravelValidationErrorResponse,
    Solusi,
    SolusiApiResult,
    SolusiDeleteResponse,
    SolusiDetailResponse,
    SolusiErrorResponse,
    SolusiFile,
    SolusiFileResponse,
    SolusiFilters,
    SolusiFormDataResponse,
    SolusiFormTemuan,
    SolusiListResponse,
    SolusiMutationResponse,
    UpdateSolusiRequest,
} from '@/features/solusi/types/solusi.types'

type SolusiError =
    | SolusiErrorResponse
    | LaravelValidationErrorResponse

const getErrorResult = (
    response: AxiosResponse<SolusiError>,
): SolusiApiResult<never> => {
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

const getFormData = async (): Promise<
    SolusiApiResult<SolusiFormTemuan[]>
> => {
    return httpClient
        .get<SolusiFormDataResponse | SolusiError>(
            '/solusi/form-data',
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
                response as AxiosResponse<SolusiError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getAll = async (
    filters: SolusiFilters = {},
): Promise<SolusiApiResult<Solusi[]>> => {
    return httpClient
        .get<SolusiListResponse | SolusiError>(
            '/solusi',
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
                response as AxiosResponse<SolusiError>,
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
): Promise<SolusiApiResult<Solusi>> => {
    return httpClient
        .get<SolusiDetailResponse | SolusiError>(
            `/solusi/${id}`,
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
                response as AxiosResponse<SolusiError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const create = async (
    payload: CreateSolusiRequest,
): Promise<SolusiApiResult<Solusi>> => {
    return httpClient
        .post<SolusiMutationResponse | SolusiError>(
            '/solusi',
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
                response as AxiosResponse<SolusiError>,
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
    payload: UpdateSolusiRequest,
): Promise<SolusiApiResult<Solusi>> => {
    return httpClient
        .put<SolusiMutationResponse | SolusiError>(
            `/solusi/${id}`,
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
                response as AxiosResponse<SolusiError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const uploadFiles = async (
    solusiId: number,
    files: File[],
): Promise<SolusiApiResult<SolusiFile[]>> => {
    const formData = new FormData()

    files.forEach((file) => {
        formData.append('files[]', file)
    })

    return httpClient
        .post<SolusiFileResponse | SolusiError>(
            `/solusi/${solusiId}/files`,
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
                response as AxiosResponse<SolusiError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const deleteFile = async (
    solusiId: number,
    fileId: number,
): Promise<SolusiApiResult<null>> => {
    return httpClient
        .delete<SolusiDeleteResponse | SolusiError>(
            `/solusi/${solusiId}/files/${fileId}`,
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
                response as AxiosResponse<SolusiError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

export const solusiApi = {
    getFormData,
    getAll,
    getById,
    create,
    update,
    uploadFiles,
    deleteFile,
}
