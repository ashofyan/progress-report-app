import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import { solusiApi } from '@/features/solusi/api/solusiApi'

import type {
    Solusi,
    SolusiFilters,
} from '@/features/solusi/types/solusi.types'

interface UseSolusisResult {
    solusis: Solusi[]
    isLoading: boolean
    errorMessage: string | null
    fetchSolusis: (
        filters?: SolusiFilters,
    ) => Promise<void>
}

export const useSolusis = (): UseSolusisResult => {
    const [solusis, setSolusis] =
        useState<Solusi[]>([])
    const [isLoading, setIsLoading] =
        useState<boolean>(true)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const fetchSolusis = useCallback(
        async (
            filters: SolusiFilters = {},
        ): Promise<void> => {
            setIsLoading(true)
            setErrorMessage(null)

            const result = await solusiApi.getAll(filters)

            if (
                result.success &&
                result.data !== undefined
            ) {
                setSolusis(result.data)
                setIsLoading(false)
                return
            }

            setSolusis([])
            setErrorMessage(result.message)
            setIsLoading(false)
        },
        [],
    )

    useEffect(() => {
        queueMicrotask(() => {
            void fetchSolusis()
        })
    }, [fetchSolusis])

    return {
        solusis,
        isLoading,
        errorMessage,
        fetchSolusis,
    }
}
