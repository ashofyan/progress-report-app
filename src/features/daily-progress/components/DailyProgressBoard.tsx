import {
    useMemo,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import DailyProgressDeleteModal from '@/features/daily-progress/components/DailyProgressDeleteModal'
import DailyProgressDetailModal from '@/features/daily-progress/components/DailyProgressDetailModal'
import DailyProgressTable from '@/features/daily-progress/components/DailyProgressTable'
import { useDailyProgresses } from '@/features/daily-progress/hooks/useDailyProgresses'
import { getPeriodeLabel } from '@/features/daily-progress/utils/dailyProgressPeriod'

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
        useState<DailyProgress | null>(null)

    const [progressToView, setProgressToView] =
        useState<DailyProgress | null>(null)

    // Summary Statistics
    const stats = useMemo(() => {
        const total = progresses.length
        const uniqueClients = new Set(
            progresses.map((p) => p.client_code).filter(Boolean),
        ).size
        const uniqueSpk = new Set(
            progresses.map((p) => p.no_spk).filter(Boolean),
        ).size
        const totalTasks = progresses.reduce(
            (acc, p) => acc + (p.details?.length ?? 0),
            0,
        )

        return {
            total,
            uniqueClients,
            uniqueSpk,
            totalTasks,
        }
    }, [progresses])

    const filteredProgresses = useMemo(() => {
        const query =
            searchQuery.trim().toLowerCase()

        if (query === '') {
            return progresses
        }

        return progresses.filter((progress) => {
            const periode = getPeriodeLabel(
                progress.bulan,
                progress.tahun,
                progress.tanggal,
            ).toLowerCase()

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
                progress.tanggal.includes(query) ||
                periode.includes(query)
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

    const handleClearSearch = (): void => {
        setSearchQuery('')
        setCurrentPage(1)
    }

    const startItem =
        filteredProgresses.length === 0
            ? 0
            : (currentPage - 1) * ITEMS_PER_PAGE + 1
    const endItem = Math.min(
        currentPage * ITEMS_PER_PAGE,
        filteredProgresses.length,
    )

    return (
        <>
            <div className="daily-progress-layout">
                {/* Stats Metric Strip */}
                <div className="daily-progress-stats-grid">
                    <div className="daily-progress-stat-card primary">
                        <div className="daily-progress-stat-icon">
                            <i className="bi bi-journal-text" />
                        </div>
                        <div className="daily-progress-stat-content">
                            <span className="daily-progress-stat-label">
                                Total Laporan
                            </span>
                            <strong className="daily-progress-stat-value">
                                {stats.total}
                            </strong>
                        </div>
                    </div>

                    <div className="daily-progress-stat-card purple">
                        <div className="daily-progress-stat-icon">
                            <i className="bi bi-buildings" />
                        </div>
                        <div className="daily-progress-stat-content">
                            <span className="daily-progress-stat-label">
                                Klien Aktif
                            </span>
                            <strong className="daily-progress-stat-value">
                                {stats.uniqueClients}
                            </strong>
                        </div>
                    </div>

                    <div className="daily-progress-stat-card blue">
                        <div className="daily-progress-stat-icon">
                            <i className="bi bi-file-earmark-text" />
                        </div>
                        <div className="daily-progress-stat-content">
                            <span className="daily-progress-stat-label">
                                SPK Terkait
                            </span>
                            <strong className="daily-progress-stat-value">
                                {stats.uniqueSpk}
                            </strong>
                        </div>
                    </div>

                    <div className="daily-progress-stat-card emerald">
                        <div className="daily-progress-stat-icon">
                            <i className="bi bi-check2-all" />
                        </div>
                        <div className="daily-progress-stat-content">
                            <span className="daily-progress-stat-label">
                                Total Pekerjaan
                            </span>
                            <strong className="daily-progress-stat-value">
                                {stats.totalTasks}
                            </strong>
                        </div>
                    </div>
                </div>

                <section className="daily-progress-board">
                    <div className="daily-progress-board-header">
                        <div className="daily-progress-header-left">
                            <div className="daily-progress-search">
                                <i className="bi bi-search" />

                                <input
                                    type="text"
                                    value={searchQuery}
                                    placeholder="Cari nomor, client, SPK, tanggal..."
                                    onChange={(event) =>
                                        handleSearchChange(
                                            event.target.value,
                                        )
                                    }
                                />

                                {searchQuery.trim() !== '' && (
                                    <button
                                        type="button"
                                        className="daily-progress-search-clear"
                                        onClick={handleClearSearch}
                                        title="Hapus pencarian"
                                    >
                                        <i className="bi bi-x-circle-fill" />
                                    </button>
                                )}
                            </div>

                            {searchQuery.trim() !== '' && (
                                <span className="daily-progress-search-count">
                                    {filteredProgresses.length} ditemukan
                                </span>
                            )}
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
                                <span>Tambah Daily Progress</span>
                            </button>
                        </div>
                    </div>

                    <div className="daily-progress-board-content">
                        {isLoading && (
                            <div className="daily-progress-loading">
                                <div
                                    className="spinner-border text-primary"
                                    role="status"
                                />
                                <span>Memuat data daily progress...</span>
                            </div>
                        )}

                        {!isLoading &&
                            errorMessage !== null && (
                                <div className="daily-progress-error">
                                    <div
                                        className="alert alert-danger"
                                        role="alert"
                                    >
                                        <i className="bi bi-exclamation-triangle-fill me-2" />
                                        {errorMessage}
                                    </div>
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null && (
                                <DailyProgressTable
                                    progresses={
                                        paginatedProgresses
                                    }
                                    onView={
                                        setProgressToView
                                    }
                                    onEdit={(
                                        progress,
                                    ) =>
                                        navigate(
                                            `/daily-progress/${progress.id}/edit`,
                                        )
                                    }
                                    onEditForm={(
                                        progress,
                                    ) =>
                                        navigate(
                                            `/daily-progress/${progress.id}/edit-form`,
                                        )
                                    }
                                    onDelete={
                                        setProgressToDelete
                                    }
                                />
                            )}
                    </div>

                    {!isLoading &&
                        errorMessage === null &&
                        filteredProgresses.length > 0 && (
                            <div className="daily-progress-pagination">
                                <span className="daily-progress-pagination-info">
                                    Menampilkan <strong>{startItem}</strong> -{' '}
                                    <strong>{endItem}</strong> dari{' '}
                                    <strong>{filteredProgresses.length}</strong> data
                                </span>

                                {totalPages > 1 && (
                                    <div className="daily-progress-pagination-controls">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            disabled={
                                                currentPage === 1
                                            }
                                            onClick={() =>
                                                setCurrentPage(
                                                    (prev) =>
                                                        Math.max(
                                                            1,
                                                            prev -
                                                                1,
                                                        ),
                                                )
                                            }
                                        >
                                            <i className="bi bi-chevron-left" />
                                            <span>Sebelumnya</span>
                                        </button>

                                        <span className="daily-progress-page-info">
                                            Halaman {currentPage} dari {totalPages}
                                        </span>

                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            disabled={
                                                currentPage ===
                                                totalPages
                                            }
                                            onClick={() =>
                                                setCurrentPage(
                                                    (prev) =>
                                                        Math.min(
                                                            totalPages,
                                                            prev +
                                                                1,
                                                        ),
                                                )
                                            }
                                        >
                                            <span>Berikutnya</span>
                                            <i className="bi bi-chevron-right" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                </section>
            </div>

            <DailyProgressDeleteModal
                progress={progressToDelete}
                onClose={() =>
                    setProgressToDelete(null)
                }
                onDelete={deleteProgress}
                onSuccess={() => {
                    setProgressToDelete(null)
                    void fetchProgresses()
                }}
            />

            <DailyProgressDetailModal
                progress={progressToView}
                onClose={() =>
                    setProgressToView(null)
                }
                onEditForm={(progress) => {
                    setProgressToView(null)
                    navigate(
                        `/daily-progress/${progress.id}/edit`,
                    )
                }}
            />
        </>
    )
}

export default DailyProgressBoard
