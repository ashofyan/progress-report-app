import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import { clientApi } from '@/features/additional-task/api/clientApi'

import type {
    MarketingClient,
} from '@/features/additional-task/types/client.types'

interface UseMarketingClientsResult {
    clients: MarketingClient[]
    isLoading: boolean
    errorMessage: string | null
    refetch: () => Promise<void>
    searchClients: (
        query: string,
    ) => Promise<void>
}

export const useMarketingClients =
    (): UseMarketingClientsResult => {
        const [clients, setClients] =
            useState<MarketingClient[]>([])

        const [isLoading, setIsLoading] =
            useState<boolean>(false)

        const [errorMessage, setErrorMessage] =
            useState<string | null>(null)

        const fetchClients =
            useCallback(async (
                query = '',
            ): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result =
                    await clientApi.search(query)

                if (!result.success) {
                    setClients([])
                    setErrorMessage(result.message)
                    setIsLoading(false)

                    return
                }

                setClients(result.data)
                setIsLoading(false)
            }, [])

        useEffect(() => {
            queueMicrotask(() => {
                void fetchClients()
            })
        }, [fetchClients])

        return {
            clients,
            isLoading,
            errorMessage,
            refetch: fetchClients,
            searchClients: fetchClients,
        }
    }
