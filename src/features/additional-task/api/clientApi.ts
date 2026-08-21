import axios from 'axios'

import type {
    MarketingClient,
} from '@/features/additional-task/types/client.types'

export interface ClientSearchResult {
    success: boolean
    data: MarketingClient[]
    message: string
}

const CLIENT_SEARCH_URL =
    'https://marketingbackend.als.today/public/api/client/search-by'

const normalizeClients = (
    responseData: MarketingClient | MarketingClient[],
): MarketingClient[] => {
    if (Array.isArray(responseData)) {
        return responseData
    }

    return [responseData]
}

const search = async (
    query = '',
): Promise<ClientSearchResult> => {
    return axios
        .get<MarketingClient | MarketingClient[]>(
            CLIENT_SEARCH_URL,
            {
                params: {
                    search: query,
                },
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            },
        )
        .then((response) => ({
            success: true,
            data: normalizeClients(response.data),
            message: '',
        }))
        .catch(() => ({
            success: false,
            data: [],
            message: 'Gagal mengambil data client.',
        }))
}

export const clientApi = {
    search,
}
