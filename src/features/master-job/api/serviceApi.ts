import axios from 'axios'

import { buildServiceSearchUrl } from '@/features/master-job/utils/serviceUrl'

import type {
    ServiceProduct,
} from '@/features/master-job/types/service.types'

export interface ServiceSearchResult {
    success: boolean
    data: ServiceProduct[]
    message: string
}

const search = async (
    asalPt: string,
): Promise<ServiceSearchResult> => {
    const url = buildServiceSearchUrl(asalPt)

    return axios
        .get<ServiceProduct[]>(url, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
        .then((response) => ({
            success: true,
            data: response.data,
            message: '',
        }))
        .catch(() => ({
            success: false,
            data: [],
            message: 'Gagal mengambil data jasa/pekerjaan.',
        }))
}

export const serviceApi = {
    search,
}
