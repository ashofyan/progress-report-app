import axios from 'axios'

import type {
    KaryawanItem,
    KaryawanSearchResponse,
} from '@/features/notes/types/karyawan.types'

const KARYAWAN_SEARCH_URL =
    import.meta.env.VITE_KARYAWAN_SEARCH_URL ||
    'https://als.icso.biz.id/public/api/karyawan/search'

export interface KaryawanSearchResult {
    success: boolean
    data: KaryawanItem[]
    total: number
    message?: string
}

let cachedAllKaryawan: KaryawanItem[] | null = null

export const karyawanApi = {
    search: async (
        query = '',
        page = 1,
        pageLimit = 10,
    ): Promise<KaryawanSearchResult> => {
        try {
            const response = await axios.post<KaryawanSearchResponse>(
                KARYAWAN_SEARCH_URL,
                {
                    page_limit: pageLimit,
                    page,
                    searchTerm: query,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                },
            )

            const items = response.data.items || []
            const total = response.data.total || 0

            return {
                success: true,
                data: items,
                total,
            }
        } catch (error) {
            console.error('Gagal mengambil data karyawan:', error)
            return {
                success: false,
                data: [],
                total: 0,
                message: 'Gagal mengambil data karyawan.',
            }
        }
    },

    /**
     * Fetch all karyawan in batches of page_limit=10 to allow comprehensive client search if server does not filter.
     */
    fetchAllBatched: async (
        pageLimit = 10,
    ): Promise<KaryawanItem[]> => {
        if (cachedAllKaryawan && cachedAllKaryawan.length > 0) {
            return cachedAllKaryawan
        }

        try {
            const firstPage = await karyawanApi.search('', 1, pageLimit)
            if (!firstPage.success) return []

            const all: KaryawanItem[] = [...firstPage.data]
            const total = firstPage.total

            if (total > all.length) {
                const totalPages = Math.ceil(total / pageLimit)
                const promises = []
                for (let p = 2; p <= totalPages; p++) {
                    promises.push(karyawanApi.search('', p, pageLimit))
                }
                const results = await Promise.all(promises)
                for (const res of results) {
                    if (res.success && res.data) {
                        all.push(...res.data)
                    }
                }
            }

            // Deduplicate by code_employee
            const uniqueMap = new Map<string, KaryawanItem>()
            for (const item of all) {
                if (item.code_employee && !uniqueMap.has(item.code_employee)) {
                    uniqueMap.set(item.code_employee, item)
                }
            }

            cachedAllKaryawan = Array.from(uniqueMap.values())
            return cachedAllKaryawan
        } catch {
            return cachedAllKaryawan || []
        }
    },
}
