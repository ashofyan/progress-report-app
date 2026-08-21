import type { AxiosResponse } from 'axios'

import httpClient from '@/shared/services/httpClient'

import type {
    AdditionalTask,
    AdditionalTaskApiResult,
    AdditionalTaskDeleteResponse,
    AdditionalTaskDetailResponse,
    AdditionalTaskErrorResponse,
    AdditionalTaskFilters,
    AdditionalTaskListResponse,
    AdditionalTaskMutationResponse,
    CreateAdditionalTaskRequest,
    LaravelValidationErrorResponse,
    UpdateAdditionalTaskRequest,
} from '@/features/additional-task/types/additional-task.types'

type TaskError =
    | AdditionalTaskErrorResponse
    | LaravelValidationErrorResponse

const getErrorResult = (
    response: AxiosResponse<TaskError>,
): AdditionalTaskApiResult<never> => {
    const responseData = response.data

    if ('errors' in responseData) {
        return {
            success: false,
            status: response.status,
            message: responseData.message,
            errors: responseData.errors,
        }
    }

    return {
        success: false,
        status: response.status,
        message: responseData.message,
    }
}

const getAll = async (
    filters: AdditionalTaskFilters = {},
): Promise<AdditionalTaskApiResult<AdditionalTask[]>> => {
    return httpClient
        .get<AdditionalTaskListResponse | TaskError>(
            '/additional-tasks',
            {
                params: filters,
            },
        )
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<TaskError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const getById = async (
    id: number,
): Promise<AdditionalTaskApiResult<AdditionalTask>> => {
    return httpClient
        .get<AdditionalTaskDetailResponse | TaskError>(
            `/additional-tasks/${id}`,
        )
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<TaskError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const create = async (
    payload: CreateAdditionalTaskRequest,
): Promise<AdditionalTaskApiResult<AdditionalTask>> => {
    return httpClient
        .post<AdditionalTaskMutationResponse | TaskError>(
            '/additional-tasks',
            payload,
        )
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<TaskError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const update = async (
    id: number,
    payload: UpdateAdditionalTaskRequest,
): Promise<AdditionalTaskApiResult<AdditionalTask>> => {
    return httpClient
        .put<AdditionalTaskMutationResponse | TaskError>(
            `/additional-tasks/${id}`,
            payload,
        )
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: response.data.data,
                }
            }

            return getErrorResult(
                response as AxiosResponse<TaskError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

const remove = async (
    id: number,
): Promise<AdditionalTaskApiResult<null>> => {
    return httpClient
        .delete<AdditionalTaskDeleteResponse | TaskError>(
            `/additional-tasks/${id}`,
        )
        .then((response) => {
            if (
                'success' in response.data &&
                response.data.success
            ) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message,
                    data: null,
                }
            }

            return getErrorResult(
                response as AxiosResponse<TaskError>,
            )
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server.',
        }))
}

export const additionalTaskApi = {
    getAll,
    getById,
    create,
    update,
    remove,
}
