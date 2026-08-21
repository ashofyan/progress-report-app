import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import { masterJobApi } from '@/features/master-job/api/masterJobApi'

import type {
    CreateMasterJobRequest,
    MasterJob,
    MasterJobApiResult,
    UpdateMasterJobRequest,
} from '@/features/master-job/types/master-job.types'

interface UseMasterJobsResult {
    jobs: MasterJob[]
    isLoading: boolean
    errorMessage: string | null

    fetchJobs: () => Promise<void>

    createJob: (
        payload: CreateMasterJobRequest,
    ) => Promise<MasterJobApiResult<MasterJob>>

    updateJob: (
        id: number,
        payload: UpdateMasterJobRequest,
    ) => Promise<MasterJobApiResult<MasterJob>>

    deleteJob: (
        id: number,
    ) => Promise<MasterJobApiResult<null>>
}

export const useMasterJobs =
    (): UseMasterJobsResult => {
        const [jobs, setJobs] =
            useState<MasterJob[]>([])

        const [isLoading, setIsLoading] =
            useState<boolean>(true)

        const [errorMessage, setErrorMessage] =
            useState<string | null>(null)

        const fetchJobs =
            useCallback(async (): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result = await masterJobApi.getAll()

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setJobs(result.data)
                    setIsLoading(false)

                    return
                }

                setJobs([])
                setErrorMessage(result.message)
                setIsLoading(false)
            }, [])

        useEffect(() => {
            void fetchJobs()
        }, [fetchJobs])

        const createJob = useCallback(
            async (
                payload: CreateMasterJobRequest,
            ): Promise<MasterJobApiResult<MasterJob>> => {
                const result =
                    await masterJobApi.create(payload)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    const createdJob = result.data

                    setJobs((previous) => [
                        createdJob,
                        ...previous,
                    ])
                }

                return result
            },
            [],
        )

        const updateJob = useCallback(
            async (
                id: number,
                payload: UpdateMasterJobRequest,
            ): Promise<MasterJobApiResult<MasterJob>> => {
                const result =
                    await masterJobApi.update(id, payload)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    const updatedJob = result.data

                    setJobs((previous) =>
                        previous.map((job) =>
                            job.id === id
                                ? updatedJob
                                : job,
                        ),
                    )
                }

                return result
            },
            [],
        )

        const deleteJob = useCallback(
            async (
                id: number,
            ): Promise<MasterJobApiResult<null>> => {
                const result =
                    await masterJobApi.remove(id)

                if (result.success) {
                    setJobs((previous) =>
                        previous.filter(
                            (job) => job.id !== id,
                        ),
                    )
                }

                return result
            },
            [],
        )

        return {
            jobs,
            isLoading,
            errorMessage,
            fetchJobs,
            createJob,
            updateJob,
            deleteJob,
        }
    }
