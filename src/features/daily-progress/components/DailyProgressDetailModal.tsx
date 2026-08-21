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
                <div className="daily-progress-modal-header">
                    <h2>Detail Daily Progress</h2>

                    <button
                        type="button"
                        className="daily-progress-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="daily-progress-modal-body">
                    {isLoading && (
                        <div className="daily-progress-task-empty">
                            Memuat detail...
                        </div>
                    )}

                    {errorMessage !== null && (
                        <div className="alert alert-danger">
                            {errorMessage}
                        </div>
                    )}

                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <label className="form-label">
                                Nomor
                            </label>
                            <input
                                className="form-control"
                                value={currentProgress.nomor}
                                disabled
                            />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">
                                Tanggal
                            </label>
                            <input
                                className="form-control"
                                value={currentProgress.tanggal}
                                disabled
                            />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">
                                Kode Client
                            </label>
                            <input
                                className="form-control"
                                value={currentProgress.client_code}
                                disabled
                            />
                        </div>
                    </div>

                    {currentProgress.details.length === 0 && (
                        <div className="daily-progress-task-empty">
                            Belum ada detail.
                        </div>
                    )}

                    {currentProgress.details.map((detail) => (
                        <div
                            className="daily-progress-detail-card"
                            key={detail.id}
                        >
                            <div className="daily-progress-detail-title">
                                {getDetailLabel(detail)}
                            </div>

                            <div className="daily-progress-readonly-grid">
                                <span
                                    className={`daily-progress-status ${detail.status}`}
                                >
                                    {statusLabels[detail.status]}
                                </span>

                                <p>{detail.catatan ?? '-'}</p>
                            </div>

                            <div className="daily-progress-document-section">
                                <div className="daily-progress-document-heading">
                                    <span>Dokumen</span>
                                </div>

                                {(detail.documents ?? []).length ===
                                    0 && (
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
                </div>

                <div className="daily-progress-modal-footer">
                    <button
                        type="button"
                        className="btn btn-light"
                        onClick={onClose}
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DailyProgressDetailModal
