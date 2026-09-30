import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import { karyawanApi } from '@/features/notes/api/karyawanApi'
import type { KaryawanItem } from '@/features/notes/types/karyawan.types'

interface UseKaryawanSearchResult {
    karyawanList: KaryawanItem[]
    isLoading: boolean
    errorMessage: string | null
    refetch: () => Promise<void>
    searchKaryawan: (query: string) => Promise<void>
}

export const useKaryawanSearch = (): UseKaryawanSearchResult => {
    const [allKaryawan, setAllKaryawan] = useState<KaryawanItem[]>([])
    const [filteredList, setFilteredList] = useState<KaryawanItem[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const initData = useCallback(async () => {
        setIsLoading(true)
        setErrorMessage(null)

        try {
            // First load batch 1 with page_limit = 10
            const firstPage = await karyawanApi.search('', 1, 10)
            if (firstPage.success && firstPage.data) {
                setFilteredList(firstPage.data)
                setAllKaryawan(firstPage.data)
            } else {
                setErrorMessage(firstPage.message || 'Gagal memuat daftar karyawan.')
            }

            // In background, fetch full dataset in batches of page_limit=10 to ensure instant client-side autocomplete
            void karyawanApi.fetchAllBatched(10).then((full) => {
                if (full && full.length > 0) {
                    setAllKaryawan(full)
                }
            })
        } catch {
            setErrorMessage('Gagal memuat data karyawan.')
        } finally {
            setIsLoading(false)
        }
    }, [])

    const search = useCallback(
        async (query: string) => {
            const trimmed = query.trim().toLowerCase()
            setIsLoading(true)
            setErrorMessage(null)

            try {
                // Call API with page_limit: 10
                await karyawanApi.search(trimmed, 1, 10)

                // Filter by name (text) or code_employee
                if (trimmed === '') {
                    setFilteredList(allKaryawan.slice(0, 10))
                } else {
                    const matched = allKaryawan.filter(
                        (k) =>
                            k.text.toLowerCase().includes(trimmed) ||
                            k.code_employee.toLowerCase().includes(trimmed) ||
                            (k.asal_pt && k.asal_pt.toLowerCase().includes(trimmed)),
                    )
                    setFilteredList(matched)
                }
            } catch {
                setErrorMessage('Terjadi kesalahan saat mencari karyawan.')
            } finally {
                setIsLoading(false)
            }
        },
        [allKaryawan],
    )

    useEffect(() => {
        queueMicrotask(() => {
            void initData()
        })
    }, [initData])

    return {
        karyawanList: filteredList,
        isLoading,
        errorMessage,
        refetch: initData,
        searchKaryawan: search,
    }
}
