import {
    useEffect,
    useState,
} from 'react'

import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import { getPeriodeLabel } from '@/features/daily-progress/utils/dailyProgressPeriod'

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

                        <div className="col-md-2">
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

                        <div className="col-md-2">
                            <label className="form-label">
                                Periode
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={getPeriodeLabel(
                                    currentProgress.bulan,
                                    currentProgress.tahun,
                                    currentProgress.tanggal,
                                )}
                                disabled
                            />
                        </div>

                        <div className="col-md-2">
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

                    <div className="mb-4">
                        <h3 className="h6 mb-2">
                            Detail Pekerjaan
                        </h3>

                        {currentProgress.details.length ===
                        0 ? (
                            <div className="daily-progress-empty p-3">
                                <span>
                                    Tidak ada detail pekerjaan.
                                </span>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-bordered table-sm mb-0">
                                    <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>
                                            Pekerjaan
                                        </th>
                                        <th>Status</th>
                                        <th>
                                            Catatan
                                        </th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {currentProgress.details.map(
                                        (
                                            detail,
                                            index,
                                        ) => (
                                            <tr
                                                key={
                                                    detail.id
                                                }
                                            >
                                                <td>
                                                    {index +
                                                        1}
                                                </td>

                                                <td>
                                                    {getDetailLabel(
                                                        detail,
                                                    )}
                                                </td>

                                                <td>
                                                        <span
                                                            className={`badge bg-${
                                                                detail.status ===
                                                                'selesai'
                                                                    ? 'success'
                                                                    : detail.status ===
                                                                      'pending'
                                                                      ? 'warning'
                                                                      : 'secondary'
                                                            }`}
                                                        >
                                                            {
                                                                statusLabels[
                                                                    detail
                                                                        .status
                                                                    ]
                                                            }
                                                        </span>
                                                </td>

                                                <td>
                                                    {detail.catatan ??
                                                        '-'}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="h6 mb-2">Temuan</h3>

                        {(!currentProgress.temuans ||
                            currentProgress.temuans
                                .length === 0) &&
                        (!currentProgress.findings ||
                            currentProgress.findings
                                .length === 0) ? (
                            <div className="daily-progress-empty p-3">
                                <span>
                                    Tidak ada temuan.
                                </span>
                            </div>
                        ) : (
                            <ul className="list-group">
                                {currentProgress.temuans?.map(
                                    (temuan) => (
                                        <li
                                            key={
                                                temuan.id
                                            }
                                            className="list-group-item d-flex justify-content-between align-items-center"
                                        >
                                            <div>
                                                <strong>
                                                    {temuan.nomor}
                                                </strong>
                                                {temuan.notes && temuan.notes.length > 0 && (
                                                    <div className="text-muted small">
                                                        {temuan.notes.map((n) => n.note).join(', ')}
                                                    </div>
                                                )}
                                                <div className="text-muted small">
                                                    Status:{' '}
                                                    {
                                                        temuan.status
                                                    }
                                                </div>
                                            </div>
                                        </li>
                                    ),
                                )}

                                {currentProgress.findings?.map(
                                    (finding) => (
                                        <li
                                            key={
                                                finding.id
                                            }
                                            className="list-group-item d-flex justify-content-between align-items-center"
                                        >
                                            <div>
                                                <strong>
                                                    {
                                                        finding.keterangan
                                                    }
                                                </strong>
                                                <div className="text-muted small">
                                                    PR:{' '}
                                                    {
                                                        finding.nomor_pr
                                                    }{' '}
                                                    (
                                                    {
                                                        finding.tanggal
                                                    }
                                                    )
                                                </div>
                                            </div>
                                            <span className="badge bg-info">
                                                {
                                                    finding.source_type
                                                }
                                            </span>
                                        </li>
                                    ),
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="daily-progress-modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
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
