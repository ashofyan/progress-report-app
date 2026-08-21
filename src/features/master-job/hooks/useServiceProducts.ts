import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import { serviceApi } from '@/features/master-job/api/serviceApi'

import type {
    ServiceProduct,
} from '@/features/master-job/types/service.types'

interface UseServiceProductsResult {
    services: ServiceProduct[]
    isLoading: boolean
    errorMessage: string | null
    refetch: () => Promise<void>
}

export const useServiceProducts = (
    asalPt: string | null,
): UseServiceProductsResult => {
    const [services, setServices] =
        useState<ServiceProduct[]>([])

    const [isLoading, setIsLoading] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const fetchServices =
        useCallback(async (): Promise<void> => {
            if (
                asalPt === null ||
                asalPt.trim() === ''
            ) {
                setServices([])
                setErrorMessage(
                    'Asal PT user tidak tersedia.',
                )

                return
            }

            setIsLoading(true)
            setErrorMessage(null)

            const result =
                await serviceApi.search(asalPt)

            if (!result.success) {
                setServices([])
                setErrorMessage(result.message)
                setIsLoading(false)

                return
            }

            setServices(result.data)
            setIsLoading(false)
        }, [asalPt])

    useEffect(() => {
        void fetchServices()
    }, [fetchServices])

    return {
        services,
        isLoading,
        errorMessage,
        refetch: fetchServices,
    }
}
