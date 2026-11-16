import {
    useEffect,
    useState,
    type ChangeEvent,
} from 'react'

import { solusiApi } from '@/features/solusi/api/solusiApi'

import type {
    Solusi,
    SolusiFile,
} from '@/features/solusi/types/solusi.types'

interface SolusiDetailModalProps {
    solusi: Solusi | null
    onClose: () => void
}

const getFileUrl = (
    file: SolusiFile,
): string | null => {
    if (file.url !== undefined && file.url !== null) {
        return file.url
    }

    if (file.path === '') {
        return null
    }

    const storagePath = `/storage/${file.path}`
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

const isImageFile = (filename: string): boolean => {
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename)
}

const SolusiDetailModal = ({
                               solusi,
                               onClose,
                           }: SolusiDetailModalProps) => {
    const [detail, setDetail] =
        useState<Solusi | null>(null)
    const [isLoading, setIsLoading] =
        useState<boolean>(false)
    const [isUploading, setIsUploading] =
        useState<boolean>(false)
    const [deletingFileId, setDeletingFileId] =
        useState<number | null>(null)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    useEffect(() => {
        if (solusi === null) {
            queueMicrotask(() => {
                setDetail(null)
            })
            return
        }

        queueMicrotask(() => {
            const fetchDetail = async (): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result = await solusiApi.getById(solusi.id)

                setIsLoading(false)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setDetail(result.data)
                    return
                }

                setDetail(solusi)
                setErrorMessage(result.message)
            }

            void fetchDetail()
        })
    }, [solusi])

    if (solusi === null) {
        return null
    }

    const currentSolusi = detail ?? solusi

    const handleUpload = async (
        event: ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
        const files = Array.from(event.target.files ?? [])
        event.target.value = ''

        if (files.length === 0) {
            return
        }

        setIsUploading(true)
        setErrorMessage(null)

        const result =
            await solusiApi.uploadFiles(currentSolusi.id, files)

        setIsUploading(false)

        if (
            !result.success ||
            result.data === undefined
        ) {
            setErrorMessage(result.message)
            return
        }

        const uploadedFiles = result.data

        setDetail((previous) =>
            previous === null
                ? previous
                : {
                    ...previous,
                    files: [
                        ...(previous.files ?? []),
                        ...uploadedFiles,
                    ],
                },
        )
    }

    const handleDeleteFile = async (
        fileId: number,
    ): Promise<void> => {
        setDeletingFileId(fileId)
        setErrorMessage(null)

        const result =
            await solusiApi.deleteFile(currentSolusi.id, fileId)

        setDeletingFileId(null)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        setDetail((previous) =>
            previous === null
                ? previous
                : {
                    ...previous,
                    files: (previous.files ?? []).filter(
                        (file) => file.id !== fileId,
                    ),
                },
        )
    }

    return (
        <div className="temuan-modal-backdrop">
            <div className="temuan-modal">
                <div className="temuan-modal-header">
                    <h2>Detail Solusi</h2>

                    <button
                        type="button"
                        className="temuan-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="temuan-modal-body">
                    {isLoading && (
                        <div className="temuan-state compact">
                            Memuat detail...
                        </div>
                    )}

                    {errorMessage !== null && (
                        <div className="alert alert-danger">
                            {errorMessage}
                        </div>
                    )}

                    <div className="temuan-detail-header-card mb-4">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                            <div>
                                <h3 className="temuan-detail-number mb-1">
                                    Solusi #{currentSolusi.id}
                                </h3>
                                <span className="text-muted small">
                                    Temuan: <strong>{currentSolusi.temuan.nomor}</strong> &bull; {currentSolusi.temuan.tanggal}
                                </span>
                            </div>

                            <span
                                className={`solusi-source-badge source-${currentSolusi.source}`}
                            >
                                Source:{' '}
                                {currentSolusi.source === 'daily_progress'
                                    ? 'Daily Progress'
                                    : currentSolusi.source === 'progress_report'
                                    ? 'Progress Report'
                                    : 'Menu'}
                            </span>
                        </div>

                        <div className="temuan-metadata-grid">
                            <div className="metadata-item">
                                <span className="metadata-label">Client</span>
                                <span className="metadata-value">
                                    {currentSolusi.temuan.client_code}
                                </span>
                            </div>

                            <div className="metadata-item">
                                <span className="metadata-label">Nomor SPK</span>
                                <span className="metadata-value">
                                    {currentSolusi.temuan.spk?.no_spk ?? '-'}
                                </span>
                            </div>

                            <div className="metadata-item">
                                <span className="metadata-label">Pekerjaan / Jasa</span>
                                <span className="metadata-value">
                                    {currentSolusi.temuan.job?.description ?? '-'}
                                </span>
                            </div>

                            <div className="metadata-item">
                                <span className="metadata-label">Lampiran File</span>
                                <span className="metadata-value">
                                    {(currentSolusi.files ?? []).length} Dokumen
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="temuan-section">
                        <div className="temuan-section-heading">
                            <h3>Catatan Temuan</h3>
                        </div>
                        <div className="temuan-detail-note-card">
                            <strong className="note-task-title text-primary mb-1 d-block">
                                {currentSolusi.note.task?.task_name ??
                                    `Note #${currentSolusi.note.id}`}
                            </strong>
                            <div className="note-body-text">{currentSolusi.note.note}</div>
                        </div>
                    </div>

                    <div className="temuan-section">
                        <div className="temuan-section-heading">
                            <h3>Solusi Diberikan</h3>
                        </div>
                        <div className="solusi-solution-box">
                            <div className="solusi-box-header">
                                <i className="bi bi-check-circle-fill me-1" />
                                <span>Solusi Final</span>
                            </div>
                            <div className="solusi-box-content">{currentSolusi.solution}</div>
                        </div>
                    </div>

                    <div className="temuan-section">
                        <div className="temuan-section-heading">
                            <h3>File / Foto Bukti</h3>

                            <label className="temuan-upload-button">
                                <i className="bi bi-paperclip" />
                                <span>
                                    {isUploading
                                        ? 'Mengupload...'
                                        : 'Upload File'}
                                </span>
                                <input
                                    type="file"
                                    multiple
                                    disabled={isUploading}
                                    accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx"
                                    onChange={(event) =>
                                        void handleUpload(event)
                                    }
                                />
                            </label>
                        </div>

                        {(currentSolusi.files ?? []).length === 0 && (
                            <div className="temuan-file-empty">
                                Belum ada file atau foto bukti terlampir.
                            </div>
                        )}

                        {(currentSolusi.files ?? []).length > 0 && (
                            <div className="temuan-doc-preview-list">
                                {(currentSolusi.files ?? []).map((file) => {
                                    const url = getFileUrl(file)
                                    const isImg = isImageFile(file.original_name)

                                    return (
                                        <div
                                            className="temuan-doc-preview-item"
                                            key={file.id}
                                        >
                                            <div className="doc-info">
                                                {url !== null && isImg ? (
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title={`Lihat gambar: ${file.original_name}`}
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={file.original_name}
                                                            className="doc-thumb"
                                                        />
                                                    </a>
                                                ) : (
                                                    <div className="doc-icon-box">
                                                        <i className="bi bi-file-earmark-text" />
                                                    </div>
                                                )}

                                                <div className="d-flex flex-column min-w-0">
                                                    {url === null ? (
                                                        <span className="doc-title">
                                                            {file.original_name}
                                                        </span>
                                                    ) : (
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="doc-title"
                                                            title={`Unduh ${file.original_name}`}
                                                        >
                                                            {file.original_name}
                                                        </a>
                                                    )}
                                                    <span className="doc-size">
                                                        {Math.ceil(file.size / 1024)} KB
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="temuan-action-button delete"
                                                title="Hapus file"
                                                disabled={deletingFileId === file.id}
                                                onClick={() =>
                                                    void handleDeleteFile(file.id)
                                                }
                                            >
                                                {deletingFileId === file.id ? (
                                                    <span className="spinner-border spinner-border-sm" />
                                                ) : (
                                                    <i className="bi bi-trash3" />
                                                )}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="temuan-modal-footer">
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

export default SolusiDetailModal
