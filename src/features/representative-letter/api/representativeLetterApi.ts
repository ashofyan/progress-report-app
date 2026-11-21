import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'

import type { DailyProgressFormSpk } from '@/features/daily-progress/types/daily-progress.types'

import type {
    AvailableProgressReport,
    AvailableProgressReportFilters,
    MasterJob,
    AvailableProgressReportsResponse,
    CreateRepresentativeLetterRequest,
    GenerateDraftPayload,
    GeneratedDraftDocument,
    GenerateDraftResponse,
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
    RepresentativeLetterTemplate,
    RepresentativeLetterTemplateDetailResponse,
    RepresentativeLetterTemplateFilters,
    RepresentativeLetterTemplateFormPayload,
    RepresentativeLetterTemplateListResponse,
    RepresentativeLetterTemplateMutationResponse,
    UpdateRepresentativeLetterRequest,
    GenerateAiNarrativePayload,
    GenerateAiNarrativeResult,
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

    if (payload.footer_image !== undefined) {
        formData.append('footer_image', payload.footer_image)
    }

    if (payload.footer_text !== undefined) {
        formData.append('footer_text', payload.footer_text)
    }

    if (payload.footer_type !== undefined) {
        formData.append('footer_type', payload.footer_type)
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

const getAvailableProgressReports = async (
    params: AvailableProgressReportFilters = {},
): Promise<RepresentativeLetterApiResult<AvailableProgressReport[]>> => {
    return httpClient
        .get<
            AvailableProgressReportsResponse | RepresentativeLetterError
        >('/representative-letters/available-progress-reports', { params })
        .then((response) => {
            const data = response.data
            if (
                ('success' in data && data.success) ||
                ('status' in data && data.status)
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: ('message' in data && typeof data.message === 'string')
                        ? data.message
                        : 'Berhasil mengambil progress report.',
                    data: ('data' in data && Array.isArray(data.data)) ? data.data : [],
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

const generateDraft = async (
    payload: GenerateDraftPayload,
): Promise<RepresentativeLetterApiResult<GeneratedDraftDocument>> => {
    return httpClient
        .post<
            GenerateDraftResponse | RepresentativeLetterError
        >('/representative-letters/generate-draft', payload)
        .then((response) => {
            const data = response.data
            if (
                ('success' in data && data.success) ||
                ('status' in data && data.status)
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: ('message' in data && typeof data.message === 'string')
                        ? data.message
                        : 'Draft Representative Letter berhasil digenerate.',
                    data: ('data' in data) ? (data.data as GeneratedDraftDocument) : undefined,
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

const uploadImage = async (
    file: File,
): Promise<RepresentativeLetterApiResult<{ url: string; path: string }>> => {
    const formData = new FormData()
    formData.append('image', file)

    return httpClient
        .post<
            | { success: boolean; status: boolean; message: string; data: { url: string; path: string } }
            | RepresentativeLetterError
        >('/representative-letters/upload-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        .then((response) => {
            const data = response.data
            if ('data' in data && data.data && typeof data.data === 'object' && 'url' in data.data) {
                return {
                    success: true,
                    status: response.status,
                    message: ('message' in data && typeof data.message === 'string')
                        ? data.message
                        : 'Gambar berhasil diunggah.',
                    data: data.data,
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

const getTemplates = async (
    filters: RepresentativeLetterTemplateFilters = {},
): Promise<RepresentativeLetterApiResult<RepresentativeLetterTemplate[]>> => {
    return httpClient
        .get<
            RepresentativeLetterTemplateListResponse | RepresentativeLetterError
        >('/representative-letter-templates', { params: filters })
        .then((response) => {
            if ('status' in response.data && response.data.status) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                    meta: response.data.meta,
                }
            }

            return getErrorResult(response as AxiosResponse<RepresentativeLetterError>)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getTemplateById = async (
    id: number,
): Promise<RepresentativeLetterApiResult<RepresentativeLetterTemplate>> => {
    return httpClient
        .get<
            RepresentativeLetterTemplateDetailResponse | RepresentativeLetterError
        >(`/representative-letter-templates/${id}`)
        .then((response) => {
            if ('status' in response.data && response.data.status) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(response as AxiosResponse<RepresentativeLetterError>)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const createTemplate = async (
    payload: RepresentativeLetterTemplateFormPayload,
): Promise<RepresentativeLetterApiResult<RepresentativeLetterTemplate>> => {
    return httpClient
        .post<
            RepresentativeLetterTemplateMutationResponse | RepresentativeLetterError
        >('/representative-letter-templates', payload)
        .then((response) => {
            if ('status' in response.data && response.data.status) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(response as AxiosResponse<RepresentativeLetterError>)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const updateTemplate = async (
    id: number,
    payload: Partial<RepresentativeLetterTemplateFormPayload>,
): Promise<RepresentativeLetterApiResult<RepresentativeLetterTemplate>> => {
    return httpClient
        .put<
            RepresentativeLetterTemplateMutationResponse | RepresentativeLetterError
        >(`/representative-letter-templates/${id}`, payload)
        .then((response) => {
            if ('status' in response.data && response.data.status) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(response as AxiosResponse<RepresentativeLetterError>)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const exportPdf = async (id: number): Promise<Blob> => {
    const response = await httpClient.get<Blob>(
        `/representative-letters/${id}/export-pdf`,
        {
            responseType: 'blob',
        },
    )
    return response.data
}

const deleteLetter = async (
    id: number,
): Promise<RepresentativeLetterApiResult<void>> => {
    return httpClient
        .delete<{ status: boolean; message: string } | RepresentativeLetterError>(
            `/representative-letters/${id}`,
        )
        .then((response) => {
            if ('status' in response.data && response.data.status) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                }
            }

            return getErrorResult(response as AxiosResponse<RepresentativeLetterError>)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const deleteTemplate = async (
    id: number,
): Promise<RepresentativeLetterApiResult<void>> => {
    return httpClient
        .delete<{ status: boolean; message: string } | RepresentativeLetterError>(
            `/representative-letter-templates/${id}`,
        )
        .then((response) => {
            if ('status' in response.data && response.data.status) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                }
            }

            return getErrorResult(response as AxiosResponse<RepresentativeLetterError>)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getJobs = async (
    params: { client_code?: string } = {},
): Promise<RepresentativeLetterApiResult<MasterJob[]>> => {
    return httpClient
        .get<{ success: boolean; data: MasterJob[] } | RepresentativeLetterError>(
            '/representative-letters/jobs',
            { params },
        )
        .then((response) => {
            if ('data' in response.data && Array.isArray(response.data.data)) {
                return {
                    success: true,
                    status: response.status,
                    message: 'Berhasil mengambil daftar jasa.',
                    data: response.data.data,
                }
            }
            return getErrorResult(response as AxiosResponse<RepresentativeLetterError>)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getSpks = async (
    params: { client_code?: string; job_id?: number } = {},
): Promise<RepresentativeLetterApiResult<DailyProgressFormSpk[]>> => {
    return httpClient
        .get<{ success: boolean; data: DailyProgressFormSpk[] } | RepresentativeLetterError>(
            '/representative-letters/spks',
            { params },
        )
        .then((response) => {
            if ('data' in response.data && Array.isArray(response.data.data)) {
                return {
                    success: true,
                    status: response.status,
                    message: 'Berhasil mengambil daftar SPK.',
                    data: response.data.data,
                }
            }
            return getErrorResult(response as AxiosResponse<RepresentativeLetterError>)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}


const generateAiNarrative = async (
    letterId: number,
    payload: GenerateAiNarrativePayload,
): Promise<RepresentativeLetterApiResult<GenerateAiNarrativeResult>> => {
    return httpClient
        .post<{ success: boolean; status: boolean; message: string; data: GenerateAiNarrativeResult } | RepresentativeLetterError>(
            `/representative-letters/${letterId}/generate-ai`,
            payload,
        )
        .then((response) => {
            const data = response.data
            if (
                ('success' in data && data.success) ||
                ('status' in data && data.status)
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: ('message' in data && typeof data.message === 'string')
                        ? data.message
                        : 'Narasi AI berhasil dibuat.',
                    data: ('data' in data) ? (data.data as GenerateAiNarrativeResult) : undefined,
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

const generateAiNarrativeAdHoc = async (
    payload: GenerateAiNarrativePayload,
): Promise<RepresentativeLetterApiResult<GenerateAiNarrativeResult>> => {
    return httpClient
        .post<{ success: boolean; status: boolean; message: string; data: GenerateAiNarrativeResult } | RepresentativeLetterError>(
            '/representative-letters/generate-ai',
            payload,
        )
        .then((response) => {
            const data = response.data
            if (
                ('success' in data && data.success) ||
                ('status' in data && data.status)
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: ('message' in data && typeof data.message === 'string')
                        ? data.message
                        : 'Narasi AI berhasil dibuat.',
                    data: ('data' in data) ? (data.data as GenerateAiNarrativeResult) : undefined,
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
    generateAiNarrative,
    generateAiNarrativeAdHoc,
    getAll,
    preview,
    create,
    getById,
    update,
    delete: deleteLetter,
    exportPdf,
    getHeaders,
    getHeaderById,
    createHeader,
    updateHeader,
    activateHeader,
    getAvailableProgressReports,
    getJobs,
    getSpks,
    generateDraft,
    uploadImage,
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
}
