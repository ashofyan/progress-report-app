import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import { getPeriodeLabel } from '@/features/daily-progress/utils/dailyProgressPeriod'
import type {
    DailyProgress,
    DailyProgressDocument,
    DailyProgressPrReference,
    DailyProgressStatus,
} from '@/features/daily-progress/types/daily-progress.types'

import '@/features/daily-progress/styles/daily-progress.scss'
import '@/features/progress-report/styles/progress-report.scss'

const INDO_MONTHS = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
]

const formatIndoDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-'
    const parts = dateStr.slice(0, 10).split('-')
    if (parts.length === 3) {
        const year = parts[0]
        const month = Number(parts[1]) - 1
        const day = Number(parts[2])
        if (month >= 0 && month < 12) {
            return `${day} ${INDO_MONTHS[month]} ${year}`
        }
    }
    return dateStr
}

const getDocumentName = (document: DailyProgressDocument): string => {
    return document.original_name ?? document.path ?? 'Dokumen'
}

const getDocumentUrl = (document: DailyProgressDocument): string | null => {
    if (document.path === undefined || document.path === null || document.path === '') {
        return null
    }

    const cleanPath = document.path.startsWith('/') ? document.path.slice(1) : document.path
    const storagePath = cleanPath.startsWith('storage/') ? `/${cleanPath}` : `/storage/${cleanPath}`
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

    if (typeof apiBaseUrl !== 'string' || apiBaseUrl === '') {
        return storagePath
    }

    try {
        const baseUrl = new URL(apiBaseUrl)
        return `${baseUrl.origin}${storagePath}`
    } catch {
        return storagePath
    }
}

const isImageDocument = (document: DailyProgressDocument): boolean => {
    if (document.mime_type && document.mime_type.startsWith('image/')) {
        return true
    }
    const nameOrPath = (document.original_name ?? document.path ?? '').toLowerCase()
    return /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(nameOrPath)
}

const renderAttachments = (documents?: DailyProgressDocument[]) => {
    if (!documents || documents.length === 0) return null

    const images = documents.filter(isImageDocument)
    const nonImages = documents.filter((doc) => !isImageDocument(doc))

    return (
        <div className="task-attachments-container print-hide mt-2">
            {/* Lampiran Gambar */}
            {images.length > 0 && (
                <div className="task-image-attachments">
                    {images.map((doc) => {
                        const url = getDocumentUrl(doc)
                        const name = getDocumentName(doc)
                        return (
                            <div key={doc.id} className="task-image-card">
                                {url ? (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="task-image-preview-link"
                                        title={`Buka gambar: ${name}`}
                                    >
                                        <img
                                            src={url}
                                            alt={name}
                                            className="task-image-thumbnail"
                                            loading="lazy"
                                        />
                                    </a>
                                ) : (
                                    <div className="task-image-fallback">
                                        <i className="bi bi-image" />
                                    </div>
                                )}
                                <div className="task-image-name" title={name}>
                                    {name}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Lampiran Dokumen Non-Gambar */}
            {nonImages.length > 0 && (
                <div className="task-document-links mt-2">
                    {nonImages.map((doc) => {
                        const url = getDocumentUrl(doc)
                        const name = getDocumentName(doc)
                        return url ? (
                            <div key={doc.id} className="task-document-link-item">
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="task-doc-link"
                                    title={`Unduh/Buka dokumen: ${name}`}
                                >
                                    <i className="bi bi-link-45deg doc-icon" />
                                    <span className="doc-name">{name}</span>
                                    <span className="doc-url-text">({url})</span>
                                </a>
                            </div>
                        ) : (
                            <div key={doc.id} className="task-document-link-item">
                                <span className="task-doc-disabled">
                                    <i className="bi bi-file-earmark me-1" />
                                    <span className="doc-name">{name}</span>
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

interface GroupedTask {
    id: number
    taskName: string
    status: DailyProgressStatus
    catatan: string | null
    documents?: DailyProgressDocument[]
    progress_reports?: DailyProgressPrReference[] | null
}

interface TaskGroup {
    groupKey: string
    parentName: string
    jobCode?: string
    jobDescription?: string
    children: GroupedTask[]
}

const statusConfig: Record<
    DailyProgressStatus,
    { label: string; className: string; icon: string }
> = {
    open: {
        label: 'Open',
        className: 'badge bg-secondary-subtle text-secondary border',
        icon: 'bi-circle',
    },
    pending: {
        label: 'Pending',
        className: 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle',
        icon: 'bi-hourglass-split',
    },
    batal: {
        label: 'Batal',
        className: 'badge bg-danger-subtle text-danger border border-danger-subtle',
        icon: 'bi-x-circle',
    },
    selesai: {
        label: 'Selesai',
        className: 'badge bg-success-subtle text-success border border-success-subtle',
        icon: 'bi-check-circle-fill',
    },
}

export const DailyProgressDetailPage = () => {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()

    const { employee: authEmployee } = useAuth()
    const { clients } = useMarketingClients()

    const [detail, setDetail] = useState<DailyProgress | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        if (!id || id.trim() === '') {
            queueMicrotask(() => {
                setErrorMessage('ID atau Nomor Daily Progress tidak valid.')
                setIsLoading(false)
            })
            return
        }

        queueMicrotask(() => {
            const fetchDetail = async (): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result = await dailyProgressApi.getById(id)

                setIsLoading(false)

                if (!result.success || !result.data) {
                    setErrorMessage(
                        result.message || 'Gagal memuat detail Daily Progress.',
                    )
                    return
                }

                setDetail(result.data)
            }

            void fetchDetail()
        })
    }, [id])

    const clientName = useMemo(() => {
        if (!detail) return '-'
        const found = clients.find(
            (c) => c.customer_code === detail.client_code,
        )
        return found
            ? found.customer_name || found.company_name || found.customer_code
            : detail.client_code
    }, [clients, detail])

    const creatorName = useMemo(() => {
        if (!detail) return '-'
        if (detail.created_by_name) {
            return detail.created_by_name
        }
        if (
            authEmployee &&
            authEmployee.employee_code === detail.created_by
        ) {
            return authEmployee.employee_name
        }
        return detail.created_by || '-'
    }, [authEmployee, detail])

    // Extract Progress Report info
    const progressReportsList = useMemo((): Array<{ id?: number; nomor: string }> => {
        if (!detail) return []
        const list: Array<{ id?: number; nomor: string }> = []
        const seen = new Set<string>()

        const addPr = (id?: number, nomor?: string | null) => {
            if (!nomor) return
            const key = `${id ?? ''}-${nomor}`
            if (!seen.has(key)) {
                seen.add(key)
                list.push({ id, nomor })
            }
        }

        // 1. From detail.progress_reports array (new backend response)
        if (Array.isArray(detail.progress_reports)) {
            for (const pr of detail.progress_reports) {
                if (pr && pr.nomor) addPr(pr.id, pr.nomor)
            }
        }

        // 2. From detail.progress_report object
        if (detail.progress_report && detail.progress_report.nomor) {
            addPr(detail.progress_report.id, detail.progress_report.nomor)
        }

        // 3. Scalar fields
        if (detail.nomor_progress_report) {
            addPr(detail.progress_report_id ?? undefined, detail.nomor_progress_report)
        }
        if (detail.progress_report_nomor) {
            addPr(detail.progress_report_id ?? undefined, detail.progress_report_nomor)
        }

        // 4. From details
        for (const d of detail.details ?? []) {
            if (Array.isArray(d.progress_reports)) {
                for (const pr of d.progress_reports) {
                    if (pr && pr.nomor) addPr(pr.id, pr.nomor)
                }
            }
            const anyD = (d as unknown) as Record<string, unknown>
            if (Array.isArray(anyD.progress_reports)) {
                for (const pr of anyD.progress_reports as Array<{ id?: number; nomor?: string }>) {
                    if (pr && pr.nomor) addPr(pr.id, pr.nomor)
                }
            }
            if (anyD.progress_report && typeof anyD.progress_report === 'object') {
                const pr = anyD.progress_report as { id?: number; nomor?: string }
                if (pr.nomor) addPr(pr.id, pr.nomor)
            }
            if (anyD.last_progress_report && typeof anyD.last_progress_report === 'object') {
                const lpr = anyD.last_progress_report as { progress_report_id?: number; nomor?: string }
                if (lpr.nomor) addPr(lpr.progress_report_id, lpr.nomor)
            }
        }

        // 5. From findings
        for (const f of detail.findings ?? []) {
            if (f.nomor_pr) {
                addPr(f.progress_report_id, f.nomor_pr)
            }
        }

        return list
    }, [detail])

    // Grouping tasks by parent
    const taskGroups = useMemo((): TaskGroup[] => {
        if (!detail?.details || detail.details.length === 0) {
            return []
        }

        const groupsMap = new Map<string, TaskGroup>()

        detail.details.forEach((item) => {
            const parentName =
                item.task?.parent?.task_name?.trim() ||
                item.job?.description?.trim() ||
                'Pekerjaan Utama'
            const groupKey = `${item.als_job_id}_${parentName}`

            if (!groupsMap.has(groupKey)) {
                groupsMap.set(groupKey, {
                    groupKey,
                    parentName,
                    jobCode: item.job?.job_code,
                    jobDescription: item.job?.description,
                    children: [],
                })
            }

            const taskName = item.task?.task_name?.trim() || 'Task'
            groupsMap.get(groupKey)!.children.push({
                id: item.id,
                taskName,
                status: item.status,
                catatan: item.catatan,
                documents: item.documents,
                progress_reports: item.progress_reports,
            })
        })

        return Array.from(groupsMap.values())
    }, [detail])

    const handlePrint = () => {
        window.print()
    }

    if (isLoading) {
        return (
            <div className="progress-report-detail-page">
                <div className="py-5 text-center">
                    <div className="spinner-border text-primary mb-2" role="status" />
                    <div className="text-muted">Memuat detail Daily Progress...</div>
                </div>
            </div>
        )
    }

    if (errorMessage !== null || detail === null) {
        return (
            <div className="progress-report-detail-page">
                <div className="alert alert-danger d-flex align-items-center justify-content-between p-4 my-4">
                    <div>
                        <h5 className="alert-heading mb-1">
                            <i className="bi bi-exclamation-triangle-fill me-2" />
                            Gagal Memuat Data
                        </h5>
                        <p className="mb-0">{errorMessage || 'Data tidak ditemukan.'}</p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => navigate('/daily-progress')}
                    >
                        Kembali ke Daftar
                    </button>
                </div>
            </div>
        )
    }

    const canEdit =
        !detail.is_used_in_progress_report &&
        (!authEmployee || authEmployee.employee_code === detail.created_by)

    return (
        <div className="progress-report-detail-page">
            {/* Top Toolbar */}
            <div className="progress-report-detail-topbar">
                <div className="progress-report-detail-topbar-left">
                    <button
                        type="button"
                        className="btn-back"
                        onClick={() => navigate('/daily-progress')}
                    >
                        <i className="bi bi-arrow-left" />
                        <span>Kembali</span>
                    </button>
                    <h1 className="progress-report-detail-main-title">
                        Detail Daily Progress
                    </h1>
                </div>

                <div className="progress-report-detail-topbar-right">
                    {canEdit && (
                        <button
                            type="button"
                            className="btn-print-action"
                            onClick={() => navigate(`/daily-progress/${detail.id}/edit-form`)}
                            title="Koreksi Lengkap Daily Progress"
                        >
                            <i className="bi bi-pencil" />
                            <span>Edit Form</span>
                        </button>
                    )}

                    {canEdit && (
                        <button
                            type="button"
                            className="btn-print-action"
                            onClick={() => navigate(`/daily-progress/${detail.id}/edit`)}
                            title="Update Status / Catatan Daily Progress"
                        >
                            <i className="bi bi-arrow-repeat text-warning" />
                            <span>Update Status</span>
                        </button>
                    )}

                    <button
                        type="button"
                        className="btn-print-action"
                        onClick={handlePrint}
                        title="Cetak Daily Progress"
                    >
                        <i className="bi bi-printer" />
                        <span>Print</span>
                    </button>

                    <button
                        type="button"
                        className="btn-print-action"
                        onClick={handlePrint}
                        title="Export ke PDF"
                    >
                        <i className="bi bi-file-earmark-text" />
                        <span>Export PDF</span>
                    </button>
                </div>
            </div>

            {/* Banner Status Penggunaan di Progress Report */}
            {detail.is_used_in_progress_report && (
                <div
                    className="alert alert-secondary d-flex align-items-center justify-content-between flex-wrap gap-2 py-2 px-3 mb-3 print-hide border shadow-xs"
                    style={{ borderRadius: '8px' }}
                >
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-lock-fill fs-5 text-secondary" />
                        <div>
                            <strong className="text-secondary">
                                Daily Progress Terkunci (Sudah Masuk ke Progress Report)
                            </strong>
                            <div className="small text-muted">
                                Laporan ini sudah dimasukkan ke dalam pembuatan Progress Report dan terkunci permanen (Read-Only).
                            </div>
                        </div>
                    </div>

                    {progressReportsList.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                            {progressReportsList.map((pr) => (
                                <Link
                                    key={`${pr.id ?? pr.nomor}`}
                                    to={pr.id ? `/progress-report/${pr.id}` : `/progress-report`}
                                    className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                                >
                                    <i className="bi bi-journal-check" />
                                    <span>Buka Progress Report ({pr.nomor})</span>
                                    <i className="bi bi-arrow-right" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Document Card (Mirip Progress Report) */}
            <div className="progress-report-document-card">
                {/* Header Card */}
                <div className="report-card-header">
                    <div className="report-card-title-group">
                        <h2 className="report-card-heading">
                            Daily Progress
                        </h2>
                        <div className="report-card-number">
                            {detail.nomor}
                        </div>
                    </div>

                    <div className="report-card-signature-label">
                        Yang Membuat Laporan,
                    </div>
                </div>

                {/* Subheader / Metadata */}
                <div className="report-card-meta-row">
                    <div className="report-card-date-badge">
                        <span>Tanggal: </span>
                        <strong>{formatIndoDate(detail.tanggal)}</strong>
                    </div>

                    <div className="report-card-creator">
                        {creatorName}
                    </div>
                </div>

                <hr className="report-card-divider" />

                {/* Grid Metadata */}
                <div className="report-card-metadata-grid">
                    <div className="metadata-item">
                        <span className="metadata-label">Client</span>
                        <span className="metadata-value">
                            {clientName}
                        </span>
                    </div>

                    <div className="metadata-item">
                        <span className="metadata-label">Nomor SPK</span>
                        <span className="metadata-value">
                            {detail.no_spk ?? '-'}
                        </span>
                    </div>

                    <div className="metadata-item">
                        <span className="metadata-label">Periode</span>
                        <span className="metadata-value">
                            {getPeriodeLabel(
                                detail.bulan,
                                detail.tahun,
                                detail.tanggal,
                            )}
                        </span>
                    </div>

                    <div className="metadata-item">
                        <span className="metadata-label">No. Progress Report</span>
                        <span className="metadata-value">
                            {progressReportsList.length > 0 ? (
                                <div className="d-flex flex-wrap gap-1 align-items-center">
                                    {progressReportsList.map((pr) => (
                                        <Link
                                            key={`${pr.id ?? pr.nomor}`}
                                            to={pr.id ? `/progress-report/${pr.id}` : `/progress-report`}
                                            className="daily-progress-badge pr"
                                            title="Klik untuk membuka detail Progress Report"
                                        >
                                            <i className="bi bi-journal-check me-1" />
                                            <span>{pr.nomor}</span>
                                            <i className="bi bi-box-arrow-up-right ms-1 text-primary-emphasis" style={{ fontSize: '9.5px' }} />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-muted small">-</span>
                            )}
                        </span>
                    </div>
                </div>

                <hr className="report-card-divider" />

                {/* Pekerjaan / Tasks Section */}
                <div className="report-card-section">
                    <h3 className="section-title">Rincian Pekerjaan</h3>

                    {taskGroups.length === 0 ? (
                        ((detail.temuans && detail.temuans.length > 0) ||
                            (detail.findings && detail.findings.length > 0)) ? (
                            <div className="alert alert-light border d-flex align-items-center gap-2 mb-3 py-2 px-3 text-secondary small" style={{ borderRadius: '6px' }}>
                                <i className="bi bi-info-circle text-primary fs-6" />
                                <span>Daily Progress ini berfokus pada penanganan dan tindak lanjut temuan audit.</span>
                            </div>
                        ) : (
                            <div className="text-muted fst-italic py-2">
                                Tidak ada pekerjaan yang dilaporkan.
                            </div>
                        )
                    ) : (
                        <div className="task-tree">
                            {taskGroups.map((group, groupIndex) => (
                                <div
                                    className="parent-task-item"
                                    key={group.groupKey}
                                >
                                    <div className="parent-task-title">
                                        {groupIndex + 1}. {group.parentName}
                                        {group.jobCode && (
                                            <span className="badge bg-light text-secondary border ms-2">
                                                {group.jobCode}
                                            </span>
                                        )}
                                    </div>

                                    <div className="child-task-list">
                                        {group.children.map((child, childIndex) => {
                                            const status = statusConfig[child.status] ?? statusConfig.open

                                            return (
                                                <div
                                                    className="child-task-item"
                                                    key={child.id || childIndex}
                                                >
                                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                        <span className="child-task-name">
                                                            {child.taskName}
                                                        </span>

                                                        <div className="d-flex align-items-center gap-1 flex-wrap">
                                                            <span
                                                                className={`d-inline-flex align-items-center gap-1 px-2.5 py-1 ${status.className}`}
                                                                style={{ borderRadius: '6px', fontSize: '11px' }}
                                                            >
                                                                <i className={`bi ${status.icon}`} />
                                                                <span>{status.label}</span>
                                                            </span>

                                                            {child.progress_reports && child.progress_reports.length > 0 && (
                                                                child.progress_reports.map((pr) => (
                                                                    <Link
                                                                        key={`${pr.id ?? pr.nomor}`}
                                                                        to={pr.id ? `/progress-report/${pr.id}` : `/progress-report`}
                                                                        className="daily-progress-badge pr"
                                                                        style={{ fontSize: '10.5px', padding: '2px 6px' }}
                                                                        title={`Masuk ke Progress Report ${pr.nomor}`}
                                                                    >
                                                                        <i className="bi bi-journal-check me-1" />
                                                                        <span>{pr.nomor}</span>
                                                                    </Link>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Catatan Tugas */}
                                                    {child.catatan && (
                                                        <div className="task-notes-list mt-1">
                                                            <div className="task-note-item">
                                                                <i className="bi bi-chat-left-text me-1 text-muted" />
                                                                <span>{child.catatan}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Lampiran Gambar dan File */}
                                                    {renderAttachments(child.documents)}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Temuan / Findings Section */}
                {((detail.temuans && detail.temuans.length > 0) ||
                    (detail.findings && detail.findings.length > 0)) && (
                    <>
                        <hr className="report-card-divider" />
                        <div className="report-card-section">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <h3 className="section-title text-warning-emphasis mb-0">
                                    <i className="bi bi-exclamation-triangle me-2 text-warning" />
                                    Tindak Lanjut Temuan &amp; Finding Terkait
                                </h3>
                                <span className="badge bg-warning-subtle text-warning-emphasis border" style={{ fontSize: '11px' }}>
                                    {(detail.temuans?.length ?? 0) + (detail.findings?.length ?? 0)} Item
                                </span>
                            </div>

                            <div className="d-flex flex-column gap-2.5 mt-2">
                                {(detail.temuans ?? []).map((t) => (
                                    <div
                                        key={t.id}
                                        className="p-3 bg-light rounded border border-warning-subtle"
                                    >
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                            <div className="d-flex align-items-center gap-2">
                                                <strong>{t.nomor || `Temuan #${t.id}`}</strong>
                                                {t.priority && (
                                                    <span className="badge bg-light text-muted border" style={{ fontSize: '10.5px' }}>
                                                        Prioritas {t.priority}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="d-flex align-items-center gap-1.5">
                                                <span className={`badge ${t.status === 'selesai' ? 'bg-success' : t.status === 'pending' ? 'bg-warning text-dark' : 'bg-secondary'}`} style={{ fontSize: '11px' }}>
                                                    {t.status || 'open'}
                                                </span>
                                                {t.dp_followup && (
                                                    <span className={`badge ${t.dp_followup.status === 'selesai' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'}`} style={{ fontSize: '11px' }}>
                                                        DP: {t.dp_followup.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {t.notes && t.notes.length > 0 && (
                                            <div className="mb-2 ps-2 border-start border-2 border-warning-subtle">
                                                <div className="text-muted small fw-semibold">Uraian Temuan:</div>
                                                <ul className="mb-0 ps-3 text-secondary small">
                                                    {t.notes.map((n) => (
                                                        <li key={n.id}>{n.note}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {t.dp_followup && (
                                            <div className="p-2 rounded bg-white border border-success-subtle small">
                                                <div className="d-flex align-items-center gap-1 text-success fw-semibold mb-0.5">
                                                    <i className="bi bi-check2-circle" />
                                                    <span>Tindak Lanjut &amp; Solusi di Daily Progress:</span>
                                                </div>
                                                {t.dp_followup.solusi && (
                                                    <div className="text-dark ms-3">
                                                        <strong>Solusi: </strong>{t.dp_followup.solusi}
                                                    </div>
                                                )}
                                                {t.dp_followup.alasan_pending && (
                                                    <div className="text-warning-emphasis ms-3">
                                                        <strong>Alasan Pending: </strong>{t.dp_followup.alasan_pending}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {(detail.findings ?? []).map((f) => (
                                    <div
                                        key={f.id}
                                        className="p-3 bg-light rounded border"
                                    >
                                        <div className="d-flex align-items-center justify-content-between mb-1">
                                            <strong>Finding #{f.id}</strong>
                                            <div className="d-flex align-items-center gap-1">
                                                {f.nomor_pr && (
                                                    <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: '11px' }}>
                                                        {f.nomor_pr}
                                                    </span>
                                                )}
                                                <span className="badge bg-secondary" style={{ fontSize: '11px' }}>
                                                    {f.status || 'open'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="mb-0 small text-secondary">
                                            {f.keterangan}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default DailyProgressDetailPage
