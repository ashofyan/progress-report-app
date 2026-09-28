import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'

import type {
    CreateRepresentativeLetterRequest,
    LaravelValidationErrorResponse,
    RepresentativeLetter,
    RepresentativeLetterApiResult,
    RepresentativeLetterDetailResponse,
    RepresentativeLetterErrorResponse,
    RepresentativeLetterFilters,
    RepresentativeLetterHeader,
    RepresentativeLetterHeaderDetailResponse,
    RepresentativeLetterHeaderFilters,
    RepresentativeLetterHeaderFormPayload,
    RepresentativeLetterHeaderListResponse,
    RepresentativeLetterHeaderMutationResponse,
    RepresentativeLetterListItem,
    RepresentativeLetterListResponse,
    RepresentativeLetterMutationResponse,
    RepresentativeLetterPreview,
    RepresentativeLetterPreviewFilters,
    RepresentativeLetterPreviewResponse,
    UpdateRepresentativeLetterRequest,
} from '@/features/representative-letter/types/representative-letter.types'

type RepresentativeLetterError =
    | RepresentativeLetterErrorResponse
    | LaravelValidationErrorResponse

const getErrorResult = (
    response: AxiosResponse<RepresentativeLetterError>,
): RepresentativeLetterApiResult<never> => {
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

const createHeaderFormData = (
    payload: RepresentativeLetterHeaderFormPayload,
): FormData => {
    const formData = new FormData()

    if (payload.code !== undefined) {
        formData.append('code', payload.code)
    }

    if (payload.name !== undefined) {
        formData.append('name', payload.name)
    }

    if (payload.header_image !== undefined) {
        formData.append('header_image', payload.header_image)
    }

    if (payload.is_active !== undefined) {
        formData.append(
            'is_active',
            payload.is_active ? '1' : '0',
        )
    }

    return formData
}

const getAll = async (
    filters: RepresentativeLetterFilters = {},
): Promise<
    RepresentativeLetterApiResult<RepresentativeLetterListItem[]>
> => {
    return httpClient
        .get<
            RepresentativeLetterListResponse | RepresentativeLetterError
        >('/representative-letter', { params: filters })
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
                    meta: response.data.meta,
                }
            }

            return getErrorResult(
                response as AxiosResponse<RepresentativeLetterError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const preview = async (
    filters: RepresentativeLetterPreviewFilters,
): Promise<RepresentativeLetterApiResult<RepresentativeLetterPreview>> => {
    return httpClient
        .get<
            RepresentativeLetterPreviewResponse | RepresentativeLetterError
        >('/representative-letter/preview', { params: filters })
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
                response as AxiosResponse<RepresentativeLetterError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const create = async (
    payload: CreateRepresentativeLetterRequest,
): Promise<RepresentativeLetterApiResult<RepresentativeLetter>> => {
    return httpClient
        .post<
            RepresentativeLetterMutationResponse | RepresentativeLetterError
        >('/representative-letter', payload)
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
                response as AxiosResponse<RepresentativeLetterError>,
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
): Promise<RepresentativeLetterApiResult<RepresentativeLetter>> => {
    return httpClient
        .get<
            RepresentativeLetterDetailResponse | RepresentativeLetterError
        >(`/representative-letter/${id}`)
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
                response as AxiosResponse<RepresentativeLetterError>,
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
    payload: UpdateRepresentativeLetterRequest,
): Promise<RepresentativeLetterApiResult<RepresentativeLetter>> => {
    return httpClient
        .put<
            RepresentativeLetterMutationResponse | RepresentativeLetterError
        >(`/representative-letter/${id}`, payload)
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
                response as AxiosResponse<RepresentativeLetterError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getHeaders = async (
    filters: RepresentativeLetterHeaderFilters = {},
): Promise<
    RepresentativeLetterApiResult<RepresentativeLetterHeader[]>
> => {
    return httpClient
        .get<
            | RepresentativeLetterHeaderListResponse
            | RepresentativeLetterError
        >('/representative-letter-header', { params: filters })
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
                    meta: response.data.meta,
                }
            }

            return getErrorResult(
                response as AxiosResponse<RepresentativeLetterError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getHeaderById = async (
    id: number,
): Promise<RepresentativeLetterApiResult<RepresentativeLetterHeader>> => {
    return httpClient
        .get<
            | RepresentativeLetterHeaderDetailResponse
            | RepresentativeLetterError
        >(`/representative-letter-header/${id}`)
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
                response as AxiosResponse<RepresentativeLetterError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const createHeader = async (
    payload: RepresentativeLetterHeaderFormPayload,
): Promise<RepresentativeLetterApiResult<RepresentativeLetterHeader>> => {
    return httpClient
        .post<
            | RepresentativeLetterHeaderMutationResponse
            | RepresentativeLetterError
        >(
            '/representative-letter-header',
            createHeaderFormData(payload),
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
                response as AxiosResponse<RepresentativeLetterError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const updateHeader = async (
    id: number,
    payload: RepresentativeLetterHeaderFormPayload,
): Promise<RepresentativeLetterApiResult<RepresentativeLetterHeader>> => {
    return httpClient
        .put<
            | RepresentativeLetterHeaderMutationResponse
            | RepresentativeLetterError
        >(
            `/representative-letter-header/${id}`,
            createHeaderFormData(payload),
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
                response as AxiosResponse<RepresentativeLetterError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const activateHeader = async (
    id: number,
): Promise<RepresentativeLetterApiResult<RepresentativeLetterHeader>> => {
    return httpClient
        .post<
            | RepresentativeLetterHeaderMutationResponse
            | RepresentativeLetterError
        >(`/representative-letter-header/${id}/activate`)
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
                response as AxiosResponse<RepresentativeLetterError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

export const representativeLetterApi = {
    getAll,
    preview,
    create,
    getById,
    update,
    getHeaders,
    getHeaderById,
    createHeader,
    updateHeader,
    activateHeader,
}
