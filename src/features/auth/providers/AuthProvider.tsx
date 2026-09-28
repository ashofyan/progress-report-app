import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'

import { authApi } from '@/features/auth/api/authApi'
import { AuthContext } from '@/features/auth/context/AuthContext'
import { authStorage } from '@/features/auth/services/authStorage'

import type {
    AuthApiResult,
    AuthContextValue,
    Employee,
    LoginRequest,
} from '@/features/auth/types/auth.types'

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider = ({
                                 children,
                             }: AuthProviderProps) => {
    const [employee, setEmployee] =
        useState<Employee | null>(null)

    const [isInitializing, setIsInitializing] =
        useState<boolean>(true)

    const clearAuthentication = useCallback((): void => {
        authStorage.removeToken()
        setEmployee(null)
    }, [])

    const initializeAuthentication =
        useCallback(async (): Promise<void> => {
            const token = authStorage.getToken()

            if (token === null) {
                setIsInitializing(false)
                return
            }

            const result = await authApi.me()

            if (
                result.success &&
                result.data !== undefined
            ) {
                setEmployee(result.data)
                setIsInitializing(false)
                return
            }

            clearAuthentication()
            setIsInitializing(false)
        }, [clearAuthentication])

    useEffect(() => {
        void initializeAuthentication()
    }, [initializeAuthentication])

    const login = useCallback(
        async (
            credentials: LoginRequest,
        ): Promise<AuthApiResult<Employee>> => {
            const result = await authApi.login(credentials)

            if (
                !result.success ||
                result.data === undefined
            ) {
                return {
                    success: false,
                    message: result.message,
                    status: result.status,
                }
            }

            authStorage.setToken(result.data.token)

            setEmployee(result.data.employee)

            return {
                success: true,
                data: result.data.employee,
                message: result.message,
                status: result.status,
            }
        },
        [],
    )

    const logout = useCallback(async (): Promise<void> => {
        const token = authStorage.getToken()

        if (token !== null) {
            await authApi.logout()
        }

        clearAuthentication()
    }, [clearAuthentication])

    const contextValue = useMemo<AuthContextValue>(
        () => ({
            employee,
            isAuthenticated: employee !== null,
            isInitializing,
            login,
            logout,
        }),
        [
            employee,
            isInitializing,
            login,
            logout,
        ],
    )

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}
