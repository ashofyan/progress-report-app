import httpClient from '@/shared/services/httpClient'
import type {
    DashboardAnnouncementFilters,
    DashboardAnnouncementItem,
    DashboardAnnouncementResponse,
    DashboardData,
    DashboardFilters,
    DashboardResponse,
} from '@/features/dashboard/types/dashboard.types'

export const dashboardApi = {
    getSummary: async (
        filters: DashboardFilters = {},
    ): Promise<DashboardData | null> => {
        try {
            // Priority endpoint is /dashboard/summary as documented
            const response = await httpClient.get<DashboardResponse>(
                '/dashboard/summary',
                {
                    params: filters,
                },
            )

            if (response.data && response.data.status && response.data.data) {
                return response.data.data
            }

            // Fallback to /dashboard/spk-summary if status 404
            if (response.status === 404) {
                const fallbackRes = await httpClient.get<DashboardResponse>(
                    '/dashboard/spk-summary',
                    {
                        params: filters,
                    },
                )
                if (fallbackRes.data && fallbackRes.data.status && fallbackRes.data.data) {
                    return fallbackRes.data.data
                }
            }

            return null
        } catch (error) {
            console.error('Failed to fetch dashboard summary', error)
            return null
        }
    },
    // Alias for backward compatibility
    getSpkSummary: async (
        filters: DashboardFilters = {},
    ): Promise<DashboardData | null> => {
        return dashboardApi.getSummary(filters)
    },
    getAnnouncements: async (
        filters: DashboardAnnouncementFilters = {},
    ): Promise<DashboardAnnouncementItem[]> => {
        try {
            const response = await httpClient.get<DashboardAnnouncementResponse>(
                '/dashboard/announcements',
                {
                    params: filters,
                },
            )
            if (response.data && response.data.status && Array.isArray(response.data.data)) {
                return response.data.data
            }
            return []
        } catch (error) {
            console.error('Failed to fetch dashboard announcements', error)
            return []
        }
    },
}
