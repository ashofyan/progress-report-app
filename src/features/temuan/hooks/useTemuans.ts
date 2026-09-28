import {
    useCallback,
    useEffect,
    useState,
} from 'react'

import { temuanApi } from '@/features/temuan/api/temuanApi'

import type {
    Temuan,
    TemuanApiResult,
    TemuanFile,
    TemuanFilters,
} from '@/features/temuan/types/temuan.types'

interface UseTemuansResult {
    temuans: Temuan[]
    isLoading: boolean
    errorMessage: string | null
    fetchTemuans: (
        filters?: TemuanFilters,
    ) => Promise<void>
    deleteTemuan: (
        id: number,
    ) => Promise<TemuanApiResult<null>>
    uploadTemuanFiles: (
        temuanId: number,
        files: File[],
    ) => Promise<TemuanApiResult<TemuanFile[]>>
    deleteTemuanFile: (
        temuanId: number,
        fileId: number,
    ) => Promise<TemuanApiResult<null>>
}

export const useTemuans = (): UseTemuansResult => {
    const [temuans, setTemuans] =
        useState<Temuan[]>([])
    const [isLoading, setIsLoading] =
        useState<boolean>(true)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const fetchTemuans = useCallback(
        async (
            filters: TemuanFilters = {},
        ): Promise<void> => {
            setIsLoading(true)
            setErrorMessage(null)

            const result = await temuanApi.getAll(filters)

            if (
                result.success &&
                result.data !== undefined
            ) {
                setTemuans(result.data)
                setIsLoading(false)
                return
            }

            setTemuans([])
            setErrorMessage(result.message)
            setIsLoading(false)
        },
        [],
    )

    useEffect(() => {
        queueMicrotask(() => {
            void fetchTemuans()
        })
    }, [fetchTemuans])

    const deleteTemuan = useCallback(
        async (
            id: number,
        ): Promise<TemuanApiResult<null>> => {
            const result = await temuanApi.remove(id)

            if (result.success) {
                setTemuans((previous) =>
                    previous.filter(
                        (temuan) => temuan.id !== id,
                    ),
                )
            }

            return result
        },
        [],
    )

    const uploadTemuanFiles = useCallback(
        async (
            temuanId: number,
            files: File[],
        ): Promise<TemuanApiResult<TemuanFile[]>> => {
            const result =
                await temuanApi.uploadFiles(temuanId, files)

            if (
                result.success &&
                result.data !== undefined
            ) {
                const uploadedFiles = result.data

                setTemuans((previous) =>
                    previous.map((temuan) =>
                        temuan.id !== temuanId
                            ? temuan
                            : {
                                ...temuan,
                                files: [
                                    ...temuan.files,
                                    ...uploadedFiles,
                                ],
                            },
                    ),
                )
            }

            return result
        },
        [],
    )

    const deleteTemuanFile = useCallback(
        async (
            temuanId: number,
            fileId: number,
        ): Promise<TemuanApiResult<null>> => {
            const result =
                await temuanApi.deleteFile(temuanId, fileId)

            if (result.success) {
                setTemuans((previous) =>
                    previous.map((temuan) =>
                        temuan.id !== temuanId
                            ? temuan
                            : {
                                ...temuan,
                                files: temuan.files.filter(
                                    (file) =>
                                        file.id !== fileId,
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
        temuans,
        isLoading,
        errorMessage,
        fetchTemuans,
        deleteTemuan,
        uploadTemuanFiles,
        deleteTemuanFile,
    }
}
