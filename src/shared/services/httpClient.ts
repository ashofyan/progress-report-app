import axios, {
    type AxiosInstance,
    type InternalAxiosRequestConfig,
} from 'axios'

import { authStorage } from '@/features/auth/services/authStorage'

const httpClient: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },

    validateStatus: (status: number): boolean => {
        return status >= 200 && status < 600
    },
})

httpClient.interceptors.request.use(
    (
        config: InternalAxiosRequestConfig,
    ): InternalAxiosRequestConfig => {
        const token = authStorage.getToken()

        if (token !== null) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
)

httpClient.interceptors.response.use(
    (response) => {
        if (response.status === 401) {
            authStorage.removeToken()
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login'
            }
        }
        return response
    },
    (error) => {
        if (error.response?.status === 401) {
            authStorage.removeToken()
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    },
)

export default httpClient
