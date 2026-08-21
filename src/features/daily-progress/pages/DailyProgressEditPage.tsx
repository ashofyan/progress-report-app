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
                        result.data.details.map((detail) => ({
                            id: detail.id,
                            label: getDetailLabel(detail),
                            isChecked:
                                detail.status === 'selesai',
                            notes: getNotes(detail.catatan),
                            documents:
                                detail.documents ?? [],
                        })),
                    )
                }

            void fetchProgress()
        })
    }, [id])

    const isTodayProgress =
        progress?.tanggal === getTodayDate()

    const handleNoteChange = (
        detailId: number,
        noteIndex: number,
        value: string,
    ): void => {
        setDetails((previous) =>
            previous.map((detail) =>
                detail.id === detailId
                    ? {
                        ...detail,
                        notes: detail.notes.map(
                            (note, currentIndex) =>
                                currentIndex === noteIndex
                                    ? {
                                        ...note,
                                        text: value,
                                    }
                                    : note,
                        ),
                    }
                    : detail,
            ),
        )
    }

    const handleToggleDetail = (
        detailId: number,
    ): void => {
        setDetails((previous) =>
            previous.map((detail) =>
                detail.id === detailId
                    ? {
                        ...detail,
                        isChecked: !detail.isChecked,
                    }
                    : detail,
            ),
        )
    }

    const handleAddNote = (
        detailId: number,
    ): void => {
        setDetails((previous) =>
            previous.map((detail) =>
                detail.id === detailId
                    ? {
                        ...detail,
                        notes: [
                            ...detail.notes,
                            {
                                text: '',
                                file: null,
                            },
                        ],
                    }
                    : detail,
            ),
        )
    }

    const handleRemoveNote = (
        detailId: number,
        noteIndex: number,
    ): void => {
        setDetails((previous) =>
            previous.map((detail) =>
                detail.id === detailId
                    ? {
                        ...detail,
                        notes:
                            detail.notes.length === 1
                                ? [
                                    {
                                        text: '',
                                        file: null,
                                    },
                                ]
                                : detail.notes.filter(
                                    (
                                        _,
                                        currentIndex,
                                    ) =>
                                        currentIndex !==
                                        noteIndex,
                                ),
                    }
                    : detail,
            ),
        )
    }

    const handleNoteFileChange = (
        detailId: number,
        noteIndex: number,
        file: File | null,
    ): void => {
        setDetails((previous) =>
            previous.map((detail) =>
                detail.id === detailId
                    ? {
                        ...detail,
                        notes: detail.notes.map(
                            (note, currentIndex) =>
                                currentIndex === noteIndex
                                    ? {
                                        ...note,
                                        file,
                                    }
                                    : note,
                        ),
                    }
                    : detail,
            ),
        )
    }

    const handleDeleteDocument = async (
        detailId: number,
        documentId: number,
    ): Promise<void> => {
        if (progress === null) {
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
            previous.map((detail) =>
                detail.id === detailId
                    ? {
                        ...detail,
                        documents:
                            detail.documents.filter(
                                (document) =>
                                    document.id !==
                                    documentId,
                            ),
                    }
                    : detail,
            ),
        )
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (progress === null) {
            setErrorMessage(
                'Daily Progress belum berhasil dimuat.',
            )
            return
        }

        if (!isTodayProgress) {
            setErrorMessage(
                'Daily Progress hanya bisa diedit untuk tanggal hari ini.',
            )
            return
        }

        if (details.length === 0) {
            setErrorMessage(
                'Daily Progress belum memiliki detail.',
            )
            return
        }

        setIsSubmitting(true)

        const result = await dailyProgressApi.update(
            progress.id,
            {
                no_spk: progress.no_spk,
                details: details.map((detail) => ({
                    id: detail.id,
                    status: detail.isChecked
                        ? 'selesai'
                        : 'open',
                    catatan:
                        detail.notes
                            .map((note) =>
                                note.text.trim(),
                            )
                            .filter(
                                (note) => note !== '',
                            )
                            .join('\n') || null,
                })),
            },
        )

        if (!result.success) {
            setIsSubmitting(false)
            setErrorMessage(result.message)
            return
        }

        for (const detail of details) {
            const files = detail.notes
                .map((note) => note.file)
                .filter((file): file is File => file !== null)

            if (files.length === 0) {
                continue
            }

            const uploadResult =
                await dailyProgressApi.uploadDocuments(
                    progress.id,
                    detail.id,
                    files,
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
                                    className="alert alert-warning"
                                    role="alert"
                                >
                                    Daily Progress ini bukan tanggal hari ini.
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

                        <div className="daily-progress-detail-list">
                            {details.map((detail) => (
                                <div
                                    className="daily-progress-detail-card"
                                    key={detail.id}
                                >
                                    <div className="daily-progress-completion-row">
                                        <label className="daily-progress-completion-check">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    detail.isChecked
                                                }
                                                disabled={!isTodayProgress}
                                                onChange={() =>
                                                    handleToggleDetail(
                                                        detail.id,
                                                    )
                                                }
                                            />

                                            <span>
                                                {detail.label}
                                            </span>
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
                            ))}
                        </div>

                        <div className="daily-progress-form-page-footer">
                            <button
                                type="button"
                                className="btn btn-light"
                                disabled={isSubmitting}
                                onClick={() =>
                                    navigate('/daily-progress')
                                }
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={
                                    isSubmitting ||
                                    !isTodayProgress
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
