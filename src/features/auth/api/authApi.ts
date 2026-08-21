import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'

import type {
    ApiErrorResponse,
    AuthApiResult,
    Employee,
    LoginRequest,
    LoginSuccessResponse,
    LogoutSuccessResponse,
    MeSuccessResponse,
} from '@/features/auth/types/auth.types'

const login = async (
    credentials: LoginRequest,
): Promise<AuthApiResult<LoginSuccessResponse['data']>> => {
    return httpClient
        .post<
            LoginSuccessResponse | ApiErrorResponse
        >('/auth/login', credentials)
        .then(
            (
                response: AxiosResponse<
                    LoginSuccessResponse | ApiErrorResponse
                >,
            ) => {
                if (response.data.success) {
                    return {
                        success: true,
                        data: response.data.data,
                        message: response.data.message,
                        status: response.status,
                    }
                }

                return {
                    success: false,
                    message: response.data.message,
                    status: response.status,
                }
            },
        )
        .catch(() => ({
            success: false,
            message: 'Tidak dapat terhubung ke server.',
            status: 0,
        }))
}

const me = async (): Promise<AuthApiResult<Employee>> => {
    return httpClient
        .get<
            MeSuccessResponse | ApiErrorResponse
        >('/auth/me')
        .then(
            (
                response: AxiosResponse<
                    MeSuccessResponse | ApiErrorResponse
                >,
            ) => {
                if (response.data.success) {
                    return {
                        success: true,
                        data: response.data.data,
                        message: response.data.message,
                        status: response.status,
                    }
                }

                return {
                    success: false,
                    message: response.data.message,
                    status: response.status,
                }
            },
        )
        .catch(() => ({
            success: false,
            message: 'Tidak dapat terhubung ke server.',
            status: 0,
        }))
}

const logout = async (): Promise<
    AuthApiResult<LogoutSuccessResponse>
> => {
    return httpClient
        .post<
            LogoutSuccessResponse | ApiErrorResponse
        >('/auth/logout')
        .then(
            (
                response: AxiosResponse<
                    LogoutSuccessResponse | ApiErrorResponse
                >,
            ) => {
                if (response.data.success) {
                    return {
                        success: true,
                        data: response.data,
                        message: response.data.message,
                        status: response.status,
                    }
                }

                return {
                    success: false,
                    message: response.data.message,
                    status: response.status,
                }
            },
        )
        .catch(() => ({
            success: false,
            message: 'Tidak dapat terhubung ke server.',
            status: 0,
        }))
}

export const authApi = {
    login,
    me,
    logout,
}
