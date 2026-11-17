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

const statusConfig: Record<
    DailyProgressStatus,
    { label: string; className: string; icon: string }
> = {
    open: {
        label: 'Open',
        className: 'open',
        icon: 'bi-circle',
    },
    pending: {
        label: 'Pending',
        className: 'pending',
        icon: 'bi-hourglass-split',
    },
    batal: {
        label: 'Batal',
        className: 'batal',
        icon: 'bi-x-circle',
    },
    selesai: {
        label: 'Selesai',
        className: 'selesai',
        icon: 'bi-check-circle-fill',
    },
}

const getDetailLabel = (
    detail: DailyProgress['details'][number],
): { parentName?: string; taskName: string } => {
    const taskName = detail.task?.task_name ?? 'Task'
    const parentName = detail.task?.parent?.task_name

    return {
        parentName,
        taskName,
    }
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

    const [activeTab, setActiveTab] =
        useState<'pekerjaan' | 'temuan'>('pekerjaan')

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

    const completedCount = currentProgress.details.filter(
        (d) => d.status === 'selesai',
    ).length
    const pendingCount = currentProgress.details.filter(
        (d) => d.status === 'pending',
    ).length
    const totalTemuans =
        (currentProgress.temuans?.length ?? 0) +
        (currentProgress.findings?.length ?? 0)

    return (
        <div className="daily-progress-modal-backdrop" onClick={onClose}>
            <div
                className="daily-progress-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="daily-progress-modal-header">
                    <div className="d-flex align-items-center gap-2.5">
                        <div className="daily-progress-modal-icon-badge">
                            <i className="bi bi-file-earmark-check" />
                        </div>
                        <div>
                            <h2>Detail Daily Progress</h2>
                            <span className="daily-progress-modal-doc-id">
                                {currentProgress.nomor}
                            </span>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        {currentProgress.is_used_in_progress_report && (
                            <span
                                className="badge bg-secondary text-white py-1.5 px-2 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '11px' }}
                                title="Telah digunakan di Progress Report"
                            >
                                <i className="bi bi-lock-fill" />
                                Terkunci
                            </span>
                        )}

                        {onEditForm !== undefined && !currentProgress.is_used_in_progress_report && (
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
                            title="Tutup"
                        >
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>
                </div>

                <div className="daily-progress-modal-body">
                    {isLoading && (
                        <div className="daily-progress-loading py-4">
                            <div
                                className="spinner-border spinner-border-sm text-primary mb-2"
                                role="status"
                            />
                            <span>Memuat detail terbaru...</span>
                        </div>
                    )}

                    {errorMessage !== null && (
                        <div
                            className="alert alert-danger d-flex align-items-center gap-2 mb-3"
                            role="alert"
                        >
                            <i className="bi bi-exclamation-circle-fill" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {currentProgress.is_used_in_progress_report && (
                        <div className="alert alert-secondary d-flex align-items-center gap-2 mb-3 py-2 px-3">
                            <i className="bi bi-lock-fill text-secondary fs-5" />
                            <span className="small">
                                Daily Progress ini telah dimasukkan ke dalam <strong>Progress Report</strong> dan terkunci permanen (Read-Only).
                            </span>
                        </div>
                    )}

                    {/* Metadata Overview Cards */}
                    <div className="daily-progress-detail-info-grid mb-4">
                        <div className="daily-progress-info-card">
                            <div className="daily-progress-info-icon purple">
                                <i className="bi bi-buildings" />
                            </div>
                            <div className="daily-progress-info-meta">
                                <span className="label">Client</span>
                                <strong className="value">
                                    {currentProgress.client_code}
                                </strong>
                            </div>
                        </div>

                        <div className="daily-progress-info-card">
                            <div className="daily-progress-info-icon blue">
                                <i className="bi bi-file-earmark-ruled" />
                            </div>
                            <div className="daily-progress-info-meta">
                                <span className="label">Nomor SPK</span>
                                <strong className="value">
                                    {currentProgress.no_spk ?? '-'}
                                </strong>
                            </div>
                        </div>

                        <div className="daily-progress-info-card">
                            <div className="daily-progress-info-icon cyan">
                                <i className="bi bi-calendar3" />
                            </div>
                            <div className="daily-progress-info-meta">
                                <span className="label">Tanggal &amp; Periode</span>
                                <strong className="value">
                                    {currentProgress.tanggal}
                                </strong>
                                <small className="sub">
                                    {getPeriodeLabel(
                                        currentProgress.bulan,
                                        currentProgress.tahun,
                                        currentProgress.tanggal,
                                    )}
                                </small>
                            </div>
                        </div>

                        <div className="daily-progress-info-card">
                            <div className="daily-progress-info-icon primary">
                                <i className="bi bi-person-badge" />
                            </div>
                            <div className="daily-progress-info-meta">
                                <span className="label">Dibuat Oleh</span>
                                <strong className="value">
                                    {currentProgress.created_by_name ?? currentProgress.created_by ?? '-'}
                                </strong>
                                <small className="sub">
                                    {currentProgress.created_by_name && currentProgress.created_by ? `${currentProgress.created_by} • ` : ''}
                                    {currentProgress.created_by_level ? `Tingkat ${currentProgress.created_by_level}` : 'Staff'}
                                </small>
                            </div>
                        </div>
                    </div>

                    {/* Tabs / Segmented Control */}
                    <div className="daily-progress-detail-tabs mb-3">
                        <button
                            type="button"
                            className={`daily-progress-detail-tab ${
                                activeTab === 'pekerjaan' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('pekerjaan')}
                        >
                            <i className="bi bi-list-check me-1.5" />
                            <span>Pekerjaan</span>
                            <span className="count-pill">
                                {currentProgress.details.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`daily-progress-detail-tab ${
                                activeTab === 'temuan' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('temuan')}
                        >
                            <i className="bi bi-exclamation-triangle me-1.5" />
                            <span>Temuan</span>
                            {totalTemuans > 0 && (
                                <span className="count-pill alert">
                                    {totalTemuans}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab 1: Pekerjaan */}
                    {activeTab === 'pekerjaan' && (
                        <div className="daily-progress-pekerjaan-section">
                            <div className="daily-progress-section-toolbar mb-2">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                                        <i className="bi bi-check-circle me-1" />
                                        {completedCount} Selesai
                                    </span>
                                    {pendingCount > 0 && (
                                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                                            <i className="bi bi-hourglass-split me-1" />
                                            {pendingCount} Pending
                                        </span>
                                    )}
                                </div>
                            </div>

                            {currentProgress.details.length === 0 ? (
                                <div className="daily-progress-empty p-4">
                                    <i className="bi bi-inbox text-muted fs-3 mb-2" />
                                    <span>Tidak ada detail pekerjaan.</span>
                                </div>
                            ) : (
                                <div className="table-responsive daily-progress-modal-table-wrap">
                                    <table className="table daily-progress-modal-table mb-0">
                                        <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>No</th>
                                            <th>Pekerjaan</th>
                                            <th style={{ width: '120px' }}>Status</th>
                                            <th>Catatan</th>
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {currentProgress.details.map(
                                            (detail, index) => {
                                                const {
                                                    parentName,
                                                    taskName,
                                                } = getDetailLabel(detail)
                                                const status =
                                                    statusConfig[detail.status] ??
                                                    statusConfig.open

                                                return (
                                                    <tr key={detail.id}>
                                                        <td className="text-muted text-center">
                                                            {index + 1}
                                                        </td>

                                                        <td>
                                                            {parentName && (
                                                                <div className="daily-progress-parent-task">
                                                                    {parentName}
                                                                </div>
                                                            )}
                                                            <div className="daily-progress-task-name">
                                                                {taskName}
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`daily-progress-status ${status.className}`}
                                                            >
                                                                <i
                                                                    className={`bi ${status.icon} me-1`}
                                                                />
                                                                {status.label}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {detail.catatan &&
                                                            detail.catatan.trim() !==
                                                            '' ? (
                                                                <div className="daily-progress-note-callout">
                                                                    <i className="bi bi-chat-left-text me-1.5" />
                                                                    <span>
                                                                        {detail.catatan}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted fst-italic small">
                                                                    -
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            },
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Temuan */}
                    {activeTab === 'temuan' && (
                        <div className="daily-progress-temuan-section">
                            {(!currentProgress.temuans ||
                                currentProgress.temuans.length === 0) &&
                            (!currentProgress.findings ||
                                currentProgress.findings.length === 0) ? (
                                <div className="daily-progress-empty p-4">
                                    <i className="bi bi-check-circle text-success fs-3 mb-2" />
                                    <span>
                                        Tidak ada temuan pada laporan ini.
                                    </span>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-2.5">
                                    {currentProgress.temuans?.map((temuan) => (
                                        <div
                                            key={temuan.id}
                                            className="daily-progress-temuan-card global"
                                        >
                                            <div className="d-flex align-items-center justify-content-between mb-1.5">
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="daily-progress-temuan-tag global">
                                                        Temuan Global
                                                    </span>
                                                    <strong>
                                                        {temuan.nomor}
                                                    </strong>
                                                </div>

                                                <span
                                                    className={`daily-progress-status ${
                                                        temuan.status === 'open'
                                                            ? 'open'
                                                            : 'selesai'
                                                    }`}
                                                >
                                                    {temuan.status}
                                                </span>
                                            </div>

                                            {temuan.notes &&
                                                temuan.notes.length > 0 && (
                                                    <div className="daily-progress-temuan-notes">
                                                        {temuan.notes
                                                            .map((n) => n.note)
                                                            .join(', ')}
                                                    </div>
                                                )}
                                        </div>
                                    ))}

                                    {currentProgress.findings?.map(
                                        (finding) => (
                                            <div
                                                key={finding.id}
                                                className="daily-progress-temuan-card pr"
                                            >
                                                <div className="d-flex align-items-center justify-content-between mb-1.5">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="daily-progress-temuan-tag pr">
                                                            Finding PR
                                                        </span>
                                                        <strong>
                                                            {finding.nomor_pr}
                                                        </strong>
                                                        <span className="text-muted small">
                                                            ({finding.tanggal})
                                                        </span>
                                                    </div>

                                                    <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">
                                                        {finding.source_type}
                                                    </span>
                                                </div>

                                                <p className="daily-progress-finding-desc mb-0">
                                                    {finding.keterangan}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="daily-progress-modal-footer">
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={onClose}
                    >
                        Tutup
                    </button>
                    {onEditForm !== undefined && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                onClose()
                                onEditForm(currentProgress)
                            }}
                        >
                            <i className="bi bi-pencil-square me-1" />
                            Edit Daily Progress
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DailyProgressDetailModal
