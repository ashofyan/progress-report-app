import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'
import type {
    TimelineApiResult,
    TimelineClientItem,
    TimelineClientsResponse,
    TimelineData,
    TimelineFilters,
    TimelineResponse,
    TimelineSpkItem,
    TimelineSpksResponse,
} from '@/features/timeline/types/timeline.types'


interface CommonErrorResponse {
    status?: boolean
    message?: string
}

const getClients = async (): Promise<TimelineApiResult<TimelineClientItem[]>> => {
    return httpClient
        .get<TimelineClientsResponse | CommonErrorResponse>('/timeline/clients')
        .then((response) => {
            if ('status' in response.data && response.data.status) {
                return {
                    success: true,
                    status: response.status,
                    message:
                        (response.data as TimelineClientsResponse).message ??
                        'Daftar Client beraktivitas berhasil diambil.',
                    data: (response.data as TimelineClientsResponse).data,
                }
            }

            return {
                success: false,
                status: response.status,
                message:
                    response.data?.message ??
                    'Gagal mengambil daftar Client beraktivitas.',
            }
        })
        .catch((error: { response?: AxiosResponse<CommonErrorResponse> }) => ({
            success: false,
            status: error.response?.status ?? 0,
            message:
                error.response?.data?.message ??
                'Tidak dapat terhubung ke server.',
        }))
}

const getSpks = async (
    filters: { client_code?: string } = {},
): Promise<TimelineApiResult<TimelineSpkItem[]>> => {
    return httpClient
        .get<TimelineSpksResponse | CommonErrorResponse>('/timeline/spks', {
            params: filters,
        })
        .then((response) => {
            if ('status' in response.data && response.data.status) {
                return {
                    success: true,
                    status: response.status,
                    message:
                        (response.data as TimelineSpksResponse).message ??
                        'Daftar SPK beraktivitas berhasil diambil.',
                    data: (response.data as TimelineSpksResponse).data,
                }
            }

            return {
                success: false,
                status: response.status,
                message:
                    response.data?.message ??
                    'Gagal mengambil daftar SPK beraktivitas.',
            }
        })
        .catch((error: { response?: AxiosResponse<CommonErrorResponse> }) => ({
            success: false,
            status: error.response?.status ?? 0,
            message:
                error.response?.data?.message ??
                'Tidak dapat terhubung ke server.',
        }))
}

const getTimeline = async (
    filters: TimelineFilters = {},
): Promise<TimelineApiResult<TimelineData>> => {
    return httpClient
        .get<TimelineResponse | CommonErrorResponse>('/timeline', {
            params: filters,
        })
        .then((response) => {
            if ('status' in response.data && response.data.status) {
                return {
                    success: true,
                    status: response.status,
                    message:
                        (response.data as TimelineResponse).message ??
                        'Timeline berhasil diambil.',
                    data: (response.data as TimelineResponse).data,
                }
            }

            return {
                success: false,
                status: response.status,
                message:
                    response.data?.message ??
                    'Gagal mengambil timeline pekerjaan.',
            }
        })
        .catch((error: { response?: AxiosResponse<CommonErrorResponse> }) => ({
            success: false,
            status: error.response?.status ?? 0,
            message:
                error.response?.data?.message ??
                'Tidak dapat terhubung ke server.',
        }))
}

export const timelineApi = {
    getClients,
    getSpks,
    getTimeline,
}

