import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { progressReportApi } from '@/features/progress-report/api/progressReportApi'
import type {
    ProgressReport,
    ProgressReportDocument,
    ProgressReportStatus,
} from '@/features/progress-report/types/progress-report.types'

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

const formatIndoPeriode = (
    dateStr?: string | null,
    periodeAwal?: string | null,
    periodeAkhir?: string | null,
): string => {
    const target = periodeAwal || dateStr
    if (target) {
        const parts = target.slice(0, 10).split('-')
        if (parts.length >= 2) {
            const year = parts[0]
            const month = Number(parts[1]) - 1
            if (month >= 0 && month < 12) {
                return `${INDO_MONTHS[month]} - ${year}`
            }
        }
    }
    if (periodeAwal && periodeAkhir) {
        return `${periodeAwal} s/d ${periodeAkhir}`
    }
    return '-'
}

const getDocumentName = (
    document: ProgressReportDocument,
): string => {
    return document.original_name ?? document.path ?? 'Dokumen'
}

const getDocumentUrl = (
    document: ProgressReportDocument,
): string | null => {
    if (document.url !== undefined && document.url !== null && document.url !== '') {
        return document.url
    }

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

const isImageDocument = (document: ProgressReportDocument): boolean => {
    if (document.mime_type && document.mime_type.startsWith('image/')) {
        return true
    }
    const nameOrPath = (document.original_name ?? document.path ?? '').toLowerCase()
    return /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(nameOrPath)
}

const renderAttachments = (documents?: ProgressReportDocument[]) => {
    if (!documents || documents.length === 0) return null

    const images = documents.filter(isImageDocument)
    const nonImages = documents.filter((doc) => !isImageDocument(doc))

    return (
        <div className="task-attachments-container print-hide">
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

            {/* Lampiran Dokumen Non-Gambar (Link Dokumen) */}
            {nonImages.length > 0 && (
                <div className="task-document-links">
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
    childTaskName: string
    notes: string[]
    documents: ProgressReportDocument[]
    status?: ProgressReportStatus
}

interface TaskGroup {
    groupKey: string
    parentName: string
    children: GroupedTask[]
}

const ProgressReportDetailPage = () => {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const reportId = Number(id)

    const { employee: authEmployee } = useAuth()
    const { clients } = useMarketingClients()

    const [detail, setDetail] =
        useState<ProgressReport | null>(null)
    const [isLoading, setIsLoading] =
        useState<boolean>(true)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    useEffect(() => {
        if (!Number.isFinite(reportId) || reportId <= 0) {
            queueMicrotask(() => {
                setErrorMessage('ID Progress Report tidak valid.')
                setIsLoading(false)
            })
            return
        }

        queueMicrotask(() => {
            const fetchDetail = async (): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result =
                    await progressReportApi.getById(reportId)

                setIsLoading(false)

                if (!result.success || !result.data) {
                    setErrorMessage(
                        result.message ||
                            'Gagal memuat detail Progress Report.',
                    )
                    return
                }

                setDetail(result.data)
            }

            void fetchDetail()
        })
    }, [reportId])

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
        if (
            'created_by_name' in detail &&
            typeof (
                detail as unknown as {
                    created_by_name: unknown
                }
            ).created_by_name === 'string'
        ) {
            return (
                detail as unknown as {
                    created_by_name: string
                }
            ).created_by_name
        }
        if (
            authEmployee &&
            authEmployee.employee_code === detail.created_by
        ) {
            return authEmployee.employee_name
        }
        return detail.created_by || '-'
    }, [authEmployee, detail])

    const namaJasa = useMemo(() => {
        if (!detail) return '-'
        return (
            detail.job?.description ??
            detail.spk?.job?.description ??
            detail.spk?.note ??
            '-'
        )
    }, [detail])

    const taskGroups = useMemo((): TaskGroup[] => {
        if (!detail?.details || detail.details.length === 0) {
            return []
        }

        const groupsMap = new Map<string, TaskGroup>()

        detail.details.forEach((item) => {
            const hasParent =
                item.task.parent !== null &&
                item.task.parent.task_name.trim() !== ''

            const groupKey = hasParent
                ? `parent-${item.task.parent?.id ?? item.task.parent?.task_name}`
                : `single-${item.task.id}`

            const parentName = hasParent
                ? item.task.parent!.task_name
                : item.task.task_name

            const childTaskName = hasParent
                ? item.task.task_name
                : ''

            if (!groupsMap.has(groupKey)) {
                groupsMap.set(groupKey, {
                    groupKey,
                    parentName,
                    children: [],
                })
            }

            const currentGroup = groupsMap.get(groupKey)!

            const notes: string[] = []
            if (item.notes && item.notes.length > 0) {
                item.notes.forEach((note) => {
                    if (note.catatan.trim() !== '') {
                        notes.push(note.catatan.trim())
                    }
                })
            } else if (item.catatan && item.catatan.trim() !== '') {
                notes.push(item.catatan.trim())
            }

            currentGroup.children.push({
                childTaskName,
                notes,
                documents: item.documents ?? [],
                status: item.status,
            })
        })

        return Array.from(groupsMap.values())
    }, [detail])

    const handlePrint = (): void => {
        window.print()
    }

    if (isLoading) {
        return (
            <div className="progress-report-detail-page">
                <div className="progress-report-loading">
                    <div className="spinner-border text-primary" />
                    <span>Memuat detail Progress Report...</span>
                </div>
            </div>
        )
    }

    if (errorMessage !== null || detail === null) {
        return (
            <div className="progress-report-detail-page">
                <div className="alert alert-danger my-4" role="alert">
                    {errorMessage ??
                        'Progress Report tidak ditemukan.'}
                </div>
                <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => navigate('/progress-report')}
                >
                    <i className="bi bi-arrow-left me-1" />
                    Kembali
                </button>
            </div>
        )
    }

    return (
        <div className="progress-report-detail-page">
            {/* Top Toolbar */}
            <div className="progress-report-detail-topbar">
                <div className="progress-report-detail-topbar-left">
                    <button
                        type="button"
                        className="btn-back"
                        onClick={() => navigate('/progress-report')}
                    >
                        <i className="bi bi-arrow-left" />
                        <span>Kembali</span>
                    </button>
                    <h1 className="progress-report-detail-main-title">
                        Detail Progress Report
                    </h1>
                </div>

                <div className="progress-report-detail-topbar-right">
                    <button
                        type="button"
                        className="btn-print-action"
                        onClick={handlePrint}
                        title="Cetak Progress Report"
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

            {/* Document Card */}
            <div className="progress-report-document-card">
                {/* Header */}
                <div className="report-card-header">
                    <div className="report-card-title-group">
                        <h2 className="report-card-heading">
                            Progress Report
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
                        <span className="metadata-label">
                            Nama Jasa
                        </span>
                        <span className="metadata-value">
                            {namaJasa}
                        </span>
                    </div>

                    <div className="metadata-item">
                        <span className="metadata-label">
                            Nomor SPK
                        </span>
                        <span className="metadata-value">
                            {detail.spk?.no_spk ?? '-'}
                        </span>
                    </div>

                    <div className="metadata-item">
                        <span className="metadata-label">
                            Periode
                        </span>
                        <span className="metadata-value">
                            {formatIndoPeriode(
                                detail.tanggal,
                                null,
                                null,
                            )}
                        </span>
                    </div>
                </div>

                <hr className="report-card-divider" />

                {/* Pekerjaan / Tasks Section */}
                <div className="report-card-section">
                    {taskGroups.length === 0 ? (
                        <div className="text-muted fst-italic py-2">
                            Tidak ada pekerjaan yang dilaporkan.
                        </div>
                    ) : (
                        <div className="task-tree">
                            {taskGroups.map((group, groupIndex) => (
                                <div
                                    className="parent-task-item"
                                    key={group.groupKey}
                                >
                                    <div className="parent-task-title">
                                        {groupIndex + 1}.{' '}
                                        {group.parentName}
                                    </div>

                                    <div className="child-task-list">
                                        {group.children.map(
                                            (child, childIndex) => (
                                                <div
                                                    className="child-task-item"
                                                    key={childIndex}
                                                >
                                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                        {child.childTaskName !== '' ? (
                                                            <div className="child-task-title">
                                                                <span className="bullet">
                                                                    &bull;
                                                                </span>
                                                                <span>
                                                                    {
                                                                        child.childTaskName
                                                                    }
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div />
                                                        )}
                                                        {child.status && (
                                                            <span
                                                                className={`progress-report-status ${child.status}`}
                                                                style={{ fontSize: '11px', padding: '1px 8px' }}
                                                            >
                                                                {child.status === 'selesai' ? 'Selesai' : 'Pending'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {child.notes.length >
                                                        0 && (
                                                        <div className="task-note-list">
                                                            {child.notes.map(
                                                                (
                                                                    note,
                                                                    noteIndex,
                                                                ) => (
                                                                    <div
                                                                        className="task-note-item"
                                                                        key={
                                                                            noteIndex
                                                                        }
                                                                    >
                                                                        <span className="dash">
                                                                            -
                                                                        </span>
                                                                        <span className="note-text">
                                                                            {
                                                                                note
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Lampiran: Gambar / Link Dokumen (Hanya tampil di layar, disembunyikan saat cetak & export PDF) */}
                                                    {child.documents.length >
                                                        0 &&
                                                        renderAttachments(
                                                            child.documents,
                                                        )}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <hr className="report-card-divider" />

                {/* Temuan Section */}
                <div className="report-card-section">
                    <h3 className="section-heading">Temuan</h3>
                    {detail.findings && detail.findings.length > 0 ? (
                        <div className="task-tree">
                            <div className="parent-task-item">
                                <div className="child-task-list" style={{ paddingLeft: 0 }}>
                                    {detail.findings.map((finding) => (
                                        <div
                                            className="child-task-item mb-2"
                                            key={finding.id}
                                        >
                                            <div className="child-task-title">
                                                <span className="bullet">
                                                    &bull;
                                                </span>
                                                <strong>
                                                    {finding.source_type ===
                                                    'master'
                                                        ? finding
                                                            .master_task
                                                            ?.task_name ??
                                                          'Master Pekerjaan'
                                                        : finding
                                                            .additional_task
                                                            ?.task_name ??
                                                          'Additional Task'}
                                                </strong>
                                            </div>
                                            {finding.keterangan && (
                                                <div className="task-note-list">
                                                    <div className="task-note-item">
                                                        <span className="dash">
                                                            -
                                                        </span>
                                                        <span className="note-text">
                                                            {
                                                                finding.keterangan
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {finding.documents &&
                                                finding.documents.length > 0 &&
                                                renderAttachments(
                                                    finding.documents,
                                                )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ minHeight: '18px' }} />
                    )}
                </div>

                <hr className="report-card-divider" />

                {/* Informasi Lain Section */}
                <div className="report-card-section mb-0">
                    <h3 className="section-heading">
                        Informasi Lain
                    </h3>
                    {detail.notes && detail.notes.length > 0 ? (
                        <div className="task-note-list" style={{ paddingLeft: 0 }}>
                            {detail.notes.map((note) => (
                                <div
                                    className="task-note-item mb-2"
                                    key={note.id}
                                >
                                    <span className="dash">-</span>
                                    <span className="note-text">
                                        {note.judul ? (
                                            <strong>{note.judul}: </strong>
                                        ) : null}
                                        {note.catatan}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ minHeight: '18px' }} />
                    )}
                </div>

                {/* Dokumen Lampiran Tambahan (jika ada pada level laporan, disembunyikan saat cetak & export PDF) */}
                {detail.documents && detail.documents.length > 0 && (
                    <div className="report-attachments-section print-hide">
                        <hr className="report-card-divider" />
                        <div className="report-card-section mb-0">
                            <h3 className="section-heading">
                                Dokumen Lampiran
                            </h3>
                            <div style={{ paddingLeft: 0 }}>
                                {renderAttachments(detail.documents)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ProgressReportDetailPage
