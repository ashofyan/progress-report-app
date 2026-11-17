import {
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { temuanApi } from '@/features/temuan/api/temuanApi'

import {
    getTemuanPriority,
    TEMUAN_PRIORITY_LABELS,
    type Temuan,
    type TemuanComment,
    type TemuanFile,
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

const getAvatarStyle = (nameOrCode: string) => {
    const colors = [
        { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
        { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
        { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
        { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
        { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' },
        { bg: '#ffe4e6', color: '#be123c', border: '#fecdd3' },
        { bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' },
    ]
    let hash = 0
    for (let i = 0; i < nameOrCode.length; i++) {
        hash = nameOrCode.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

const isImageFile = (filename: string): boolean => {
    return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename)
}

const priorityLabels = TEMUAN_PRIORITY_LABELS

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

    const [activeTab, setActiveTab] = useState<'detail' | 'diskusi'>('detail')

    // Comments state
    const [comments, setComments] = useState<TemuanComment[]>([])
    const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false)
    const [noteCommentsInput, setNoteCommentsInput] = useState<Record<number, string>>({})
    const [submittingNoteId, setSubmittingNoteId] = useState<number | null>(null)
    const [generalCommentInput, setGeneralCommentInput] = useState<string>('')
    const [isSubmittingGeneralComment, setIsSubmittingGeneralComment] = useState<boolean>(false)
    const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)

    useEffect(() => {
        if (temuan === null) {
            queueMicrotask(() => {
                setDetail(null)
                setComments([])
                setActiveTab('detail')
                setNoteCommentsInput({})
                setGeneralCommentInput('')
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
    const displayPriority = getTemuanPriority(currentTemuan)

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

    const handleAddNoteComment = async (
        noteId: number,
        e?: FormEvent,
    ): Promise<void> => {
        if (e) e.preventDefault()
        const text = (noteCommentsInput[noteId] ?? '').trim()
        if (text === '') {
            return
        }

        setSubmittingNoteId(noteId)
        const payload = {
            comment: text,
            temuan_note_id: noteId,
        }

        const result = await temuanApi.storeComment(currentTemuan.id, payload)
        setSubmittingNoteId(null)

        if (result.success && result.data) {
            setComments((prev) => [...prev, result.data as TemuanComment])
            setNoteCommentsInput((prev) => ({ ...prev, [noteId]: '' }))
        } else {
            setErrorMessage(result.message)
        }
    }

    const handleAddGeneralComment = async (e?: FormEvent): Promise<void> => {
        if (e) e.preventDefault()
        const text = generalCommentInput.trim()
        if (text === '') {
            return
        }

        setIsSubmittingGeneralComment(true)
        const payload = {
            comment: text,
        }

        const result = await temuanApi.storeComment(currentTemuan.id, payload)
        setIsSubmittingGeneralComment(false)

        if (result.success && result.data) {
            setComments((prev) => [...prev, result.data as TemuanComment])
            setGeneralCommentInput('')
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

    const renderCommentBubble = (comment: TemuanComment) => {
        const isAuthor = Boolean(
            authEmployee &&
            ((authEmployee.employee_code &&
                authEmployee.employee_code === comment.created_by) ||
             (authEmployee.employee_name &&
                authEmployee.employee_name === comment.created_by_name)),
        )
        const authorName = comment.created_by_name || comment.created_by || 'User'
        const authorInitial =
            authorName
                .split(' ')
                .map((w) => w[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'U'
        const avatarStyle = getAvatarStyle(comment.created_by || authorName)

        return (
            <div
                key={comment.id}
                className={`discussion-comment-item ${isAuthor ? 'is-self' : ''}`}
            >
                <div
                    className="discussion-comment-avatar"
                    style={{
                        backgroundColor: isAuthor ? '#eff6ff' : avatarStyle.bg,
                        color: isAuthor ? '#2563eb' : avatarStyle.color,
                        borderColor: isAuthor ? '#bfdbfe' : avatarStyle.border,
                    }}
                    title={authorName}
                >
                    {authorInitial}
                </div>

                <div className="discussion-comment-content">
                    <div className="discussion-comment-header">
                        <div className="discussion-author-meta">
                            <span className="discussion-author-name">
                                {authorName}
                            </span>
                            {isAuthor && (
                                <span className="discussion-self-badge">
                                    Anda
                                </span>
                            )}
                            {comment.created_by_level !== undefined &&
                                comment.created_by_level !== null && (
                                    <span className="discussion-level-badge">
                                        Lvl {comment.created_by_level}
                                    </span>
                                )}
                            {comment.created_by && (
                                <span className="discussion-code-sub">
                                    ({comment.created_by})
                                </span>
                            )}
                        </div>

                        <div className="discussion-header-actions">
                            <span className="discussion-timestamp">
                                <i className="bi bi-clock me-1" />
                                {comment.created_at
                                    ? new Date(comment.created_at).toLocaleDateString(
                                          'id-ID',
                                          {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          },
                                      )
                                    : '-'}
                            </span>
                            {isAuthor && (
                                <button
                                    type="button"
                                    className="discussion-delete-btn"
                                    title="Hapus komentar ini"
                                    disabled={deletingCommentId === comment.id}
                                    onClick={() => void handleDeleteComment(comment.id)}
                                >
                                    {deletingCommentId === comment.id ? (
                                        <span className="spinner-border spinner-border-sm" />
                                    ) : (
                                        <i className="bi bi-trash3" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="discussion-comment-text">
                        {comment.comment}
                    </div>
                </div>
            </div>
        )
    }

    const generalComments = comments.filter((c) => !c.temuan_note_id)

    return (
        <div className="temuan-modal-backdrop">
            <div className="temuan-modal" style={{ maxWidth: '820px' }}>
                <div className="temuan-modal-header d-flex flex-column gap-2">
                    <div className="d-flex align-items-center justify-content-between w-100">
                        <div className="d-flex align-items-center gap-2">
                            <h2>Detail Temuan</h2>
                            <span className="badge bg-light text-secondary border">
                                {currentTemuan.nomor}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="temuan-modal-close"
                            onClick={onClose}
                            title="Tutup dialog"
                        >
                            <i className="bi bi-x-lg" />
                        </button>
                    </div>

                    <div className="temuan-modal-tabs">
                        <button
                            type="button"
                            className={`temuan-modal-tab-btn ${
                                activeTab === 'detail' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('detail')}
                        >
                            <i className="bi bi-file-earmark-text" />
                            <span>Detail &amp; Lampiran</span>
                        </button>
                        <button
                            type="button"
                            className={`temuan-modal-tab-btn ${
                                activeTab === 'diskusi' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('diskusi')}
                        >
                            <i className="bi bi-chat-dots-fill" />
                            <span>Diskusi</span>
                            {comments.length > 0 && (
                                <span className="badge rounded-pill bg-primary ms-1">
                                    {comments.length}
                                </span>
                            )}
                        </button>
                    </div>
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

                    {activeTab === 'detail' && (
                        <>
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
                                            className={`temuan-priority-badge p${displayPriority}`}
                                        >
                                            P{displayPriority} -{' '}
                                            {priorityLabels[displayPriority] ?? ''}
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

                                    {currentTemuan.type === 'PR' && (
                                        <div className="metadata-item">
                                            <span className="metadata-label">
                                                Progress Report
                                            </span>
                                            <span className="metadata-value">
                                                {currentTemuan.no_pr ??
                                                    currentTemuan.progress_report
                                                        ?.nomor ??
                                                    '-'}
                                                {currentTemuan.progress_report
                                                    ?.tanggal &&
                                                    ` (${currentTemuan.progress_report.tanggal})`}
                                            </span>
                                        </div>
                                    )}
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
                                                    <span
                                                        className={`temuan-priority-badge p${note.priority ?? 3}`}
                                                    >
                                                        P{note.priority ?? 3} -{' '}
                                                        {priorityLabels[note.priority ?? 3] ?? ''}
                                                    </span>
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
                        </>
                    )}

                    {activeTab === 'diskusi' && (
                        <div className="temuan-discussion-tab-content">
                            {isLoadingComments && (
                                <div className="temuan-state compact">
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Memuat diskusi...
                                </div>
                            )}

                            {/* Komentar Umum Legacy jika ada */}
                            {generalComments.length > 0 && (
                                <div className="temuan-note-discussion-card">
                                    <div className="note-discussion-header">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <i className="bi bi-chat-quote-fill text-secondary fs-5" />
                                                <span className="note-task-name">Komentar Umum</span>
                                            </div>
                                            <span className="note-comment-count-badge">
                                                <i className="bi bi-chat-text me-1" />
                                                {generalComments.length} Komentar
                                            </span>
                                        </div>
                                    </div>
                                    <div className="note-discussion-comments">
                                        <div className="discussion-comments-list">
                                            {generalComments.map(renderCommentBubble)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Diskusi per Note */}
                            {currentTemuan.notes.map((note, noteIdx) => {
                                const noteComments = comments.filter(
                                    (c) => c.temuan_note_id === note.id,
                                )

                                return (
                                    <div
                                        className="temuan-note-discussion-card"
                                        key={`diskusi-note-${note.id}`}
                                    >
                                        <div className="note-discussion-header">
                                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="note-number-badge">
                                                        Catatan #{noteIdx + 1}
                                                    </span>
                                                    <span className="note-task-name">
                                                        <i className="bi bi-list-task me-1 text-primary" />
                                                        {note.task?.task_name ?? `Task #${note.als_job_task_id}`}
                                                    </span>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span
                                                        className={`temuan-priority-badge p${note.priority ?? 3}`}
                                                    >
                                                        P{note.priority ?? 3} -{' '}
                                                        {priorityLabels[note.priority ?? 3] ?? ''}
                                                    </span>
                                                    <span className="note-comment-count-badge">
                                                        <i className="bi bi-chat-text me-1" />
                                                        {noteComments.length} Komentar
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="note-context-box">
                                                <div className="note-context-label">
                                                    <i className="bi bi-info-circle me-1 text-primary" />
                                                    Catatan Temuan:
                                                </div>
                                                <div className="note-context-text">{note.note}</div>
                                            </div>
                                        </div>

                                        <div className="note-discussion-comments">
                                            {noteComments.length === 0 ? (
                                                <div className="discussion-empty-placeholder">
                                                    <i className="bi bi-chat-left-dots" />
                                                    <span>Belum ada komentar pada catatan ini. Tulis tanggapan pertama di bawah.</span>
                                                </div>
                                            ) : (
                                                <div className="discussion-comments-list">
                                                    {noteComments.map(renderCommentBubble)}
                                                </div>
                                            )}
                                        </div>

                                        <form
                                            onSubmit={(e) => void handleAddNoteComment(note.id, e)}
                                            className="discussion-input-form"
                                        >
                                            <div className="discussion-input-wrapper">
                                                <textarea
                                                    className="form-control"
                                                    rows={2}
                                                    placeholder="Tulis tanggapan atau komentar terkait catatan ini..."
                                                    value={noteCommentsInput[note.id] ?? ''}
                                                    onChange={(e) =>
                                                        setNoteCommentsInput((prev) => ({
                                                            ...prev,
                                                            [note.id]: e.target.value,
                                                        }))
                                                    }
                                                />
                                                <div className="discussion-input-footer">
                                                    <span className="discussion-input-hint">
                                                        Berikan tanggapan untuk catatan temuan ini
                                                    </span>
                                                    <button
                                                        type="submit"
                                                        className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 px-3 py-1.5"
                                                        disabled={
                                                            submittingNoteId === note.id ||
                                                            !(noteCommentsInput[note.id]?.trim())
                                                        }
                                                    >
                                                        {submittingNoteId === note.id ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-1" />
                                                                <span>Mengirim...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-send-fill" />
                                                                <span>Kirim Balasan</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                )
                            })}

                            {currentTemuan.notes.length === 0 && (
                                <div className="temuan-note-discussion-card">
                                    <div className="note-discussion-header">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                                            <span className="note-task-name">
                                                <i className="bi bi-chat-dots me-1 text-primary" />
                                                Diskusi Temuan
                                            </span>
                                            <span className="note-comment-count-badge">
                                                <i className="bi bi-chat-text me-1" />
                                                {comments.length} Komentar
                                            </span>
                                        </div>
                                    </div>
                                    <div className="note-discussion-comments">
                                        {comments.length === 0 ? (
                                            <div className="discussion-empty-placeholder">
                                                <i className="bi bi-chat-left-dots" />
                                                <span>Belum ada komentar pada temuan ini. Mulai diskusi di bawah.</span>
                                            </div>
                                        ) : (
                                            <div className="discussion-comments-list">
                                                {comments.map(renderCommentBubble)}
                                            </div>
                                        )}
                                    </div>
                                    <form
                                        onSubmit={(e) => void handleAddGeneralComment(e)}
                                        className="discussion-input-form"
                                    >
                                        <div className="discussion-input-wrapper">
                                            <textarea
                                                className="form-control"
                                                rows={2}
                                                placeholder="Tulis tanggapan atau komentar..."
                                                value={generalCommentInput}
                                                onChange={(e) => setGeneralCommentInput(e.target.value)}
                                            />
                                            <div className="discussion-input-footer">
                                                <span className="discussion-input-hint">
                                                    Berikan tanggapan untuk temuan ini
                                                </span>
                                                <button
                                                    type="submit"
                                                    className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 px-3 py-1.5"
                                                    disabled={
                                                        isSubmittingGeneralComment ||
                                                        !generalCommentInput.trim()
                                                    }
                                                >
                                                    {isSubmittingGeneralComment ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-1" />
                                                            <span>Mengirim...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-send-fill" />
                                                            <span>Kirim Balasan</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default TemuanDetailModal
