import axios, {
    type AxiosInstance,
    type InternalAxiosRequestConfig,
} from 'axios'

import { authStorage } from '@/features/auth/services/authStorage'

const resolveBaseUrl = (): string => {
    const customUrl = import.meta.env.VITE_NOTES_API_BASE_URL
    if (customUrl && customUrl.trim() !== '') {
        return customUrl.trim()
    }
    const defaultUrl = import.meta.env.VITE_API_BASE_URL
    if (defaultUrl && defaultUrl.trim() !== '') {
        return defaultUrl.trim()
    }
    return '/api'
}

const notesHttpClient: AxiosInstance = axios.create({
    baseURL: resolveBaseUrl(),
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
    validateStatus: (status: number): boolean => {
        return status >= 200 && status < 600
    },
})

notesHttpClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        const token = authStorage.getToken()

        if (token !== null) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
)

notesHttpClient.interceptors.response.use(
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

export default notesHttpClient
