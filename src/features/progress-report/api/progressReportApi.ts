import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'

import type {
    CreateProgressReportRequest,
    LaravelValidationErrorResponse,
    ProgressReport,
    ProgressReportApiResult,
    ProgressReportDeleteResponse,
    ProgressReportDetailResponse,
    ProgressReportDocument,
    ProgressReportDocumentResponse,
    ProgressReportErrorResponse,
    ProgressReportFilters,
    ProgressReportFormData,
    ProgressReportFormDataFilters,
    ProgressReportFormDataResponse,
    ProgressReportHistory,
    ProgressReportHistoryFilters,
    ProgressReportHistoryResponse,
    ProgressReportListResponse,
    ProgressReportMutationResponse,
    ProgressReportSummary,
} from '@/features/progress-report/types/progress-report.types'

type ProgressReportError =
    | ProgressReportErrorResponse
    | LaravelValidationErrorResponse

const getErrorResult = (
    response: AxiosResponse<ProgressReportError>,
): ProgressReportApiResult<never> => {
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
    filters: ProgressReportFilters = {},
): Promise<
    ProgressReportApiResult<ProgressReportSummary[]>
> => {
    return httpClient
        .get<ProgressReportListResponse | ProgressReportError>(
            '/progress-report',
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
                    meta: response.data.meta,
                }
            }

            return getErrorResult(
                response as AxiosResponse<ProgressReportError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getFormData = async (
    filters: ProgressReportFormDataFilters,
): Promise<ProgressReportApiResult<ProgressReportFormData>> => {
    return httpClient
        .get<
            ProgressReportFormDataResponse | ProgressReportError
        >('/progress-report/form-data', {
            params: filters,
        })
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
                response as AxiosResponse<ProgressReportError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getHistory = async (
    filters: ProgressReportHistoryFilters,
): Promise<
    ProgressReportApiResult<ProgressReportHistory[]>
> => {
    return httpClient
        .get<
            ProgressReportHistoryResponse | ProgressReportError
        >('/progress-report/history', {
            params: filters,
        })
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
                response as AxiosResponse<ProgressReportError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const create = async (
    payload: CreateProgressReportRequest,
): Promise<ProgressReportApiResult<ProgressReport>> => {
    return httpClient
        .post<
            ProgressReportMutationResponse | ProgressReportError
        >('/progress-report', payload)
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
                response as AxiosResponse<ProgressReportError>,
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
): Promise<ProgressReportApiResult<ProgressReport>> => {
    return httpClient
        .get<
            ProgressReportDetailResponse | ProgressReportError
        >(`/progress-report/${id}`)
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
                response as AxiosResponse<ProgressReportError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const uploadDocumentRequest = async (
    endpoint: string,
    files: File[],
): Promise<
    ProgressReportApiResult<ProgressReportDocument[]>
> => {
    const formData = new FormData()

    files.forEach((file) => {
        formData.append('documents[]', file)
    })

    return httpClient
        .post<ProgressReportDocumentResponse | ProgressReportError>(
            endpoint,
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
                response as AxiosResponse<ProgressReportError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const uploadDocuments = async (
    progressReportId: number,
    files: File[],
): Promise<
    ProgressReportApiResult<ProgressReportDocument[]>
> => {
    return uploadDocumentRequest(
        `/progress-report/${progressReportId}/documents`,
        files,
    )
}

const uploadDetailDocuments = async (
    progressReportId: number,
    detailId: number,
    files: File[],
): Promise<
    ProgressReportApiResult<ProgressReportDocument[]>
> => {
    return uploadDocumentRequest(
        `/progress-report/${progressReportId}/details/${detailId}/documents`,
        files,
    )
}

const uploadFindingDocuments = async (
    progressReportId: number,
    findingId: number,
    files: File[],
): Promise<
    ProgressReportApiResult<ProgressReportDocument[]>
> => {
    return uploadDocumentRequest(
        `/progress-report/${progressReportId}/findings/${findingId}/documents`,
        files,
    )
}

const deleteDocumentRequest = async (
    endpoint: string,
): Promise<ProgressReportApiResult<null>> => {
    return httpClient
        .delete<ProgressReportDeleteResponse | ProgressReportError>(
            endpoint,
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
                response as AxiosResponse<ProgressReportError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const deleteDocument = async (
    progressReportId: number,
    documentId: number,
): Promise<ProgressReportApiResult<null>> => {
    return deleteDocumentRequest(
        `/progress-report/${progressReportId}/documents/${documentId}`,
    )
}

const deleteDetailDocument = async (
    progressReportId: number,
    detailId: number,
    documentId: number,
): Promise<ProgressReportApiResult<null>> => {
    return deleteDocumentRequest(
        `/progress-report/${progressReportId}/details/${detailId}/documents/${documentId}`,
    )
}

const deleteFindingDocument = async (
    progressReportId: number,
    findingId: number,
    documentId: number,
): Promise<ProgressReportApiResult<null>> => {
    return deleteDocumentRequest(
        `/progress-report/${progressReportId}/findings/${findingId}/documents/${documentId}`,
    )
}

export const progressReportApi = {
    getAll,
    getFormData,
    getHistory,
    create,
    getById,
    uploadDocuments,
    uploadDetailDocuments,
    uploadFindingDocuments,
    deleteDocument,
    deleteDetailDocument,
    deleteFindingDocument,
}
