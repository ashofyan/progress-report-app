import {
    useEffect,
    useState,
    type FormEvent,
} from 'react'
import {
    useNavigate,
    useParams,
} from 'react-router-dom'

import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import type {
    DailyProgress,
    DailyProgressDocument,
} from '@/features/daily-progress/types/daily-progress.types'

import '@/features/daily-progress/styles/daily-progress.scss'

interface NoteFormData {
    text: string
    file: File | null
}

interface DetailFormData {
    id: number
    label: string
    isChecked: boolean
    isAlreadyCompleted: boolean
    isMasterSubtask: boolean
    notes: NoteFormData[]
    documents: DailyProgressDocument[]
}

const getTodayDate = (): string => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

const getDetailLabel = (
    detail: DailyProgress['details'][number],
): string => {
    const taskName =
        detail.task?.task_name ?? 'Task'

    const parentName =
        detail.task?.parent?.task_name

    if (parentName === undefined || parentName === null) {
        return taskName
    }

    return `${parentName} / ${taskName}`
}

const getNotes = (
    catatan: string | null,
): NoteFormData[] => {
    if (catatan === null || catatan.trim() === '') {
        return [
            {
                text: '',
                file: null,
            },
        ]
    }

    return catatan
        .split('\n')
        .filter((note) => note.trim() !== '')
        .map((note) => ({
            text: note,
            file: null,
        }))
}

const DailyProgressEditPage = () => {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()

    const [progress, setProgress] =
        useState<DailyProgress | null>(null)

    const [details, setDetails] =
        useState<DetailFormData[]>([])

    const [isLoading, setIsLoading] =
        useState<boolean>(true)

    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)

    const [deletingDocumentId, setDeletingDocumentId] =
        useState<number | null>(null)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    useEffect(() => {
        queueMicrotask(() => {
            const fetchProgress =
                async (): Promise<void> => {
                    const progressId = Number(id)

                    if (
                        id === undefined ||
                        Number.isNaN(progressId)
                    ) {
                        setErrorMessage(
                            'ID Daily Progress tidak valid.',
                        )
                        setIsLoading(false)
                        return
                    }

                    setIsLoading(true)
                    setErrorMessage(null)

                    const result =
                        await dailyProgressApi.getById(
                            progressId,
                        )

                    setIsLoading(false)

                    if (
                        !result.success ||
                        result.data === undefined
                    ) {
                        setProgress(null)
                        setDetails([])
                        setErrorMessage(result.message)
                        return
                    }

                    setProgress(result.data)
                    setDetails(
                        result.data.details.map((detail) => {
                            const isMasterSubtask =
                                detail.als_job_task_id !== null ||
                                (detail.task !== null &&
                                    detail.task !== undefined &&
                                    detail.task.parent !== undefined &&
                                    detail.task.parent !== null)
                            const isAlreadyCompleted =
                                detail.status === 'selesai'

                            return {
                                id: detail.id,
                                label: getDetailLabel(detail),
                                isChecked: isAlreadyCompleted,
                                isAlreadyCompleted,
                                isMasterSubtask,
                                notes: getNotes(detail.catatan),
                                documents:
                                    detail.documents ?? [],
                            }
                        }),
                    )
                }

            void fetchProgress()
        })
    }, [id])

    const isTodayProgress =
        progress?.tanggal === getTodayDate()

    const handleToggleDetail = (
        detailId: number,
    ): void => {
        if (!isTodayProgress) {
            return
        }

        setDetails((previous) =>
            previous.map((item) => {
                if (item.id !== detailId) {
                    return item
                }

                // Jika subtask dari master task statusnya sudah selesai, batasi dengan tidak dapat di unchecklist
                if (
                    item.isMasterSubtask &&
                    item.isAlreadyCompleted
                ) {
                    return item
                }

                return {
                    ...item,
                    isChecked: !item.isChecked,
                }
            }),
        )
    }

    const handleAddNote = (detailId: number): void => {
        if (!isTodayProgress) {
            return
        }

        setDetails((previous) =>
            previous.map((item) =>
                item.id === detailId
                    ? {
                        ...item,
                        notes: [
                            ...item.notes,
                            {
                                text: '',
                                file: null,
                            },
                        ],
                    }
                    : item,
            ),
        )
    }

    const handleNoteChange = (
        detailId: number,
        noteIndex: number,
        text: string,
    ): void => {
        if (!isTodayProgress) {
            return
        }

        setDetails((previous) =>
            previous.map((item) => {
                if (item.id !== detailId) {
                    return item
                }

                const updatedNotes = [...item.notes]

                updatedNotes[noteIndex] = {
                    ...updatedNotes[noteIndex],
                    text,
                }

                return {
                    ...item,
                    notes: updatedNotes,
                }
            }),
        )
    }

    const handleNoteFileChange = (
        detailId: number,
        noteIndex: number,
        file: File | null,
    ): void => {
        if (!isTodayProgress) {
            return
        }

        setDetails((previous) =>
            previous.map((item) => {
                if (item.id !== detailId) {
                    return item
                }

                const updatedNotes = [...item.notes]

                updatedNotes[noteIndex] = {
                    ...updatedNotes[noteIndex],
                    file,
                }

                return {
                    ...item,
                    notes: updatedNotes,
                }
            }),
        )
    }

    const handleRemoveNote = (
        detailId: number,
        noteIndex: number,
    ): void => {
        if (!isTodayProgress) {
            return
        }

        setDetails((previous) =>
            previous.map((item) => {
                if (item.id !== detailId) {
                    return item
                }

                const filteredNotes = item.notes.filter(
                    (_, index) => index !== noteIndex,
                )

                return {
                    ...item,
                    notes:
                        filteredNotes.length === 0
                            ? [
                                {
                                    text: '',
                                    file: null,
                                },
                            ]
                            : filteredNotes,
                }
            }),
        )
    }

    const handleDeleteDocument = async (
        detailId: number,
        documentId: number,
    ): Promise<void> => {
        if (!isTodayProgress || progress === null) {
            return
        }

        setDeletingDocumentId(documentId)
        setErrorMessage(null)

        const result =
            await dailyProgressApi.deleteDocument(
                progress.id,
                detailId,
                documentId,
            )

        setDeletingDocumentId(null)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        setDetails((previous) =>
            previous.map((detail) => {
                if (detail.id !== detailId) {
                    return detail
                }

                return {
                    ...detail,
                    documents: detail.documents.filter(
                        (document) =>
                            document.id !== documentId,
                    ),
                }
            }),
        )
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (progress === null) {
            return
        }

        if (!isTodayProgress) {
            setErrorMessage(
                'Daily Progress hanya bisa diedit untuk tanggal hari ini.',
            )
            return
        }

        setIsSubmitting(true)

        const updateResult =
            await dailyProgressApi.update(
                progress.id,
                {
                    no_spk: progress.no_spk,
                    details: details.map((detail) => {
                        const noteText = detail.notes
                            .map((note) => note.text.trim())
                            .filter((note) => note !== '')
                            .join('\n')

                        return {
                            id: detail.id,
                            status: detail.isChecked
                                ? 'selesai'
                                : 'open',
                            catatan:
                                noteText === ''
                                    ? null
                                    : noteText,
                        }
                    }),
                },
            )

        if (!updateResult.success) {
            setIsSubmitting(false)
            setErrorMessage(updateResult.message)
            return
        }

        for (const detail of details) {
            const filesToUpload = detail.notes
                .map((note) => note.file)
                .filter(
                    (file): file is File => file !== null,
                )

            if (filesToUpload.length === 0) {
                continue
            }

            const uploadResult =
                await dailyProgressApi.uploadDocuments(
                    progress.id,
                    detail.id,
                    filesToUpload,
                )

            if (!uploadResult.success) {
                setIsSubmitting(false)
                setErrorMessage(uploadResult.message)
                return
            }
        }

        setIsSubmitting(false)
        navigate('/daily-progress')
    }

    return (
        <div className="daily-progress-page">
            <div className="daily-progress-heading">
                <div>
                    <h1 className="daily-progress-title">
                        Edit Daily Progress
                    </h1>

                    <div className="daily-progress-breadcrumb">
                        <span className="active">
                            Progress
                        </span>

                        <span>/</span>

                        <span>Daily Progress</span>

                        <span>/</span>

                        <span>Edit</span>
                    </div>
                </div>

                {progress !== null && (
                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() =>
                                navigate(
                                    `/daily-progress/${progress.id}/edit-form`,
                                )
                            }
                        >
                            <i className="bi bi-pencil-square me-1" />
                            Edit Data Lengkap (SPK / Pekerjaan)
                        </button>
                    </div>
                )}
            </div>

            <section className="daily-progress-form-page">
                {isLoading && (
                    <div className="daily-progress-loading">
                        <div
                            className="spinner-border"
                            role="status"
                        />
                        <span>Memuat Daily Progress...</span>
                    </div>
                )}

                {!isLoading && (
                    <form onSubmit={handleSubmit}>
                        {errorMessage !== null && (
                            <div
                                className="alert alert-danger"
                                role="alert"
                            >
                                {errorMessage}
                            </div>
                        )}

                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label">
                                    Nomor
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    value={progress?.nomor ?? ''}
                                    disabled
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="form-label">
                                    Tanggal
                                </label>

                                <input
                                    type="date"
                                    className="form-control"
                                    value={progress?.tanggal ?? ''}
                                    disabled
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="form-label">
                                    No SPK
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    value={progress?.no_spk ?? '-'}
                                    disabled
                                />
                            </div>
                        </div>

                        {progress !== null &&
                            !isTodayProgress && (
                                <div
                                    className="alert alert-warning d-flex align-items-center justify-content-between"
                                    role="alert"
                                >
                                    <span>
                                        Daily Progress ini bukan tanggal hari ini. Checklist status penyelesaian hanya dapat diperbarui pada hari berjalan.
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-outline-warning btn-sm ms-2 text-nowrap"
                                        onClick={() =>
                                            navigate(
                                                `/daily-progress/${progress.id}/edit-form`,
                                            )
                                        }
                                    >
                                        <i className="bi bi-pencil-square me-1" />
                                        Edit Data Form
                                    </button>
                                </div>
                            )}

                        {progress !== null &&
                            (progress.findings ?? []).length > 0 && (
                                <div className="daily-progress-document-section mb-4">
                                    <div className="daily-progress-document-heading">
                                        <span>Temuan Progress Report</span>
                                    </div>

                                    {(progress.findings ?? []).map(
                                        (finding) => (
                                            <div
                                                className="daily-progress-document-row"
                                                key={finding.id}
                                            >
                                                <div>
                                                    <strong>
                                                        {finding.nomor_pr}{' '}
                                                        /{' '}
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

                        {progress !== null &&
                            (progress.temuans ?? []).length > 0 && (
                                <div className="daily-progress-document-section mb-4">
                                    <div className="daily-progress-document-heading">
                                        <span>Temuan Global</span>
                                    </div>

                                    {(progress.temuans ?? []).map(
                                        (temuan) => (
                                            <div
                                                className="daily-progress-document-row"
                                                key={temuan.id}
                                            >
                                                <div>
                                                    <strong>
                                                        {temuan.nomor}{' '}
                                                        /{' '}
                                                        {temuan.tanggal}
                                                    </strong>

                                                    <span>
                                                        {(temuan.notes ?? [])
                                                            .map(
                                                                (note) =>
                                                                    note.note,
                                                            )
                                                            .join('\n') ||
                                                            'Tanpa catatan.'}
                                                    </span>
                                                </div>

                                                <span
                                                    className={`daily-progress-status ${temuan.status}`}
                                                >
                                                    {temuan.status}
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}

                        <div className="daily-progress-detail-list">
                            {details.map((detail) => {
                                const isLockedCompleted =
                                    detail.isMasterSubtask &&
                                    detail.isAlreadyCompleted

                                return (
                                    <div
                                        className="daily-progress-detail-card"
                                        key={detail.id}
                                    >
                                        <div className="daily-progress-completion-row">
                                            <label
                                                className={`daily-progress-completion-check ${
                                                    isLockedCompleted
                                                        ? 'disabled'
                                                        : ''
                                                }`}
                                                title={
                                                    isLockedCompleted
                                                        ? 'Subtask master task sudah selesai dan tidak dapat di-unchecklist'
                                                        : undefined
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        detail.isChecked
                                                    }
                                                    disabled={
                                                        !isTodayProgress ||
                                                        isLockedCompleted
                                                    }
                                                    onChange={() =>
                                                        handleToggleDetail(
                                                            detail.id,
                                                        )
                                                    }
                                                />

                                                <span>
                                                    {detail.label}
                                                </span>

                                                {isLockedCompleted && (
                                                    <span className="daily-progress-status selesai ms-2">
                                                        Selesai
                                                    </span>
                                                )}
                                            </label>
                                        </div>

                                        <div className="daily-progress-note-section">
                                            <div className="daily-progress-note-heading">
                                                <span>Catatan</span>

                                                <button
                                                    type="button"
                                                    className="daily-progress-note-add"
                                                    disabled={!isTodayProgress}
                                                    onClick={() =>
                                                        handleAddNote(
                                                            detail.id,
                                                        )
                                                    }
                                                >
                                                    <i className="bi bi-plus-lg" />
                                                    Tambah Catatan
                                                </button>
                                            </div>

                                            {detail.notes.map(
                                                (
                                                    note,
                                                    noteIndex,
                                                ) => (
                                                    <div
                                                        className="daily-progress-note-row"
                                                        key={`${detail.id}-note-${noteIndex}`}
                                                    >
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={note.text}
                                                            placeholder="Catatan"
                                                            disabled={!isTodayProgress}
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                handleNoteChange(
                                                                    detail.id,
                                                                    noteIndex,
                                                                    event
                                                                        .target
                                                                        .value,
                                                                )
                                                            }
                                                        />

                                                        <label className="daily-progress-note-file">
                                                            <i className="bi bi-paperclip" />
                                                            <span>
                                                                {note.file === null
                                                                    ? 'Dokumen'
                                                                    : note.file.name}
                                                            </span>
                                                            <input
                                                                type="file"
                                                                disabled={!isTodayProgress}
                                                                onChange={(
                                                                    event,
                                                                ) => {
                                                                    handleNoteFileChange(
                                                                        detail.id,
                                                                        noteIndex,
                                                                        event
                                                                            .target
                                                                            .files?.[0] ??
                                                                        null,
                                                                    )
                                                                }}
                                                            />
                                                        </label>

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger"
                                                            disabled={!isTodayProgress}
                                                            onClick={() =>
                                                                handleRemoveNote(
                                                                    detail.id,
                                                                    noteIndex,
                                                                )
                                                            }
                                                        >
                                                            <i className="bi bi-x-lg" />
                                                        </button>
                                                    </div>
                                                ),
                                            )}
                                        </div>

                                        <div className="daily-progress-document-section">
                                            <div className="daily-progress-document-heading">
                                                <span>Dokumen Tersimpan</span>
                                            </div>

                                            {detail.documents.length ===
                                                0 && (
                                                <div className="daily-progress-document-empty">
                                                    Belum ada dokumen.
                                                </div>
                                            )}

                                            {detail.documents.map(
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

                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-danger"
                                                            disabled={
                                                                !isTodayProgress ||
                                                                deletingDocumentId ===
                                                                document.id
                                                            }
                                                            onClick={() =>
                                                                void handleDeleteDocument(
                                                                    detail.id,
                                                                    document.id,
                                                                )
                                                            }
                                                        >
                                                            {deletingDocumentId ===
                                                            document.id ? (
                                                                <span className="spinner-border spinner-border-sm" />
                                                            ) : (
                                                                <i className="bi bi-trash3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="daily-progress-form-page-footer">
                            <button
                                type="button"
                                className="btn btn-light"
                                disabled={isSubmitting}
                                onClick={() =>
                                    navigate(
                                        '/daily-progress',
                                    )
                                }
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={
                                    !isTodayProgress ||
                                    isSubmitting
                                }
                            >
                                {isSubmitting && (
                                    <span className="spinner-border spinner-border-sm me-2" />
                                )}
                                Simpan
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    )
}

export default DailyProgressEditPage
