import {
    useMemo,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import DailyProgressDeleteModal from '@/features/daily-progress/components/DailyProgressDeleteModal'
import DailyProgressDetailModal from '@/features/daily-progress/components/DailyProgressDetailModal'
import DailyProgressTable from '@/features/daily-progress/components/DailyProgressTable'
import { useDailyProgresses } from '@/features/daily-progress/hooks/useDailyProgresses'

import type {
    DailyProgress,
} from '@/features/daily-progress/types/daily-progress.types'

const ITEMS_PER_PAGE = 10

const DailyProgressBoard = () => {
    const navigate = useNavigate()

    const {
        progresses,
        isLoading,
        errorMessage,
        fetchProgresses,
        deleteProgress,
    } = useDailyProgresses()

    const [searchQuery, setSearchQuery] =
        useState<string>('')

    const [currentPage, setCurrentPage] =
        useState<number>(1)

    const [progressToDelete, setProgressToDelete] =
        useState<Parameters<typeof deleteProgress>[0] | null>(null)

    const [progressToView, setProgressToView] =
        useState<DailyProgress | null>(null)

    const filteredProgresses = useMemo(() => {
        const query =
            searchQuery.trim().toLowerCase()

        if (query === '') {
            return progresses
        }

        return progresses.filter((progress) => {
            return (
                progress.nomor
                    .toLowerCase()
                    .includes(query) ||
                progress.client_code
                    .toLowerCase()
                    .includes(query) ||
                (progress.no_spk ?? '')
                    .toLowerCase()
                    .includes(query) ||
                progress.tanggal.includes(query)
            )
        })
    }, [progresses, searchQuery])

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredProgresses.length /
            ITEMS_PER_PAGE,
        ),
    )

    const paginatedProgresses = useMemo(() => {
        const start =
            (currentPage - 1) *
            ITEMS_PER_PAGE

        const end =
            start + ITEMS_PER_PAGE

        return filteredProgresses.slice(
            start,
            end,
        )
    }, [
        filteredProgresses,
        currentPage,
    ])

    const handleSearchChange = (
        value: string,
    ): void => {
        setSearchQuery(value)
        setCurrentPage(1)
    }

    return (
        <>
            <div className="daily-progress-layout">
                <section className="daily-progress-board">
                    <div className="daily-progress-board-header">
                        <div className="daily-progress-search">
                            <i className="bi bi-search" />

                            <input
                                type="text"
                                value={searchQuery}
                                placeholder="Cari daily progress..."
                                onChange={(event) =>
                                    handleSearchChange(
                                        event.target.value,
                                    )
                                }
                            />
                        </div>

                        <div className="daily-progress-header-actions">
                            <button
                                type="button"
                                className="daily-progress-add-button"
                                onClick={() =>
                                    navigate(
                                        '/daily-progress/tambah',
                                    )
                                }
                            >
                                <i className="bi bi-plus-lg" />
                                <span>Tambah</span>
                            </button>
                        </div>
                    </div>

                    <div className="daily-progress-board-content">
                        {isLoading && (
                            <div className="daily-progress-loading">
                                <div
                                    className="spinner-border"
                                    role="status"
                                />
                                <span>Memuat data...</span>
                            </div>
                        )}

                        {!isLoading &&
                            errorMessage !== null && (
                                <div className="daily-progress-error">
                                    <div
                                        className="alert alert-danger"
                                        role="alert"
                                    >
                                        {errorMessage}
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() =>
                                            void fetchProgresses()
                                        }
                                    >
                                        Coba Lagi
                                    </button>
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null && (
                                <DailyProgressTable
                                    progresses={
                                        paginatedProgresses
                                    }
                                    onView={setProgressToView}
                                    onEdit={(progress) =>
                                        navigate(
                                            `/daily-progress/${progress.id}/edit`,
                                        )
                                    }
                                    onEditForm={(progress) =>
                                        navigate(
                                            `/daily-progress/${progress.id}/edit-form`,
                                        )
                                    }
                                    onDelete={
                                        (progress) =>
                                            setProgressToDelete(
                                                progress.id,
                                            )
                                    }
                                />
                            )}
                    </div>

                    {!isLoading &&
                        errorMessage === null &&
                        filteredProgresses.length > 0 && (
                            <div className="daily-progress-pagination">
                                <button
                                    type="button"
                                    className="pagination-arrow"
                                    disabled={
                                        currentPage === 1
                                    }
                                    onClick={() =>
                                        setCurrentPage(
                                            (previous) =>
                                                Math.max(
                                                    1,
                                                    previous - 1,
                                                ),
                                        )
                                    }
                                >
                                    <i className="bi bi-caret-left-fill" />
                                </button>

                                <span className="daily-progress-page-info">
                                    {currentPage} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    className="pagination-arrow"
                                    disabled={
                                        currentPage ===
                                        totalPages
                                    }
                                    onClick={() =>
                                        setCurrentPage(
                                            (previous) =>
                                                Math.min(
                                                    totalPages,
                                                    previous + 1,
                                                ),
                                        )
                                    }
                                >
                                    <i className="bi bi-caret-right-fill" />
                                </button>
                            </div>
                        )}
                </section>
            </div>

            <DailyProgressDeleteModal
                progress={
                    progresses.find(
                        (progress) =>
                            progress.id === progressToDelete,
                    ) ?? null
                }
                onClose={() => setProgressToDelete(null)}
                onDelete={deleteProgress}
            />

            <DailyProgressDetailModal
                progress={progressToView}
                onClose={() => setProgressToView(null)}
                onEditForm={(progress) =>
                    navigate(
                        `/daily-progress/${progress.id}/edit-form`,
                    )
                }
            />

        </>
    )
}

export default DailyProgressBoard
