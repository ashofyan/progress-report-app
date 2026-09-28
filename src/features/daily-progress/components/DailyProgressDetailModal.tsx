import {
    useEffect,
    useState,
} from 'react'

import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'

import type {
    DailyProgress,
    DailyProgressStatus,
} from '@/features/daily-progress/types/daily-progress.types'

interface DailyProgressDetailModalProps {
    progress: DailyProgress | null
    onClose: () => void
    onEditForm?: (progress: DailyProgress) => void
}

const statusLabels: Record<DailyProgressStatus, string> = {
    open: 'Open',
    pending: 'Pending',
    batal: 'Batal',
    selesai: 'Selesai',
}

const getDetailLabel = (
    detail: DailyProgress['details'][number],
): string => {
    const taskName = detail.task?.task_name ?? 'Task'
    const parentName = detail.task?.parent?.task_name

    return parentName === undefined
        ? taskName
        : `${parentName} / ${taskName}`
}

const DailyProgressDetailModal = ({
                                      progress,
                                      onClose,
                                      onEditForm,
                                  }: DailyProgressDetailModalProps) => {
    const [detailProgress, setDetailProgress] =
        useState<DailyProgress | null>(null)

    const [isLoading, setIsLoading] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    useEffect(() => {
        if (progress === null) {
            return
        }

        queueMicrotask(() => {
            const fetchDetail = async (): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result =
                    await dailyProgressApi.getById(progress.id)

                setIsLoading(false)

                if (
                    !result.success ||
                    result.data === undefined
                ) {
                    setDetailProgress(progress)
                    setErrorMessage(result.message)
                    return
                }

                setDetailProgress(result.data)
            }

            void fetchDetail()
        })
    }, [progress])

    if (progress === null) {
        return null
    }

    const currentProgress = detailProgress ?? progress

    return (
        <div className="daily-progress-modal-backdrop">
            <div className="daily-progress-modal">
                <div className="daily-progress-modal-header sticky-top bg-white">
                    <h2>Detail Daily Progress</h2>

                    <div className="d-flex align-items-center gap-2">
                        {onEditForm !== undefined && (
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => {
                                    onClose()
                                    onEditForm(currentProgress)
                                }}
                            >
                                <i className="bi bi-pencil me-1" />
                                Edit Data
                            </button>
                        )}

                        <button
                            type="button"
                            className="daily-progress-modal-close"
                            onClick={onClose}
                        >
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                </div>

                <div className="daily-progress-modal-body">
                    {isLoading && (
                        <div className="daily-progress-loading">
                            <div
                                className="spinner-border"
                                role="status"
                            />
                            <span>Memuat detail...</span>
                        </div>
                    )}

                    {errorMessage !== null && (
                        <div
                            className="alert alert-danger"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <div className="row g-3 mb-4">
                        <div className="col-md-3">
                            <label className="form-label">
                                Nomor
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={
                                    currentProgress.nomor
                                }
                                disabled
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">
                                Tanggal
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={
                                    currentProgress.tanggal
                                }
                                disabled
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">
                                Client
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={
                                    currentProgress.client_code
                                }
                                disabled
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">
                                SPK
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={
                                    currentProgress.no_spk ??
                                    '-'
                                }
                                disabled
                            />
                        </div>
                    </div>

                    <div className="row g-3 mb-4">
                        <div className="col-md-6">
                            <label className="form-label">
                                Dibuat Oleh
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={
                                    currentProgress.created_by
                                }
                                disabled
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">
                                Tingkat Pembuat
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={
                                    currentProgress.created_by_level
                                }
                                disabled
                            />
                        </div>
                    </div>

                    {currentProgress.details.map((detail) => (
                        <div
                            className="daily-progress-detail-card"
                            key={detail.id}
                        >
                            <div className="flex flex-row">
                                <div className="daily-progress-detail-heading">
                                    <strong>
                                        {getDetailLabel(detail)}
                                    </strong>
                                </div>

                                <div>
                                    <span
                                        className={`daily-progress-status ${detail.status}`}
                                    >
                                    {
                                        statusLabels[
                                            detail.status
                                            ]
                                    }
                                </span>
                                </div>
                            </div>

                            <p className="daily-progress-detail-note">
                                {detail.catatan ??
                                    'Tidak ada catatan.'}
                            </p>

                            <div className="daily-progress-document-section">
                                <div className="daily-progress-document-heading">
                                    <span>
                                        Dokumen Tersimpan
                                    </span>
                                </div>

                                {(detail.documents ?? [])
                                    .length === 0 && (
                                    <div className="daily-progress-document-empty">
                                        Belum ada dokumen.
                                    </div>
                                )}

                                {(detail.documents ?? []).map(
                                    (document) => (
                                        <div
                                            className="daily-progress-document-row"
                                            key={document.id}
                                        >
                                            <div>
                                                <strong>
                                                    {
                                                        document.original_name
                                                    }
                                                </strong>
                                                <span>
                                                    {Math.ceil(
                                                        document.size /
                                                        1024,
                                                    )}{' '}
                                                    KB
                                                </span>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    ))}

                    {(currentProgress.findings ?? []).length > 0 && (
                        <div className="daily-progress-document-section">
                            <div className="daily-progress-document-heading">
                                <span>Temuan Progress Report</span>
                            </div>

                            {(currentProgress.findings ?? []).map(
                                (finding) => (
                                    <div
                                        className="daily-progress-document-row"
                                        key={finding.id}
                                    >
                                        <div>
                                            <strong>
                                                {finding.nomor_pr} /{' '}
                                                {finding.tanggal}
                                            </strong>
                                            <span>
                                                {finding.keterangan}
                                            </span>
                                        </div>

                                        <span
                                            className={`daily-progress-status ${finding.status}`}
                                        >
                                            {finding.status}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    )}

                    {(currentProgress.temuans ?? []).length > 0 && (
                        <div className="daily-progress-document-section">
                            <div className="daily-progress-document-heading">
                                <span>Temuan Global</span>
                            </div>

                            {(currentProgress.temuans ?? []).map(
                                (temuan) => (
                                    <div
                                        className="daily-progress-document-row"
                                        key={temuan.id}
                                    >
                                        <div>
                                            <strong>
                                                {temuan.nomor} /{' '}
                                                {temuan.tanggal}
                                            </strong>
                                            <span>
                                                {(temuan.notes ?? [])
                                                    .map(
                                                        (note) =>
                                                            note.note,
                                                    )
                                                    .join('\n') ||
                                                    'Tanpa catatan.'}
                                            </span>
                                        </div>

                                        <span
                                            className={`daily-progress-status ${temuan.status}`}
                                        >
                                            {temuan.status}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DailyProgressDetailModal
