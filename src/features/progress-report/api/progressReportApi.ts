import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'
import { authStorage } from '@/features/auth/services/authStorage'

import type {
    CreateProgressReportRequest,
    EditProgressReportRequest,
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
    ProgressReportPendingApprovalsFilters,
    ProgressReportSummary,
    ProgressReportTeamData,
    ProgressReportTeamFilters,
    ProgressReportTeamResponse,
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

const update = async (
    id: number,
    payload: EditProgressReportRequest,
): Promise<ProgressReportApiResult<ProgressReport>> => {
    return httpClient
        .put<
            ProgressReportMutationResponse | ProgressReportError
        >(`/progress-report/${id}`, payload)
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

const approve = async (
    id: number,
): Promise<ProgressReportApiResult<ProgressReport>> => {
    return httpClient
        .post<
            ProgressReportMutationResponse | ProgressReportError
        >(`/progress-report/${id}/approve`)
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

const getPendingApprovals = async (
    filters: ProgressReportPendingApprovalsFilters = {},
): Promise<
    ProgressReportApiResult<ProgressReportSummary[]>
> => {
    return httpClient
        .get<ProgressReportListResponse | ProgressReportError>(
            '/progress-report/pending-approvals',
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

const getTeam = async (
    filters: ProgressReportTeamFilters,
): Promise<ProgressReportApiResult<ProgressReportTeamData>> => {
    return httpClient
        .get<ProgressReportTeamResponse | ProgressReportError>(
            '/progress-report/team',
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
                response as AxiosResponse<ProgressReportError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const exportPdf = async (
    progressReportId: number,
): Promise<{ success: boolean; blob?: Blob; message?: string }> => {
    try {
        const token = authStorage.getToken()
        const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
        const url = `${apiBaseUrl}/progress-report/${progressReportId}/export-pdf`

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token ?? ''}`,
                Accept: 'application/pdf, application/json',
            },
        })

        if (!response.ok) {
            if (response.status === 401) {
                authStorage.removeToken()
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login'
                }
            }

            let message = 'Gagal mengekspor PDF.'
            try {
                const errorData = await response.json()
                if (errorData.message) {
                    message = errorData.message
                }
            } catch {
                // response is not json
            }
            return { success: false, message }
        }

        const blob = await response.blob()
        return { success: true, blob }
    } catch {
        return { success: false, message: 'Tidak dapat terhubung ke server.' }
    }
}

const downloadPdf = async (
    progressReportId: number,
    customFilename?: string,
): Promise<{ success: boolean; message?: string }> => {
    const result = await exportPdf(progressReportId)
    if (!result.success || !result.blob) {
        return { success: false, message: result.message || 'Gagal mengunduh PDF.' }
    }

    const blobUrl = window.URL.createObjectURL(result.blob)
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = customFilename || `Progress_Report_${progressReportId}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(blobUrl)

    return { success: true }
}

export const progressReportApi = {
    getAll,
    getFormData,
    getHistory,
    create,
    update,
    approve,
    getPendingApprovals,
    getById,
    getTeam,
    uploadDocuments,
    uploadDetailDocuments,
    uploadFindingDocuments,
    deleteDocument,
    deleteDetailDocument,
    deleteFindingDocument,
    exportPdf,
    downloadPdf,
}
