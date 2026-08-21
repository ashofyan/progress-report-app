import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'

import type {
    DailyProgress,
    DailyProgressApiResult,
    DailyProgressDocument,
    DailyProgressFilters,
    UpdateDailyProgressRequest,
} from '@/features/daily-progress/types/daily-progress.types'

interface UseDailyProgressesResult {
    progresses: DailyProgress[]
    isLoading: boolean
    errorMessage: string | null
    fetchProgresses: (
        filters?: DailyProgressFilters,
    ) => Promise<void>
    updateProgress: (
        id: number,
        payload: UpdateDailyProgressRequest,
    ) => Promise<DailyProgressApiResult<DailyProgress>>
    deleteProgress: (
        id: number,
    ) => Promise<DailyProgressApiResult<null>>
    deleteProgressDetail: (
        dailyProgressId: number,
        detailId: number,
    ) => Promise<DailyProgressApiResult<DailyProgress>>
    uploadProgressDocuments: (
        dailyProgressId: number,
        detailId: number,
        files: File[],
    ) => Promise<
        DailyProgressApiResult<DailyProgressDocument[]>
    >
    deleteProgressDocument: (
        dailyProgressId: number,
        detailId: number,
        documentId: number,
    ) => Promise<DailyProgressApiResult<null>>
}

export const useDailyProgresses =
    (): UseDailyProgressesResult => {
        const [progresses, setProgresses] =
            useState<DailyProgress[]>([])

        const [isLoading, setIsLoading] =
            useState<boolean>(true)

        const [errorMessage, setErrorMessage] =
            useState<string | null>(null)

        const fetchProgresses = useCallback(
            async (
                filters: DailyProgressFilters = {},
            ): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result =
                    await dailyProgressApi.getAll(filters)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setProgresses(result.data)
                    setIsLoading(false)

                    return
                }

                setProgresses([])
                setErrorMessage(result.message)
                setIsLoading(false)
            },
            [],
        )

        useEffect(() => {
            queueMicrotask(() => {
                void fetchProgresses()
            })
        }, [fetchProgresses])

        const updateProgress = useCallback(
            async (
                id: number,
                payload: UpdateDailyProgressRequest,
            ): Promise<DailyProgressApiResult<DailyProgress>> => {
                const result =
                    await dailyProgressApi.update(id, payload)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    const updated = result.data

                    setProgresses((previous) =>
                        previous.map((progress) =>
                            progress.id === id
                                ? updated
                                : progress,
                        ),
                    )
                }

                return result
            },
            [],
        )

        const deleteProgress = useCallback(
            async (
                id: number,
            ): Promise<DailyProgressApiResult<null>> => {
                const result =
                    await dailyProgressApi.remove(id)

                if (result.success) {
                    setProgresses((previous) =>
                        previous.filter(
                            (progress) =>
                                progress.id !== id,
                        ),
                    )
                }

                return result
            },
            [],
        )

        const deleteProgressDetail = useCallback(
            async (
                dailyProgressId: number,
                detailId: number,
            ): Promise<DailyProgressApiResult<DailyProgress>> => {
                const result =
                    await dailyProgressApi.deleteDetail(
                        dailyProgressId,
                        detailId,
                    )

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    const updated = result.data

                    setProgresses((previous) =>
                        previous.map((progress) =>
                            progress.id === dailyProgressId
                                ? updated
                                : progress,
                        ),
                    )
                }

                return result
            },
            [],
        )

        const uploadProgressDocuments = useCallback(
            async (
                dailyProgressId: number,
                detailId: number,
                files: File[],
            ): Promise<
                DailyProgressApiResult<DailyProgressDocument[]>
            > => {
                const result =
                    await dailyProgressApi.uploadDocuments(
                        dailyProgressId,
                        detailId,
                        files,
                    )

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    const documents = result.data

                    setProgresses((previous) =>
                        previous.map((progress) =>
                            progress.id !== dailyProgressId
                                ? progress
                                : {
                                    ...progress,
                                    details:
                                        progress.details.map(
                                            (detail) =>
                                                detail.id ===
                                                detailId
                                                    ? {
                                                        ...detail,
                                                        documents: [
                                                            ...(detail.documents ??
                                                                []),
                                                            ...documents,
                                                        ],
                                                    }
                                                    : detail,
                                        ),
                                },
                        ),
                    )
                }

                return result
            },
            [],
        )

        const deleteProgressDocument = useCallback(
            async (
                dailyProgressId: number,
                detailId: number,
                documentId: number,
            ): Promise<DailyProgressApiResult<null>> => {
                const result =
                    await dailyProgressApi.deleteDocument(
                        dailyProgressId,
                        detailId,
                        documentId,
                    )

                if (result.success) {
                    setProgresses((previous) =>
                        previous.map((progress) =>
                            progress.id !== dailyProgressId
                                ? progress
                                : {
                                    ...progress,
                                    details:
                                        progress.details.map(
                                            (detail) =>
                                                detail.id ===
                                                detailId
                                                    ? {
                                                        ...detail,
                                                        documents:
                                                            (
                                                                detail.documents ??
                                                                []
                                                            ).filter(
                                                                (
                                                                    document,
                                                                ) =>
                                                                    document.id !==
                                                                    documentId,
                                                            ),
                                                    }
                                                    : detail,
                                        ),
                                },
                        ),
                    )
                }

                return result
            },
            [],
        )

        return {
            progresses,
            isLoading,
            errorMessage,
            fetchProgresses,
            updateProgress,
            deleteProgress,
            deleteProgressDetail,
            uploadProgressDocuments,
            deleteProgressDocument,
        }
    }
