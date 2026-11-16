import {
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { temuanApi } from '@/features/temuan/api/temuanApi'

import type {
    Temuan,
    TemuanComment,
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

const isImageFile = (filename: string): boolean => {
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename)
}

const priorityLabels: Record<number, string> = {
    1: '1 - Sangat Rendah',
    2: '2 - Rendah',
    3: '3 - Sedang',
    4: '4 - Tinggi',
    5: '5 - Kritis',
}

const getSolutionText = (solution: unknown): string | null => {
    if (!solution) {
        return null
    }
    if (typeof solution === 'string') {
        const trimmed = solution.trim()
        return trimmed !== '' ? trimmed : null
    }
    if (
        typeof solution === 'object' &&
        'solution' in solution &&
        typeof (solution as { solution?: unknown }).solution === 'string'
    ) {
        const text = (solution as { solution: string }).solution.trim()
        return text !== '' ? text : null
    }
    return null
}

const getSolutionFiles = (solution: unknown): TemuanFile[] => {
    if (
        solution &&
        typeof solution === 'object' &&
        'files' in solution &&
        Array.isArray((solution as { files?: unknown }).files)
    ) {
        return (solution as { files: TemuanFile[] }).files
    }
    return []
}

const TemuanDetailModal = ({
                               temuan,
                               onClose,
                           }: TemuanDetailModalProps) => {
    const { employee: authEmployee } = useAuth()
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

    // Comments state
    const [comments, setComments] = useState<TemuanComment[]>([])
    const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false)
    const [newComment, setNewComment] = useState<string>('')
    const [selectedNoteId, setSelectedNoteId] = useState<number | ''>('')
    const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false)
    const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)

    useEffect(() => {
        if (temuan === null) {
            queueMicrotask(() => {
                setDetail(null)
                setComments([])
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
                    if (result.data.comments) {
                        setComments(result.data.comments)
                    }
                    return
                }

                setDetail(temuan)
                setErrorMessage(result.message)
            }

            const fetchComments = async (): Promise<void> => {
                setIsLoadingComments(true)
                const res = await temuanApi.getComments(temuan.id)
                setIsLoadingComments(false)
                if (res.success && res.data) {
                    setComments(res.data)
                }
            }

            void fetchDetail()
            void fetchComments()
        })
    }, [temuan])

    if (temuan === null) {
        return null
    }

    const currentTemuan = detail ?? temuan
    const isCompleted = currentTemuan.status === 'selesai'

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

    const handleAddComment = async (e: FormEvent): Promise<void> => {
        e.preventDefault()
        if (newComment.trim() === '') {
            return
        }

        setIsSubmittingComment(true)
        const payload = {
            comment: newComment.trim(),
            temuan_note_id: selectedNoteId === '' ? undefined : selectedNoteId,
        }

        const result = await temuanApi.storeComment(currentTemuan.id, payload)
        setIsSubmittingComment(false)

        if (result.success && result.data) {
            setComments((prev) => [...prev, result.data as TemuanComment])
            setNewComment('')
            setSelectedNoteId('')
        } else {
            setErrorMessage(result.message)
        }
    }

    const handleDeleteComment = async (commentId: number): Promise<void> => {
        setDeletingCommentId(commentId)
        const result = await temuanApi.destroyComment(currentTemuan.id, commentId)
        setDeletingCommentId(null)

        if (result.success) {
            setComments((prev) => prev.filter((c) => c.id !== commentId))
        } else {
            setErrorMessage(result.message)
        }
    }

    return (
        <div className="temuan-modal-backdrop">
            <div className="temuan-modal" style={{ maxWidth: '820px' }}>
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

                    <div className="temuan-detail-header-card mb-4">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                    <h3 className="temuan-detail-number mb-0">
                                        {currentTemuan.nomor}
                                    </h3>
                                    <span
                                        className={`temuan-type-badge ${
                                            currentTemuan.type === 'PR'
                                                ? 'type-pr'
                                                : 'type-tm'
                                        }`}
                                    >
                                        {currentTemuan.type ?? 'TM'}
                                    </span>
                                    {currentTemuan.no_pr && (
                                        <span className="temuan-pr-tag">
                                            {currentTemuan.no_pr}
                                        </span>
                                    )}
                                </div>
                                <span className="text-muted small">
                                    Dibuat oleh{' '}
                                    <strong>
                                        {currentTemuan.created_by_name ??
                                            currentTemuan.created_by}
                                    </strong>{' '}
                                    &bull; {currentTemuan.tanggal}
                                </span>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <span
                                    className={`temuan-priority-badge p${
                                        currentTemuan.priority ?? 3
                                    }`}
                                >
                                    P{currentTemuan.priority ?? 3} -{' '}
                                    {priorityLabels[
                                        currentTemuan.priority ?? 3
                                    ] ?? ''}
                                </span>
                                <span
                                    className={`temuan-status ${currentTemuan.status}`}
                                >
                                    {currentTemuan.status}
                                </span>
                            </div>
                        </div>

                        <div className="temuan-metadata-grid">
                            <div className="metadata-item">
                                <span className="metadata-label">Client</span>
                                <span className="metadata-value">
                                    {currentTemuan.client_code}
                                </span>
                            </div>

                            <div className="metadata-item">
                                <span className="metadata-label">
                                    Nomor SPK
                                </span>
                                <span className="metadata-value">
                                    {currentTemuan.spk?.no_spk ?? '-'}
                                </span>
                            </div>

                            <div className="metadata-item">
                                <span className="metadata-label">
                                    Pekerjaan / Jasa
                                </span>
                                <span className="metadata-value">
                                    {currentTemuan.job?.description ?? '-'}
                                </span>
                            </div>

                            <div className="metadata-item">
                                <span className="metadata-label">
                                    Total Catatan
                                </span>
                                <span className="metadata-value">
                                    {currentTemuan.notes.length} Catatan
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="temuan-section">
                        <div className="temuan-section-heading">
                            <h3>Catatan Temuan</h3>
                            <span className="badge bg-light text-muted border">
                                {currentTemuan.notes.length} Catatan
                            </span>
                        </div>

                        {currentTemuan.notes.length === 0 && (
                            <div className="temuan-state compact">
                                Tidak ada catatan.
                            </div>
                        )}

                        <div className="d-flex flex-column gap-2">
                            {currentTemuan.notes.map((note) => {
                                const solutionText = getSolutionText(note.solution)
                                const solutionFiles = getSolutionFiles(note.solution)

                                return (
                                    <div
                                        className="temuan-detail-note-card"
                                        key={note.id}
                                    >
                                        <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="bullet text-primary">&bull;</span>
                                                <strong className="note-task-title">
                                                    {note.task?.task_name ??
                                                        `Task #${note.als_job_task_id}`}
                                                </strong>
                                            </div>
                                        </div>
                                        <div className="note-body-text">{note.note}</div>
                                        {Boolean(solutionText) && (
                                            <div className="solusi-solution-box mt-2">
                                                <div className="solusi-box-header">
                                                    <i className="bi bi-check-circle-fill me-1" />
                                                    <span>Solusi:</span>
                                                </div>
                                                <div className="solusi-box-content">{solutionText}</div>
                                                {solutionFiles.length > 0 && (
                                                    <div className="temuan-doc-preview-list mt-2">
                                                        {solutionFiles.map((file) => {
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
                                                                                >
                                                                                    {file.original_name}
                                                                                </a>
                                                                            )}
                                                                            <span className="doc-size">
                                                                                {formatFileSize(file.size)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="temuan-section">
                        <div className="temuan-section-heading">
                            <h3>File / Foto Bukti</h3>

                            <label
                                className={`temuan-upload-button ${
                                    !isCompleted ? '' : 'disabled'
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
                                    disabled={isCompleted || isUploading}
                                    accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx"
                                    onChange={(event) =>
                                        void handleUpload(event)
                                    }
                                />
                            </label>
                        </div>

                        {currentTemuan.files.length === 0 && (
                            <div className="temuan-file-empty">
                                Belum ada file atau foto bukti terlampir.
                            </div>
                        )}

                        {currentTemuan.files.length > 0 && (
                            <div className="temuan-doc-preview-list">
                                {currentTemuan.files.map((file) => {
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
                                                        {formatFileSize(file.size)}
                                                    </span>
                                                </div>
                                            </div>

                                            {!isCompleted && (
                                                <button
                                                    type="button"
                                                    className="temuan-action-button delete"
                                                    title="Hapus file"
                                                    disabled={deletingFileId === file.id}
                                                    onClick={() => void handleDeleteFile(file.id)}
                                                >
                                                    {deletingFileId === file.id ? (
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
                        )}
                    </div>

                    {/* Diskusi / Komentar Temuan */}
                    <div className="temuan-comments-section">
                        <div className="comments-heading">
                            <h4>
                                <i className="bi bi-chat-dots-fill text-primary" />
                                <span>Diskusi &amp; Komentar Tim</span>
                            </h4>
                            <span className="badge bg-light text-muted border">
                                {comments.length} Komentar
                            </span>
                        </div>

                        {isLoadingComments && (
                            <div className="temuan-state compact">
                                Memuat diskusi...
                            </div>
                        )}

                        {!isLoadingComments && comments.length === 0 && (
                            <div className="temuan-file-empty mb-3">
                                Belum ada komentar pada temuan ini.
                            </div>
                        )}

                        {comments.length > 0 && (
                            <div className="comments-list">
                                {comments.map((comment) => {
                                    const isAuthor =
                                        authEmployee?.employee_code &&
                                        authEmployee.employee_code === comment.created_by
                                    const linkedNote = currentTemuan.notes.find(
                                        (n) => n.id === comment.temuan_note_id,
                                    )
                                    const authorInitial = (comment.created_by_name || comment.created_by || 'U')
                                        .slice(0, 2)
                                        .toUpperCase()

                                    return (
                                        <div
                                            key={comment.id}
                                            className={`comment-bubble-row ${isAuthor ? 'own' : ''}`}
                                        >
                                            <div className="comment-avatar" title={comment.created_by_name || comment.created_by}>
                                                {authorInitial}
                                            </div>

                                            <div className="comment-bubble">
                                                <div className="comment-meta">
                                                    <span className="author-name">
                                                        {comment.created_by_name || comment.created_by}
                                                    </span>
                                                    {comment.created_by_level && (
                                                        <span className="badge bg-secondary" style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                                                            Lvl {comment.created_by_level}
                                                        </span>
                                                    )}
                                                    {linkedNote && (
                                                        <span className="badge bg-light text-primary border" style={{ fontSize: '9.5px' }}>
                                                            Re: {linkedNote.task?.task_name ?? `Note #${linkedNote.id}`}
                                                        </span>
                                                    )}
                                                    <span className="comment-time ms-auto">
                                                        {comment.created_at ? new Date(comment.created_at).toLocaleDateString('id-ID', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        }) : '-'}
                                                    </span>
                                                    {isAuthor && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-link text-danger p-0 ms-1"
                                                            title="Hapus komentar"
                                                            disabled={deletingCommentId === comment.id}
                                                            onClick={() => void handleDeleteComment(comment.id)}
                                                        >
                                                            {deletingCommentId === comment.id ? (
                                                                <span className="spinner-border spinner-border-sm" />
                                                            ) : (
                                                                <i className="bi bi-trash" style={{ fontSize: '12px' }} />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="comment-body">
                                                    {comment.comment}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Form tambah komentar */}
                        <form onSubmit={(e) => void handleAddComment(e)} className="comment-input-box">
                            <div className="d-flex flex-column flex-grow-1 gap-2">
                                <select
                                    className="form-select form-select-sm"
                                    style={{ width: 'fit-content', minWidth: '220px' }}
                                    value={selectedNoteId}
                                    onChange={(e) =>
                                        setSelectedNoteId(
                                            e.target.value === ''
                                                ? ''
                                                : Number(e.target.value),
                                        )
                                    }
                                >
                                    <option value="">Komentar Umum (Seluruh Temuan)</option>
                                    {currentTemuan.notes.map((n) => (
                                        <option key={n.id} value={n.id}>
                                            Re: {n.task?.task_name ?? `Note #${n.id}`}
                                        </option>
                                    ))}
                                </select>

                                <textarea
                                    className="form-control"
                                    rows={2}
                                    placeholder="Tulis masukan, diskusi, atau tanggapan..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmittingComment || newComment.trim() === ''}
                            >
                                {isSubmittingComment ? (
                                    <span className="spinner-border spinner-border-sm" />
                                ) : (
                                    <>
                                        <i className="bi bi-send me-1" />
                                        <span>Kirim</span>
                                    </>
                                )}
                            </button>
                        </form>
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
