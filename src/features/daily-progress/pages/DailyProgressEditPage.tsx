import {
    useEffect,
    useMemo,
    useState,
    type ClipboardEvent,
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
    DailyProgressStatus,
} from '@/features/daily-progress/types/daily-progress.types'

import '@/features/daily-progress/styles/daily-progress.scss'

interface NoteFormData {
    text: string
    file: File | null
}

interface TemuanFollowupState {
    status: 'selesai' | 'pending'
    solusi: string
    alasan_pending: string
    isOriginalSelesai: boolean
}

interface DetailFormData {
    id: number
    alsJobId: number
    jobCode: string
    jobDescription: string
    taskName: string
    parentName: string | null
    label: string
    status: DailyProgressStatus
    isAlreadyCompleted: boolean
    isMasterSubtask: boolean
    notes: NoteFormData[]
    documents: DailyProgressDocument[]
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

    const [temuanFollowups, setTemuanFollowups] = useState<
        Record<number, TemuanFollowupState>
    >({})

    const [isLoading, setIsLoading] =
        useState<boolean>(true)

    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)

    const [submitAction, setSubmitAction] =
        useState<'save' | 'save_and_continue'>('save')

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

                            const taskName =
                                detail.task?.task_name ?? 'Task'
                            const parentName =
                                detail.task?.parent?.task_name ?? null
                            const jobCode =
                                detail.job?.job_code ?? ''
                            const jobDescription =
                                detail.job?.description ?? ''

                            return {
                                id: detail.id,
                                alsJobId: detail.als_job_id,
                                jobCode,
                                jobDescription,
                                taskName,
                                parentName,
                                label: getDetailLabel(detail),
                                status: detail.status,
                                isAlreadyCompleted,
                                isMasterSubtask,
                                notes: getNotes(detail.catatan),
                                documents:
                                    detail.documents ?? [],
                            }
                        }),
                    )

                    const initialFollowups: Record<number, TemuanFollowupState> = {}
                    ;(result.data.temuans ?? []).forEach((t) => {
                        const isOriginalSelesai =
                            t.status === 'selesai' ||
                            t.dp_followup?.status === 'selesai'
                        initialFollowups[t.id] = {
                            status: isOriginalSelesai
                                ? 'selesai'
                                : t.dp_followup?.status === 'pending' ||
                                  t.status === 'pending'
                                ? 'pending'
                                : 'selesai',
                            solusi: t.dp_followup?.solusi ?? '',
                            alasan_pending: t.dp_followup?.alasan_pending ?? '',
                            isOriginalSelesai,
                        }
                    })
                    setTemuanFollowups(initialFollowups)
                }

            void fetchProgress()
        })
    }, [id])

    const groupedDetails = useMemo(() => {
        const groups: {
            key: string
            title: string
            items: DetailFormData[]
        }[] = []

        const map = new Map<
            string,
            {
                key: string
                title: string
                items: DetailFormData[]
            }
        >()

        details.forEach((item) => {
            const key = String(
                item.alsJobId || item.jobCode || 'default',
            )
            let group = map.get(key)
            if (!group) {
                const title = item.jobCode
                    ? `${item.jobCode} - ${item.jobDescription || ''}`
                    : item.jobDescription || 'Daftar Pekerjaan'
                group = {
                    key,
                    title,
                    items: [],
                }
                map.set(key, group)
                groups.push(group)
            }
            group.items.push(item)
        })

        return groups
    }, [details])

    const handleStatusChange = (
        detailId: number,
        targetStatus: 'selesai' | 'pending',
    ): void => {
        setDetails((previous) =>
            previous.map((item) => {
                if (item.id !== detailId) {
                    return item
                }

                // Jika task statusnya sudah selesai, dikunci dan tidak dapat diubah lagi
                if (item.isAlreadyCompleted) {
                    return item
                }

                // Jika status yang diklik sudah aktif, klik lagi mengembalikan ke 'open'
                const nextStatus: DailyProgressStatus =
                    item.status === targetStatus ? 'open' : targetStatus

                return {
                    ...item,
                    status: nextStatus,
                    notes:
                        item.notes.length === 0
                            ? [{ text: '', file: null }]
                            : item.notes,
                }
            }),
        )
    }

    const handleAddNote = (detailId: number): void => {
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

    const handleNotePaste = (
        detailId: number,
        noteIndex: number,
        event: ClipboardEvent<HTMLTextAreaElement>,
    ): void => {
        const items = event.clipboardData?.items
        if (!items) {
            return
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.type.startsWith('image/')) {
                const blob = item.getAsFile()
                if (blob !== null) {
                    if (blob.size > 10 * 1024 * 1024) {
                        setErrorMessage('Ukuran file gambar maksimal 10 MB.')
                        return
                    }
                    const extension = blob.type.split('/')[1] || 'png'
                    const pastedFile = new File(
                        [blob],
                        `paste_${Date.now()}.${extension}`,
                        { type: blob.type },
                    )
                    handleNoteFileChange(detailId, noteIndex, pastedFile)
                    event.preventDefault()
                    return
                }
            }
        }
    }

    const handleRemoveNote = (
        detailId: number,
        noteIndex: number,
    ): void => {
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
                    notes: filteredNotes,
                }
            }),
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

    const handleTemuanFollowupChange = (
        temuanId: number,
        field: 'status' | 'solusi' | 'alasan_pending',
        value: string,
    ): void => {
        setTemuanFollowups((prev) => {
            const current = prev[temuanId] ?? {
                status: 'selesai',
                solusi: '',
                alasan_pending: '',
                isOriginalSelesai: false,
            }
            return {
                ...prev,
                [temuanId]: {
                    ...current,
                    [field]: value,
                },
            }
        })
    }

    const handleSave = async (
        continueToProgressReport: boolean,
    ): Promise<void> => {
        setErrorMessage(null)

        if (progress === null) {
            return
        }

        // Validasi: Pekerjaan dengan status pending wajib menyertakan alasan
        for (const detail of details) {
            if (detail.status === 'pending') {
                const hasText = detail.notes.some(
                    (note) => note.text.trim() !== '',
                )
                if (!hasText) {
                    setErrorMessage(
                        `Alasan pending wajib diisi untuk pekerjaan "${detail.taskName}".`,
                    )
                    return
                }
            }
        }

        // Validasi: Tindak lanjut temuan
        for (const followup of Object.values(temuanFollowups)) {
            if (followup.isOriginalSelesai) continue
            if (followup.status === 'selesai') {
                if (!followup.solusi || followup.solusi.trim() === '') {
                    setErrorMessage(
                        'Solusi wajib diisi untuk temuan yang ditandai selesai.',
                    )
                    return
                }
            } else if (followup.status === 'pending') {
                if (
                    !followup.alasan_pending ||
                    followup.alasan_pending.trim() === ''
                ) {
                    setErrorMessage(
                        'Alasan pending wajib diisi untuk temuan yang berstatus pending.',
                    )
                    return
                }
            }
        }

        setIsSubmitting(true)
        setSubmitAction(
            continueToProgressReport ? 'save_and_continue' : 'save',
        )

        const temuansPayload = Object.entries(temuanFollowups).map(
            ([idStr, followup]) => ({
                id: Number(idStr),
                status: followup.status,
                solusi:
                    followup.status === 'selesai'
                        ? followup.solusi.trim()
                        : null,
                alasan_pending:
                    followup.status === 'pending'
                        ? followup.alasan_pending.trim()
                        : null,
            }),
        )

        const updateResult =
            await dailyProgressApi.update(
                progress.id,
                {
                    no_spk: progress.no_spk,
                    temuans:
                        temuansPayload.length > 0
                            ? temuansPayload
                            : undefined,
                    details: details.map((detail) => {
                        const noteText = detail.notes
                            .map((note) => note.text.trim())
                            .filter((note) => note !== '')
                            .join('\n')

                        return {
                            id: detail.id,
                            status: detail.status,
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

        if (continueToProgressReport) {
            const spkId = progress.als_spk_id ?? progress.spk_id
            const queryParams = new URLSearchParams()
            if (progress.client_code) {
                queryParams.set('client_code', progress.client_code)
            }
            if (spkId !== null && spkId !== undefined) {
                queryParams.set('spk_id', String(spkId))
            }
            if (progress.no_spk) {
                queryParams.set('no_spk', progress.no_spk)
            }
            if (progress.tanggal) {
                queryParams.set('tanggal', progress.tanggal)
            }
            if (progress.bulan) {
                queryParams.set('bulan', String(progress.bulan))
            }
            if (progress.tahun) {
                queryParams.set('tahun', String(progress.tahun))
            }

            navigate(`/progress-report/tambah?${queryParams.toString()}`, {
                state: {
                    client_code: progress.client_code,
                    spk_id: spkId,
                    no_spk: progress.no_spk ?? undefined,
                    tanggal: progress.tanggal,
                    bulan: progress.bulan,
                    tahun: progress.tahun,
                },
            })
            return
        }

        navigate('/daily-progress')
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        await handleSave(false)
    }

    return (
        <div className="daily-progress-page">
            <div className="daily-progress-heading">
                <div>
                    <h1 className="daily-progress-title">
                        Update Status Daily Progress
                    </h1>
                    <p className="daily-progress-subtitle">
                        Perbarui status penyelesaian pekerjaan dan catatan operasional
                    </p>

                    <div className="daily-progress-breadcrumb mt-1">
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
                                    `/daily-progress/${progress.id}/edit-form`
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
                            className="spinner-border text-primary"
                            role="status"
                        />
                        <span>Memuat data...</span>
                    </div>
                )}

                {!isLoading && (
                    <form onSubmit={handleSubmit}>
                        {errorMessage !== null && (
                            <div
                                className="alert alert-danger"
                                role="alert"
                            >
                                <i className="bi bi-exclamation-triangle-fill me-2" />
                                {errorMessage}
                            </div>
                        )}

                        <div className="daily-progress-edit-summary mb-4">
                            <div className="daily-progress-summary-item primary">
                                <div className="summary-icon">
                                    <i className="bi bi-file-earmark-text" />
                                </div>
                                <div className="summary-content">
                                    <span className="summary-label">Nomor Laporan</span>
                                    <strong className="summary-value">
                                        {progress?.nomor ?? '-'}
                                    </strong>
                                </div>
                            </div>

                            <div className="daily-progress-summary-item cyan">
                                <div className="summary-icon">
                                    <i className="bi bi-calendar3" />
                                </div>
                                <div className="summary-content">
                                    <span className="summary-label">Tanggal</span>
                                    <strong className="summary-value">
                                        {progress?.tanggal ?? '-'}
                                    </strong>
                                </div>
                            </div>

                            <div className="daily-progress-summary-item blue">
                                <div className="summary-icon">
                                    <i className="bi bi-file-earmark-ruled" />
                                </div>
                                <div className="summary-content">
                                    <span className="summary-label">No SPK</span>
                                    <strong className="summary-value">
                                        {progress?.no_spk ?? '-'}
                                    </strong>
                                </div>
                            </div>

                            {progress?.client_code && (
                                <div className="daily-progress-summary-item purple">
                                    <div className="summary-icon">
                                        <i className="bi bi-buildings" />
                                    </div>
                                    <div className="summary-content">
                                        <span className="summary-label">Client</span>
                                        <strong className="summary-value">
                                            {progress.client_code}
                                        </strong>
                                    </div>
                                </div>
                            )}
                        </div>

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
                                        <span>Tindak Lanjut Temuan</span>
                                    </div>

                                    {(progress.temuans ?? []).map(
                                        (temuan) => {
                                            const followup = temuanFollowups[temuan.id]
                                            const isLocked = followup?.isOriginalSelesai ?? false
                                            return (
                                                <div
                                                    className="daily-progress-task-card p-3 mb-3 border rounded bg-white shadow-sm"
                                                    key={temuan.id}
                                                >
                                                    <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-2">
                                                        <div>
                                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                                <span className="daily-progress-subtask-badge temuan">
                                                                    Temuan
                                                                </span>
                                                                <strong className="text-dark">
                                                                    {temuan.nomor}
                                                                </strong>
                                                                <span className="text-muted small">
                                                                    • {temuan.tanggal}
                                                                </span>
                                                            </div>
                                                            <p className="text-secondary small mb-0" style={{ whiteSpace: 'pre-line' }}>
                                                                {(temuan.notes ?? [])
                                                                    .map((note) => note.note)
                                                                    .join('\n') ||
                                                                    'Tanpa catatan.'}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={`daily-progress-status ${
                                                                isLocked
                                                                    ? 'selesai'
                                                                    : (followup?.status ?? temuan.status)
                                                            }`}
                                                        >
                                                            {isLocked
                                                                ? 'Selesai'
                                                                : (followup?.status ?? temuan.status)}
                                                        </span>
                                                    </div>

                                                    <div className="daily-progress-temuan-followup mt-2">
                                                        <div className="daily-progress-followup-header">
                                                            <span className="daily-progress-followup-title">
                                                                Status Tindak Lanjut:
                                                            </span>
                                                            <label
                                                                className={`daily-progress-followup-pill ${
                                                                    (followup?.status ?? 'selesai') === 'selesai'
                                                                        ? 'active-selesai'
                                                                        : ''
                                                                } ${isLocked ? 'disabled opacity-75' : ''}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`edit-temuan-followup-${temuan.id}`}
                                                                    value="selesai"
                                                                    disabled={isLocked}
                                                                    checked={(followup?.status ?? 'selesai') === 'selesai'}
                                                                    onChange={() =>
                                                                        handleTemuanFollowupChange(temuan.id, 'status', 'selesai')
                                                                    }
                                                                />
                                                                <i className="bi bi-check-circle" />
                                                                <span>Selesai</span>
                                                            </label>
                                                            <label
                                                                className={`daily-progress-followup-pill ${
                                                                    followup?.status === 'pending'
                                                                        ? 'active-pending'
                                                                        : ''
                                                                } ${isLocked ? 'disabled opacity-75' : ''}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`edit-temuan-followup-${temuan.id}`}
                                                                    value="pending"
                                                                    disabled={isLocked}
                                                                    checked={followup?.status === 'pending'}
                                                                    onChange={() =>
                                                                        handleTemuanFollowupChange(temuan.id, 'status', 'pending')
                                                                    }
                                                                />
                                                                <i className="bi bi-clock" />
                                                                <span>Pending</span>
                                                            </label>
                                                        </div>

                                                        <div className="daily-progress-followup-body">
                                                            {(followup?.status ?? 'selesai') === 'selesai' ? (
                                                                <div>
                                                                    <label>
                                                                        Solusi Penyelesaian <span className="text-danger">*</span>
                                                                    </label>
                                                                    <textarea
                                                                        className="form-control form-control-sm"
                                                                        rows={2}
                                                                        disabled={isLocked}
                                                                        placeholder="Tuliskan solusi penyelesaian temuan ini..."
                                                                        value={followup?.solusi ?? ''}
                                                                        onChange={(e) =>
                                                                            handleTemuanFollowupChange(
                                                                                temuan.id,
                                                                                'solusi',
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <label>
                                                                        Alasan Pending <span className="text-danger">*</span>
                                                                    </label>
                                                                    <textarea
                                                                        className="form-control form-control-sm"
                                                                        rows={2}
                                                                        disabled={isLocked}
                                                                        placeholder="Tuliskan alasan mengapa temuan belum diselesaikan..."
                                                                        value={followup?.alasan_pending ?? ''}
                                                                        onChange={(e) =>
                                                                            handleTemuanFollowupChange(
                                                                                temuan.id,
                                                                                'alasan_pending',
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        },
                                    )}
                                </div>
                            )}

                        {details.length === 0 && (
                            <div className="alert alert-info d-flex align-items-center gap-3 p-3 mb-4 rounded border">
                                <i className="bi bi-info-circle fs-4 text-info" />
                                <div>
                                    <strong className="d-block mb-1">Laporan Khusus Temuan</strong>
                                    <p className="mb-0 small text-secondary">
                                        Daily Progress ini difokuskan untuk tindak lanjut temuan (tanpa checklist pekerjaan).
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* List Pekerjaan Terbagi per Job */}
                        <div className="daily-progress-detail-list">
                            {groupedDetails.map((group) => (
                                <div
                                    className="daily-progress-job-card"
                                    key={group.key}
                                >
                                    <div className="daily-progress-job-header">
                                        {group.title}
                                    </div>

                                    <div className="daily-progress-job-body">
                                        {group.items.map((detail) => {
                                            const isLockedCompleted =
                                                detail.isAlreadyCompleted
                                            const isSelesai =
                                                detail.status === 'selesai'
                                            const isPending =
                                                detail.status === 'pending'

                                            return (
                                                <div
                                                    className={`daily-progress-task-card ${
                                                        isSelesai
                                                            ? 'status-selesai'
                                                            : isPending
                                                            ? 'status-pending'
                                                            : 'status-open'
                                                    }`}
                                                    key={detail.id}
                                                >
                                                    <div className="daily-progress-task-top">
                                                        <div className="daily-progress-task-info">
                                                            <div className="daily-progress-task-title">
                                                                {detail.taskName}
                                                            </div>

                                                            <div className="daily-progress-task-subtitle">
                                                                {isPending ? (
                                                                    <span className="status-text-pending">
                                                                        Status: Pending
                                                                    </span>
                                                                ) : isSelesai ? (
                                                                    <span className="status-text-selesai">
                                                                        Status: Selesai
                                                                    </span>
                                                                ) : (
                                                                    <span>
                                                                        Pilih status untuk melaporkan pekerjaan ini
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Segmented Button: Selesai | Pending */}
                                                        <div className="daily-progress-status-toggle">
                                                            <button
                                                                type="button"
                                                                className={`daily-progress-status-btn btn-selesai ${
                                                                    isSelesai
                                                                        ? 'active'
                                                                        : ''
                                                                }`}
                                                                disabled={isSubmitting}
                                                                onClick={() =>
                                                                    handleStatusChange(
                                                                        detail.id,
                                                                        'selesai',
                                                                    )
                                                                }
                                                                title={
                                                                    isLockedCompleted
                                                                        ? 'Status telah selesai'
                                                                        : 'Tandai Selesai'
                                                                }
                                                            >
                                                                <i
                                                                    className={`bi ${
                                                                        isSelesai
                                                                            ? 'bi-check-circle-fill'
                                                                            : 'bi-check-circle'
                                                                    }`}
                                                                />
                                                                <span>Selesai</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={`daily-progress-status-btn btn-pending ${
                                                                    isPending
                                                                        ? 'active'
                                                                        : ''
                                                                }`}
                                                                disabled={
                                                                    isSubmitting ||
                                                                    isLockedCompleted
                                                                }
                                                                onClick={() =>
                                                                    handleStatusChange(
                                                                        detail.id,
                                                                        'pending',
                                                                    )
                                                                }
                                                                title={
                                                                    isLockedCompleted
                                                                        ? 'Subtask sudah berstatus selesai dan tidak dapat diubah ke pending'
                                                                        : 'Tandai Pending'
                                                                }
                                                            >
                                                                <i
                                                                    className={`bi ${
                                                                        isPending
                                                                            ? 'bi-clock-fill'
                                                                            : 'bi-clock'
                                                                    }`}
                                                                />
                                                                <span>Pending</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Form Catatan / Alasan (Hanya muncul jika Selesai atau Pending) */}
                                                    {(isSelesai || isPending) && (
                                                        <div className="daily-progress-note-container">
                                                            {detail.notes.map(
                                                                (
                                                                    note,
                                                                    noteIndex,
                                                                ) => (
                                                                    <div
                                                                        className="daily-progress-note-block"
                                                                        key={`${detail.id}-note-${noteIndex}`}
                                                                    >
                                                                        <div className="daily-progress-note-header">
                                                                            <div className="note-label">
                                                                                {isPending ? (
                                                                                    <span className="label-pending">
                                                                                        Alasan Pending{' '}
                                                                                        <strong className="text-danger">
                                                                                            *Wajib diisi
                                                                                        </strong>
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="label-selesai">
                                                                                        Hasil Penyelesaian
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {/* Tombol Upload & Lampiran di atas textarea */}
                                                                            <div className="note-tools">
                                                                                {note.file !==
                                                                                    null && (
                                                                                    <div className="daily-progress-attached-file">
                                                                                        <i className="bi bi-file-earmark-check text-success" />
                                                                                        <span
                                                                                            className="text-truncate file-name"
                                                                                            title={
                                                                                                note
                                                                                                    .file
                                                                                                    .name
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                note
                                                                                                    .file
                                                                                                    .name
                                                                                            }
                                                                                        </span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                handleNoteFileChange(
                                                                                                    detail.id,
                                                                                                    noteIndex,
                                                                                                    null,
                                                                                                )
                                                                                            }
                                                                                            title="Hapus file"
                                                                                            disabled={
                                                                                                isSubmitting
                                                                                            }
                                                                                        >
                                                                                            <i className="bi bi-x" />
                                                                                        </button>
                                                                                    </div>
                                                                                )}

                                                                                <label
                                                                                    className="daily-progress-upload-btn"
                                                                                    title="Lampirkan Dokumen atau Gambar"
                                                                                >
                                                                                    <i className="bi bi-paperclip" />
                                                                                    <span>
                                                                                        {note.file
                                                                                            ? 'Ganti File'
                                                                                            : 'Dokumen / Gambar'}
                                                                                    </span>
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*,.pdf,.doc,.docx"
                                                                                        disabled={
                                                                                            isSubmitting
                                                                                        }
                                                                                        onChange={(
                                                                                            event,
                                                                                        ) => {
                                                                                            const file =
                                                                                                event
                                                                                                    .target
                                                                                                    .files?.[0] ??
                                                                                                null
                                                                                            if (
                                                                                                file !==
                                                                                                    null &&
                                                                                                file.size >
                                                                                                    10 *
                                                                                                        1024 *
                                                                                                        1024
                                                                                            ) {
                                                                                                setErrorMessage(
                                                                                                    'Ukuran file maksimal 10 MB.',
                                                                                                )
                                                                                                event.target.value =
                                                                                                    ''
                                                                                                return
                                                                                            }
                                                                                            handleNoteFileChange(
                                                                                                detail.id,
                                                                                                noteIndex,
                                                                                                file,
                                                                                            )
                                                                                        }}
                                                                                    />
                                                                                </label>

                                                                                {noteIndex >
                                                                                    0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        className="daily-progress-note-remove-btn"
                                                                                        disabled={
                                                                                            isSubmitting
                                                                                        }
                                                                                        onClick={() =>
                                                                                            handleRemoveNote(
                                                                                                detail.id,
                                                                                                noteIndex,
                                                                                            )
                                                                                        }
                                                                                        title="Hapus catatan ini"
                                                                                    >
                                                                                        <i className="bi bi-trash3" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="daily-progress-textarea-wrapper">
                                                                            <textarea
                                                                                className={`form-control daily-progress-note-textarea ${
                                                                                    isPending
                                                                                        ? 'pending-textarea'
                                                                                        : 'selesai-textarea'
                                                                                }`}
                                                                                rows={3}
                                                                                value={
                                                                                    note.text
                                                                                }
                                                                                placeholder={
                                                                                    isPending
                                                                                        ? 'Tuliskan kendala atau alasan mengapa pekerjaan rutin ini belum selesai / pending...'
                                                                                        : 'Tuliskan catatan hasil penyelesaian pekerjaan rutin ini...'
                                                                                }
                                                                                disabled={
                                                                                    isSubmitting
                                                                                }
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
                                                                                onPaste={(
                                                                                    event,
                                                                                ) =>
                                                                                    handleNotePaste(
                                                                                        detail.id,
                                                                                        noteIndex,
                                                                                        event,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}

                                                            {isSelesai && (
                                                                <button
                                                                    type="button"
                                                                    className="daily-progress-add-note-btn"
                                                                    disabled={isSubmitting}
                                                                    onClick={() =>
                                                                        handleAddNote(
                                                                            detail.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <i className="bi bi-plus-circle" />
                                                                    <span>Tambah Catatan Tambahan</span>
                                                                </button>
                                                            )}

                                                            {/* Dokumen yang tersimpan di server */}
                                                            {detail.documents.length >
                                                                0 && (
                                                                <div className="daily-progress-document-section">
                                                                    <div className="daily-progress-document-heading">
                                                                        <span>
                                                                            Dokumen Tersimpan
                                                                        </span>
                                                                    </div>

                                                                    {detail.documents.map(
                                                                        (
                                                                            document,
                                                                        ) => (
                                                                            <div
                                                                                className="daily-progress-document-row"
                                                                                key={
                                                                                    document.id
                                                                                }
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
                                                                                        isSubmitting ||
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
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
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
                                    navigate(
                                        '/daily-progress',
                                    )
                                }
                            >
                                Batal
                            </button>

                            <div className="d-flex align-items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                    onClick={() => void handleSave(false)}
                                >
                                    {isSubmitting && submitAction === 'save' && (
                                        <span className="spinner-border spinner-border-sm me-2" />
                                    )}
                                    Simpan
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-success"
                                    disabled={isSubmitting}
                                    onClick={() => void handleSave(true)}
                                >
                                    {isSubmitting && submitAction === 'save_and_continue' && (
                                        <span className="spinner-border spinner-border-sm me-2" />
                                    )}
                                    <i className="bi bi-arrow-right-circle me-1" />
                                    Lanjut Progress Report
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </section>
        </div>
    )
}

export default DailyProgressEditPage
