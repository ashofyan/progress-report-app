import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import { additionalTaskApi } from '@/features/additional-task/api/additionalTaskApi'

import type {
    AdditionalTask,
    AdditionalTaskApiResult,
    AdditionalTaskFilters,
    CreateAdditionalTaskRequest,
    UpdateAdditionalTaskRequest,
} from '@/features/additional-task/types/additional-task.types'

interface UseAdditionalTasksResult {
    tasks: AdditionalTask[]
    isLoading: boolean
    errorMessage: string | null

    fetchTasks: (
        filters?: AdditionalTaskFilters,
    ) => Promise<void>

    createTask: (
        payload: CreateAdditionalTaskRequest,
    ) => Promise<AdditionalTaskApiResult<AdditionalTask>>

    updateTask: (
        id: number,
        payload: UpdateAdditionalTaskRequest,
    ) => Promise<AdditionalTaskApiResult<AdditionalTask>>

    deleteTask: (
        id: number,
    ) => Promise<AdditionalTaskApiResult<null>>
}

export const useAdditionalTasks =
    (): UseAdditionalTasksResult => {
        const [tasks, setTasks] =
            useState<AdditionalTask[]>([])

        const [isLoading, setIsLoading] =
            useState<boolean>(true)

        const [errorMessage, setErrorMessage] =
            useState<string | null>(null)

        const fetchTasks = useCallback(
            async (
                filters: AdditionalTaskFilters = {},
            ): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result =
                    await additionalTaskApi.getAll(filters)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setTasks(result.data)
                    setIsLoading(false)

                    return
                }

                setTasks([])
                setErrorMessage(result.message)
                setIsLoading(false)
            },
            [],
        )

        useEffect(() => {
            queueMicrotask(() => {
                void fetchTasks()
            })
        }, [fetchTasks])

        const createTask = useCallback(
            async (
                payload: CreateAdditionalTaskRequest,
            ): Promise<AdditionalTaskApiResult<AdditionalTask>> => {
                const result =
                    await additionalTaskApi.create(payload)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setTasks((previous) => [
                        result.data as AdditionalTask,
                        ...previous,
                    ])
                }

                return result
            },
            [],
        )

        const updateTask = useCallback(
            async (
                id: number,
                payload: UpdateAdditionalTaskRequest,
            ): Promise<AdditionalTaskApiResult<AdditionalTask>> => {
                const result =
                    await additionalTaskApi.update(id, payload)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    const updatedTask = result.data

                    setTasks((previous) =>
                        previous.map((task) =>
                            task.id === id
                                ? updatedTask
                                : task,
                        ),
                    )
                }

                return result
            },
            [],
        )

        const deleteTask = useCallback(
            async (
                id: number,
            ): Promise<AdditionalTaskApiResult<null>> => {
                const result =
                    await additionalTaskApi.remove(id)

                if (result.success) {
                    setTasks((previous) =>
                        previous.filter(
                            (task) => task.id !== id,
                        ),
                    )
                }

                return result
            },
            [],
        )

        return {
            tasks,
            isLoading,
            errorMessage,
            fetchTasks,
            createTask,
            updateTask,
            deleteTask,
        }
    }
