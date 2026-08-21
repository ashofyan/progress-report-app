import { STORAGE_KEYS } from '@/shared/constants/storage.constants'

const getToken = (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
}

const setToken = (token: string): void => {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
}

const removeToken = (): void => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
}

export const authStorage = {
    getToken,
    setToken,
    removeToken,
}
