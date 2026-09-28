import {
    useEffect,
    useState,
    type ChangeEvent,
} from 'react'

import { temuanApi } from '@/features/temuan/api/temuanApi'

import type {
    Temuan,
    TemuanFile,
} from '@/features/temuan/types/temuan.types'

interface TemuanDetailModalProps {
    temuan: Temuan | null
    onClose: () => void
}

const getFileUrl = (
    file: TemuanFile,
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

const formatFileSize = (
    size: number,
): string => `${Math.ceil(size / 1024)} KB`

const TemuanDetailModal = ({
                               temuan,
                               onClose,
                           }: TemuanDetailModalProps) => {
    const [detail, setDetail] =
        useState<Temuan | null>(null)
    const [isLoading, setIsLoading] =
        useState<boolean>(false)
    const [isUploading, setIsUploading] =
        useState<boolean>(false)
    const [deletingFileId, setDeletingFileId] =
        useState<number | null>(null)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    useEffect(() => {
        if (temuan === null) {
            queueMicrotask(() => {
                setDetail(null)
            })
            return
        }

        queueMicrotask(() => {
            const fetchDetail = async (): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result = await temuanApi.getById(temuan.id)

                setIsLoading(false)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setDetail(result.data)
                    return
                }

                setDetail(temuan)
                setErrorMessage(result.message)
            }

            void fetchDetail()
        })
    }, [temuan])

    if (temuan === null) {
        return null
    }

    const currentTemuan = detail ?? temuan
    const isOpen = currentTemuan.status === 'open'

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
            await temuanApi.uploadFiles(currentTemuan.id, files)

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
                        ...previous.files,
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
            await temuanApi.deleteFile(currentTemuan.id, fileId)

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
                    files: previous.files.filter(
                        (file) => file.id !== fileId,
                    ),
                },
        )
    }

    return (
        <div className="temuan-modal-backdrop">
            <div className="temuan-modal">
                <div className="temuan-modal-header">
                    <h2>Detail Temuan</h2>

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

                    <div className="row g-3 mb-3">
                        <div className="col-md-3">
                            <label className="form-label">Nomor</label>
                            <input
                                className="form-control"
                                value={currentTemuan.nomor}
                                readOnly
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Tanggal</label>
                            <input
                                className="form-control"
                                value={currentTemuan.tanggal}
                                readOnly
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Client</label>
                            <input
                                className="form-control"
                                value={currentTemuan.client_code}
                                readOnly
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Status</label>
                            <div>
                                <span
                                    className={`temuan-status ${currentTemuan.status}`}
                                >
                                    {currentTemuan.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="temuan-section">
                        <h3>Catatan Temuan</h3>

                        {currentTemuan.notes.length === 0 && (
                            <div className="temuan-state compact">
                                Tidak ada catatan.
                            </div>
                        )}

                        {currentTemuan.notes.map((note) => (
                            <div
                                className="temuan-note-card"
                                key={note.id}
                            >
                                <strong>
                                    {note.task?.task_name ??
                                        `Task #${note.als_job_task_id}`}
                                </strong>
                                <p>{note.note}</p>
                            </div>
                        ))}
                    </div>

                    <div className="temuan-section">
                        <div className="temuan-section-heading">
                            <h3>File</h3>

                            <label
                                className={`temuan-upload-button ${
                                    isOpen ? '' : 'disabled'
                                }`}
                            >
                                <i className="bi bi-paperclip" />
                                <span>
                                    {isUploading
                                        ? 'Mengupload...'
                                        : 'Upload File'}
                                </span>
                                <input
                                    type="file"
                                    multiple
                                    disabled={!isOpen || isUploading}
                                    accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx"
                                    onChange={(event) =>
                                        void handleUpload(event)
                                    }
                                />
                            </label>
                        </div>

                        {currentTemuan.files.length === 0 && (
                            <div className="temuan-file-empty">
                                Belum ada file.
                            </div>
                        )}

                        {currentTemuan.files.map((file) => {
                            const url = getFileUrl(file)

                            return (
                                <div
                                    className="temuan-file-row"
                                    key={file.id}
                                >
                                    <div>
                                        {url === null ? (
                                            <strong>
                                                {file.original_name}
                                            </strong>
                                        ) : (
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {file.original_name}
                                            </a>
                                        )}
                                        <span>
                                            {formatFileSize(file.size)}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="temuan-action-button delete"
                                        title="Hapus file"
                                        disabled={
                                            !isOpen ||
                                            deletingFileId === file.id
                                        }
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

export default TemuanDetailModal
