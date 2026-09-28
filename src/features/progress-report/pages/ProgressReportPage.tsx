import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { progressReportApi } from '@/features/progress-report/api/progressReportApi'
import type {
    ProgressReport,
    ProgressReportDetail,
    ProgressReportDocument,
    ProgressReportMeta,
    ProgressReportNote,
    ProgressReportStatus,
    ProgressReportSummary,
} from '@/features/progress-report/types/progress-report.types'

import '@/features/progress-report/styles/progress-report.scss'

const statusLabels: Record<
    ProgressReportStatus,
    string
> = {
    pending: 'Pending',
    selesai: 'Selesai',
}

const defaultMeta: ProgressReportMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
}

const getNotesText = (
    notes: ProgressReportNote[] | undefined,
): string | null => {
    if (notes !== undefined && notes.length > 0) {
        const text = notes
            .map((note) => note.catatan.trim())
            .filter((note) => note !== '')

        return text.length === 0 ? null : text.join('\n')
    }

    return null
}

const getDetailNotesText = (
    detail: ProgressReportDetail,
): string | null => {
    return getNotesText(detail.notes)
}

const formatDocumentSize = (
    size: number | undefined,
): string => {
    if (size === undefined) {
        return '-'
    }

    if (size < 1024) {
        return `${size} B`
    }

    if (size < 1024 * 1024) {
        return `${Math.ceil(size / 1024)} KB`
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const getDocumentName = (
    document: ProgressReportDocument,
): string => {
    return document.original_name ?? document.path ?? 'Dokumen'
}

const getDocumentUrl = (
    document: ProgressReportDocument,
): string | null => {
    if (document.url !== undefined) {
        return document.url
    }

    if (document.path === undefined) {
        return null
    }

    const storagePath = `/storage/${document.path}`
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

const isImageDocument = (
    document: ProgressReportDocument,
): boolean => {
    if (document.mime_type?.startsWith('image/') === true) {
        return true
    }

    return /\.(jpe?g|png|webp)$/i.test(
        document.original_name ?? document.path ?? '',
    )
}

interface ProgressReportDocumentListProps {
    documents: ProgressReportDocument[]
    emptyText?: string
    deletingDocumentIds?: Set<number>
    onDelete?: (document: ProgressReportDocument) => void
}

const ProgressReportDocumentList = ({
                                        documents,
                                        emptyText = 'Belum ada dokumen.',
                                        deletingDocumentIds,
                                        onDelete,
                                    }: ProgressReportDocumentListProps) => {
    if (documents.length === 0) {
        return (
            <div className="progress-report-document-empty">
                {emptyText}
            </div>
        )
    }

    return (
        <div className="progress-report-document-list">
            {documents.map((document) => {
                const url = getDocumentUrl(document)
                const name = getDocumentName(document)
                const isImage = isImageDocument(document)

                return (
                    <div
                        className="progress-report-document-row"
                        key={document.id}
                    >
                        <div className="d-flex align-items-center gap-2 flex-row flex-grow-1 min-w-0">
                            {url !== null && isImage ? (
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-shrink-0"
                                    title={`Buka gambar ${name}`}
                                >
                                    <img
                                        src={url}
                                        alt={name}
                                        style={{
                                            width: '42px',
                                            height: '42px',
                                            objectFit: 'cover',
                                            borderRadius: '6px',
                                            border: '1px solid #edf0f4',
                                        }}
                                    />
                                </a>
                            ) : (
                                <div
                                    className="flex-shrink-0 d-flex align-items-center justify-content-center bg-light text-secondary rounded"
                                    style={{
                                        width: '42px',
                                        height: '42px',
                                        border: '1px solid #edf0f4',
                                    }}
                                >
                                    <i className="bi bi-file-earmark-text fs-5" />
                                </div>
                            )}

                            <div className="d-flex flex-column min-w-0">
                                {url === null ? (
                                    <strong title={name}>
                                        {name}
                                    </strong>
                                ) : (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={`Buka file ${name}`}
                                    >
                                        {name}
                                    </a>
                                )}
                                <span>
                                    {formatDocumentSize(
                                        document.size,
                                    )}
                                </span>
                            </div>
                        </div>

                        {onDelete !== undefined && (
                            <button
                                type="button"
                                className="progress-report-action-button flex-shrink-0"
                                title="Hapus dokumen"
                                disabled={deletingDocumentIds?.has(
                                    document.id,
                                )}
                                onClick={() => onDelete(document)}
                            >
                                {deletingDocumentIds?.has(
                                    document.id,
                                ) === true ? (
                                    <span className="spinner-border spinner-border-sm" />
                                ) : (
                                    <i className="bi bi-trash" />
                                )}
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

interface ProgressReportDetailModalProps {
    report: ProgressReportSummary | null
    onClose: () => void
}

const ProgressReportDetailModal = ({
                                       report,
                                       onClose,
                                   }: ProgressReportDetailModalProps) => {
    const [detail, setDetail] =
        useState<ProgressReport | null>(null)

    const [isLoading, setIsLoading] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const [deletingDocumentIds, setDeletingDocumentIds] =
        useState<Set<number>>(new Set())

    useEffect(() => {
        if (report === null) {
            queueMicrotask(() => {
                setDetail(null)
                setDeletingDocumentIds(new Set())
            })
            return
        }

        const fetchDetail = async (): Promise<void> => {
            setIsLoading(true)
            setErrorMessage(null)

            const result =
                await progressReportApi.getById(report.id)

            if (
                result.success &&
                result.data !== undefined
            ) {
                setDetail(result.data)
                setIsLoading(false)
                return
            }

            setDetail(null)
            setErrorMessage(result.message)
            setIsLoading(false)
        }

        void fetchDetail()
    }, [report])

    const setDocumentDeleting = (
        documentId: number,
        isDeleting: boolean,
    ): void => {
        setDeletingDocumentIds((previous) => {
            const next = new Set(previous)

            if (isDeleting) {
                next.add(documentId)
            } else {
                next.delete(documentId)
            }

            return next
        })
    }

    const handleDeleteGeneralDocument = async (
        document: ProgressReportDocument,
    ): Promise<void> => {
        if (
            detail === null ||
            !window.confirm('Hapus dokumen ini?')
        ) {
            return
        }

        setDocumentDeleting(document.id, true)

        const result = await progressReportApi.deleteDocument(
            detail.id,
            document.id,
        )

        setDocumentDeleting(document.id, false)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        setDetail((current) =>
            current === null
                ? current
                : {
                    ...current,
                    documents: (current.documents ?? []).filter(
                        (item) => item.id !== document.id,
                    ),
                },
        )
    }

    const handleDeleteDetailDocument = async (
        detailId: number,
        document: ProgressReportDocument,
    ): Promise<void> => {
        if (
            detail === null ||
            !window.confirm('Hapus dokumen ini?')
        ) {
            return
        }

        setDocumentDeleting(document.id, true)

        const result =
            await progressReportApi.deleteDetailDocument(
                detail.id,
                detailId,
                document.id,
            )

        setDocumentDeleting(document.id, false)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        setDetail((current) =>
            current === null
                ? current
                : {
                    ...current,
                    details: current.details.map((item) =>
                        item.id !== detailId
                            ? item
                            : {
                                ...item,
                                documents: (
                                    item.documents ?? []
                                ).filter(
                                    (documentItem) =>
                                        documentItem.id !==
                                        document.id,
                                ),
                            },
                    ),
                },
        )
    }

    const handleDeleteFindingDocument = async (
        findingId: number,
        document: ProgressReportDocument,
    ): Promise<void> => {
        if (
            detail === null ||
            !window.confirm('Hapus dokumen ini?')
        ) {
            return
        }

        setDocumentDeleting(document.id, true)

        const result =
            await progressReportApi.deleteFindingDocument(
                detail.id,
                findingId,
                document.id,
            )

        setDocumentDeleting(document.id, false)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        setDetail((current) =>
            current === null
                ? current
                : {
                    ...current,
                    findings: current.findings.map((item) =>
                        item.id !== findingId
                            ? item
                            : {
                                ...item,
                                documents: (
                                    item.documents ?? []
                                ).filter(
                                    (documentItem) =>
                                        documentItem.id !==
                                        document.id,
                                ),
                            },
                    ),
                },
        )
    }

    if (report === null) {
        return null
    }

    return (
        <div className="progress-report-modal-backdrop">
            <div className="progress-report-modal">
                <div className="progress-report-modal-header">
                    <h2 className="progress-report-title">
                        Detail Progress Report
                    </h2>

                    <button
                        type="button"
                        className="progress-report-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="progress-report-modal-body">
                    {isLoading && (
                        <div className="progress-report-loading">
                            <div className="spinner-border" />
                            <span>Memuat detail...</span>
                        </div>
                    )}

                    {!isLoading &&
                        errorMessage !== null && (
                            <div className="progress-report-state error">
                                {errorMessage}
                            </div>
                        )}

                    {!isLoading &&
                        errorMessage === null &&
                        detail !== null && (
                            <>
                                <div className="row g-3 mb-3">
                                    <div className="col-md-3">
                                        <label className="form-label">
                                            Nomor
                                        </label>
                                        <input
                                            className="form-control"
                                            value={detail.nomor}
                                            readOnly
                                        />
                                    </div>

                                    <div className="col-md-3">
                                        <label className="form-label">
                                            Tanggal
                                        </label>
                                        <input
                                            className="form-control"
                                            value={detail.tanggal}
                                            readOnly
                                        />
                                    </div>

                                    <div className="col-md-3">
                                        <label className="form-label">
                                            Client
                                        </label>
                                        <input
                                            className="form-control"
                                            value={
                                                detail.client_code
                                            }
                                            readOnly
                                        />
                                    </div>

                                    <div className="col-md-3">
                                        <label className="form-label">
                                            SPK
                                        </label>
                                        <input
                                            className="form-control"
                                            value={
                                                detail.spk.no_spk
                                            }
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div className="progress-report-section">
                                    <h3 className="progress-report-section-title">
                                        Catatan Umum
                                    </h3>

                                    {getNotesText(
                                        detail.notes,
                                    ) === null ? (
                                        <div className="progress-report-state">
                                            Tidak ada catatan umum.
                                        </div>
                                    ) : (
                                        <div className="progress-report-detail-card">
                                            <p className="mb-0">
                                                {getNotesText(
                                                    detail.notes,
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="progress-report-section">
                                    <h3 className="progress-report-section-title">
                                        Dokumen Umum
                                    </h3>

                                    <ProgressReportDocumentList
                                        documents={
                                            detail.documents ?? []
                                        }
                                        deletingDocumentIds={
                                            deletingDocumentIds
                                        }
                                        onDelete={(document) => {
                                            void handleDeleteGeneralDocument(
                                                document,
                                            )
                                        }}
                                    />
                                </div>

                                <div className="progress-report-section">
                                    <h3 className="progress-report-section-title">
                                        Detail Task
                                    </h3>

                                    {detail.details.length ===
                                        0 && (
                                        <div className="progress-report-state">
                                            Tidak ada detail task.
                                        </div>
                                    )}

                                    {detail.details.map(
                                        (item) => (
                                            <div
                                                className="progress-report-detail-card"
                                                key={item.id}
                                            >
                                                <div className="progress-report-task-title">
                                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                                        <strong>
                                                            {item.task
                                                                .parent
                                                                ?.task_name ??
                                                                'Task'}
                                                            {' / '}
                                                            {
                                                                item.task
                                                                    .task_name
                                                            }
                                                        </strong>
                                                        <span
                                                            className={`progress-report-status ${item.status}`}
                                                        >
                                                            {
                                                                statusLabels[
                                                                    item
                                                                        .status
                                                                ]
                                                            }
                                                        </span>
                                                    </div>

                                                    {item.daily_progress_detail_id !==
                                                        undefined && (
                                                        <span
                                                            className="text-muted"
                                                            style={{
                                                                fontSize:
                                                                    '11.5px',
                                                            }}
                                                        >
                                                            Daily Progress Detail
                                                            #{' '}
                                                            {
                                                                item.daily_progress_detail_id
                                                            }
                                                        </span>
                                                    )}

                                                    {getDetailNotesText(
                                                        item,
                                                    ) !== null && (
                                                        <div
                                                            className="mt-1"
                                                            style={{
                                                                fontSize:
                                                                    '12px',
                                                                color: '#4b5563',
                                                            }}
                                                        >
                                                            <strong>
                                                                Catatan:
                                                            </strong>{' '}
                                                            {getDetailNotesText(
                                                                item,
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="mt-2">
                                                        <div
                                                            className="d-flex align-items-center gap-1 text-muted mb-1"
                                                            style={{
                                                                fontSize:
                                                                    '11.5px',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            <i className="bi bi-paperclip" />
                                                            <span>
                                                                Dokumen (
                                                                {item
                                                                    .documents
                                                                    ?.length ??
                                                                    0}
                                                                ):
                                                            </span>
                                                        </div>
                                                        <ProgressReportDocumentList
                                                            documents={
                                                                item.documents ??
                                                                []
                                                            }
                                                            emptyText="Tidak ada dokumen terlampir pada detail ini."
                                                            deletingDocumentIds={
                                                                deletingDocumentIds
                                                            }
                                                            onDelete={(
                                                                document,
                                                            ) => {
                                                                void handleDeleteDetailDocument(
                                                                    item.id,
                                                                    document,
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <div className="progress-report-section">
                                    <h3 className="progress-report-section-title">
                                        Temuan
                                    </h3>

                                    {detail.findings.length ===
                                        0 && (
                                        <div className="progress-report-state">
                                            Tidak ada temuan.
                                        </div>
                                    )}

                                    {detail.findings.map(
                                        (finding) => (
                                            <div
                                                className="progress-report-detail-card"
                                                key={finding.id}
                                            >
                                                <div className="progress-report-task-title">
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
                                                    <span>
                                                        {
                                                            finding.keterangan
                                                        }
                                                    </span>
                                                    <ProgressReportDocumentList
                                                        documents={
                                                            finding.documents ??
                                                            []
                                                        }
                                                        deletingDocumentIds={
                                                            deletingDocumentIds
                                                        }
                                                        onDelete={(
                                                            document,
                                                        ) => {
                                                            void handleDeleteFindingDocument(
                                                                finding.id,
                                                                document,
                                                            )
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </>
                        )}
                </div>

                <div className="progress-report-modal-footer">
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

const ProgressReportPage = () => {
    const navigate = useNavigate()

    const [reports, setReports] =
        useState<ProgressReportSummary[]>([])

    const [meta, setMeta] =
        useState<ProgressReportMeta>(defaultMeta)

    const [searchQuery, setSearchQuery] =
        useState<string>('')

    const [currentPage, setCurrentPage] =
        useState<number>(1)

    const [isLoading, setIsLoading] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const [selectedReport, setSelectedReport] =
        useState<ProgressReportSummary | null>(null)

    const filters = useMemo(
        () => ({
            search:
                searchQuery.trim() === ''
                    ? undefined
                    : searchQuery.trim(),
            page: currentPage,
            per_page: 20,
        }),
        [
            currentPage,
            searchQuery,
        ],
    )

    const fetchReports = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setErrorMessage(null)

        const result =
            await progressReportApi.getAll(filters)

        if (
            result.success &&
            result.data !== undefined
        ) {
            setReports(result.data)
            setMeta(result.meta ?? defaultMeta)
            setIsLoading(false)
            return
        }

        setReports([])
        setMeta(defaultMeta)
        setErrorMessage(result.message)
        setIsLoading(false)
    }, [filters])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchReports()
        }, 250)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [fetchReports])

    const handleSearchChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        setSearchQuery(event.target.value)
        setCurrentPage(1)
    }

    return (
        <div className="progress-report-page">
            <div className="progress-report-heading">
                <h1 className="progress-report-title">
                    Progress Report
                </h1>

                <div className="progress-report-breadcrumb">
                    <span className="active">
                        Progress
                    </span>
                    <span>/</span>
                    <span>Progress Report</span>
                </div>
            </div>

            <section className="progress-report-board">
                <div className="progress-report-board-header">
                    <div className="progress-report-search">
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Cari progress report..."
                            onChange={handleSearchChange}
                        />
                    </div>

                    <button
                        type="button"
                        className="progress-report-add-button"
                        onClick={() =>
                            navigate('/progress-report/tambah')
                        }
                    >
                        <i className="bi bi-plus-lg" />
                        <span>Tambah</span>
                    </button>
                </div>

                {isLoading && (
                    <div className="progress-report-loading">
                        <div className="spinner-border" />
                        <span>Memuat data...</span>
                    </div>
                )}

                {!isLoading &&
                    errorMessage !== null && (
                        <div className="progress-report-error">
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
                                    void fetchReports()
                                }
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    reports.length === 0 && (
                        <div className="progress-report-empty">
                            <i className="bi bi-inbox" />
                            <span>
                                Belum ada progress report.
                            </span>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    reports.length > 0 && (
                        <div className="table-responsive">
                            <table className="table progress-report-table">
                                <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Nomor</th>
                                    <th>Tanggal</th>
                                    <th>Client</th>
                                    <th>SPK</th>
                                    <th>Pekerjaan</th>
                                    <th>Task</th>
                                    <th>Temuan</th>
                                    <th>Catatan</th>
                                    <th>Dokumen</th>
                                    <th className="text-center">
                                        Aksi
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {reports.map(
                                    (report, index) => (
                                        <tr
                                            key={report.id}
                                            className="progress-report-clickable-row"
                                            onClick={() =>
                                                setSelectedReport(
                                                    report,
                                                )
                                            }
                                        >
                                            <td>
                                                {index + 1}
                                            </td>
                                            <td>
                                                <strong>
                                                    {
                                                        report.nomor
                                                    }
                                                </strong>
                                            </td>
                                            <td>
                                                {report.tanggal}
                                            </td>
                                            <td>
                                                {
                                                    report.client_code
                                                }
                                            </td>
                                            <td>
                                                {
                                                    report.spk
                                                        .no_spk
                                                }
                                            </td>
                                            <td>
                                                {
                                                    report.job
                                                        .description
                                                }
                                            </td>
                                            <td>
                                                {
                                                    report.total_task
                                                }
                                            </td>
                                            <td>
                                                {
                                                    report.total_temuan
                                                }
                                            </td>
                                            <td>
                                                {
                                                    report.total_catatan
                                                }
                                            </td>
                                            <td>
                                                {
                                                    report.total_dokumen
                                                }
                                            </td>
                                            <td>
                                                <div className="progress-report-row-actions">
                                                    <button
                                                        type="button"
                                                        className="progress-report-action-button"
                                                        title="Lihat"
                                                        onClick={(
                                                            event,
                                                        ) => {
                                                            event.stopPropagation()
                                                            setSelectedReport(
                                                                report,
                                                            )
                                                        }}
                                                    >
                                                        <i className="bi bi-eye" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    reports.length > 0 && (
                        <div className="progress-report-pagination">
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    setCurrentPage((previous) =>
                                        Math.max(
                                            1,
                                            previous - 1,
                                        ),
                                    )
                                }
                            >
                                <i className="bi bi-caret-left-fill" />
                            </button>

                            <span className="progress-report-page-info">
                                {meta.current_page} /{' '}
                                {meta.last_page}
                            </span>

                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={
                                    currentPage >= meta.last_page
                                }
                                onClick={() =>
                                    setCurrentPage((previous) =>
                                        Math.min(
                                            meta.last_page,
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

            <ProgressReportDetailModal
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
            />
        </div>
    )
}

export default ProgressReportPage
