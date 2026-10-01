import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import type {
    DailyProgressFormSpk,
} from '@/features/daily-progress/types/daily-progress.types'
import { progressReportApi } from '@/features/progress-report/api/progressReportApi'
import type {
    CreateProgressReportFindingRequest,
    ProgressReportDocument,
    ProgressReportFormData,
    ProgressReportSourceType,
    ProgressReportFormTask,
    ProgressReportHistory,
    ProgressReportStatus,
} from '@/features/progress-report/types/progress-report.types'

import '@/features/additional-task/styles/additional-task.scss'
import '@/features/progress-report/styles/progress-report.scss'

interface NoteForm {
    catatan: string
    document: File | null
}

interface GeneralNoteForm extends NoteForm {
    judul: string
}

interface SelectedDetail {
    isSelected: boolean
    status: ProgressReportStatus
}

interface FindingForm {
    source_type: ProgressReportSourceType
    als_job_task_id?: number
    als_task_additional_detail_id?: number
    task_name: string
    notes: NoteForm[]
}

type CreateStep =
    | 'details'
    | 'findings'
    | 'info'

const steps: Array<{
    key: CreateStep
    label: string
}> = [
    {
        key: 'details',
        label: 'Detail Daily Progress',
    },
    {
        key: 'findings',
        label: 'Temuan',
    },
    {
        key: 'info',
        label: 'Informasi Lain',
    },
]

const statusLabels: Record<string, string> = {
    open: 'Open',
    pending: 'Pending',
    selesai: 'Selesai',
}

const documentAccept =
    '.jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx'

const emptyNote = (): NoteForm => ({
    catatan: '',
    document: null,
})

const emptyGeneralNote = (): GeneralNoteForm => ({
    judul: '',
    catatan: '',
    document: null,
})

const getToday = (): string => {
    return new Date().toISOString().slice(0, 10)
}

const getMonthFromDate = (date: string): number => {
    return Number(date.slice(5, 7))
}

const getYearFromDate = (date: string): number => {
    return Number(date.slice(0, 4))
}

const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
]

const getSpkLabel = (spk: DailyProgressFormSpk): string => {
    const description =
        spk.note ??
        spk.job?.description ??
        spk.kode_product_jasa ??
        'Tanpa deskripsi'

    return `${spk.no_spk} - ${description}`
}

const isTaskLockedByProgressReport = (
    task: ProgressReportFormTask,
): boolean => {
    return (
        task.is_already_reported === true ||
        task.history.some(
            (history) => history.status === 'selesai',
        )
    )
}

const getDefaultDetailState = (
    task: ProgressReportFormTask,
): SelectedDetail => {
    const isLocked = isTaskLockedByProgressReport(task)

    return {
        isSelected: !isLocked,
        status:
            task.default_progress_report_status ??
            (task.daily_progress_status === 'pending'
                ? 'pending'
                : 'selesai'),
    }
}

const getHistoryNoteText = (
    history: ProgressReportHistory,
): string | null => {
    if (
        history.notes !== undefined &&
        history.notes.length > 0
    ) {
        const notes = history.notes
            .map((note) => note.catatan.trim())
            .filter((note) => note !== '')

        return notes.length === 0
            ? null
            : notes.join('\n')
    }

    return history.catatan ?? null
}

const getNoteFiles = (notes: NoteForm[]): File[] => {
    return notes
        .map((note) => note.document)
        .filter((file): file is File => file !== null)
}

const hasFilledNote = (notes: NoteForm[]): boolean => {
    return notes.some(
        (note) => note.catatan.trim() !== '',
    )
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

const formatDocumentSize = (
    sizeInBytes?: number,
): string => {
    if (sizeInBytes === undefined || Number.isNaN(sizeInBytes)) {
        return '-'
    }

    if (sizeInBytes < 1024) {
        return `${sizeInBytes} B`
    }

    if (sizeInBytes < 1024 * 1024) {
        return `${Math.ceil(sizeInBytes / 1024)} KB`
    }

    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFindingKey = (finding: FindingForm): string => {
    if (finding.source_type === 'master') {
        return `master-${finding.als_job_task_id ?? ''}`
    }

    return `additional-${finding.als_task_additional_detail_id ?? ''}`
}

const ProgressReportCreatePage = () => {
    const navigate = useNavigate()

    const [tanggal, setTanggal] =
        useState<string>(getToday())

    const [periodeBulan, setPeriodeBulan] =
        useState<number | ''>(getMonthFromDate(getToday()))

    const [periodeTahun, setPeriodeTahun] =
        useState<number | ''>(getYearFromDate(getToday()))

    const [clientCode, setClientCode] =
        useState<string>('')

    const [spks, setSpks] =
        useState<DailyProgressFormSpk[]>([])

    const [selectedSpkId, setSelectedSpkId] =
        useState<number | ''>('')

    const [formData, setFormData] =
        useState<ProgressReportFormData | null>(null)

    const [currentStep, setCurrentStep] =
        useState<CreateStep>('details')

    const [detailState, setDetailState] =
        useState<Record<number, SelectedDetail>>({})

    const [generalNotes, setGeneralNotes] =
        useState<GeneralNoteForm[]>([emptyGeneralNote()])

    const [findings, setFindings] =
        useState<FindingForm[]>([])

    const [isLoadingSpks, setIsLoadingSpks] =
        useState<boolean>(false)

    const [isLoadingForm, setIsLoadingForm] =
        useState<boolean>(false)

    const [spkErrorMessage, setSpkErrorMessage] =
        useState<string | null>(null)

    const [formErrorMessage, setFormErrorMessage] =
        useState<string | null>(null)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const currentStepIndex = steps.findIndex(
        (step) => step.key === currentStep,
    )

    const selectedSpk = useMemo(() => {
        return (
            spks.find(
                (spk) => spk.spk_id === selectedSpkId,
            ) ?? null
        )
    }, [
        selectedSpkId,
        spks,
    ])

    const handleTanggalChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        const nextDate = event.target.value
        setTanggal(nextDate)

        if (nextDate.trim() !== '') {
            setPeriodeBulan(getMonthFromDate(nextDate))
            setPeriodeTahun(getYearFromDate(nextDate))
        }
    }

    const handlePeriodMonthChange = (
        event: ChangeEvent<HTMLSelectElement>,
    ): void => {
        setPeriodeBulan(
            event.target.value === ''
                ? ''
                : Number(event.target.value),
        )
        setSelectedSpkId('')
    }

    const handlePeriodYearChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        const value = event.target.value
        setPeriodeTahun(value === '' ? '' : Number(value))
        setSelectedSpkId('')
    }

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    const resetFormState = useCallback((): void => {
        setFormData(null)
        setDetailState({})
        setGeneralNotes([emptyGeneralNote()])
        setFindings([])
        setCurrentStep('details')
    }, [])

    useEffect(() => {
        if (
            clientCode.trim() === '' ||
            tanggal === '' ||
            periodeBulan === '' ||
            periodeTahun === ''
        ) {
            queueMicrotask(() => {
                setSpks([])
                setSelectedSpkId('')
                resetFormState()
                setSpkErrorMessage(null)
            })
            return
        }

        queueMicrotask(() => {
            const fetchSpks = async (): Promise<void> => {
                setIsLoadingSpks(true)
                setSpkErrorMessage(null)

                const result =
                    await dailyProgressApi.getFormData({
                        client_code: clientCode,
                        bulan: Number(periodeBulan),
                        tahun: Number(periodeTahun),
                    })

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setSpks(result.data.spks)
                    setSelectedSpkId('')
                    resetFormState()
                    setIsLoadingSpks(false)
                    return
                }

                setSpks([])
                setSelectedSpkId('')
                resetFormState()
                setSpkErrorMessage(result.message)
                setIsLoadingSpks(false)
            }

            void fetchSpks()
        })
    }, [
        clientCode,
        periodeBulan,
        periodeTahun,
        resetFormState,
        tanggal,
    ])

    useEffect(() => {
        if (
            clientCode.trim() === '' ||
            selectedSpkId === '' ||
            tanggal === '' ||
            periodeBulan === '' ||
            periodeTahun === ''
        ) {
            queueMicrotask(() => {
                resetFormState()
            })
            return
        }

        queueMicrotask(() => {
            const fetchFormData =
                async (): Promise<void> => {
                    setIsLoadingForm(true)
                    setFormErrorMessage(null)

                    const result =
                        await progressReportApi.getFormData({
                            client_code: clientCode,
                            als_spk_id: selectedSpkId,
                            tanggal,
                            bulan: Number(periodeBulan),
                            tahun: Number(periodeTahun),
                        })

                    if (
                        result.success &&
                        result.data !== undefined
                    ) {
                        const nextDetailState: Record<
                            number,
                            SelectedDetail
                        > = {}

                        result.data.tasks.forEach((task) => {
                            nextDetailState[
                                task.daily_progress_detail_id
                            ] = getDefaultDetailState(task)
                        })

                        setFormData(result.data)
                        setDetailState(nextDetailState)
                        setGeneralNotes([emptyGeneralNote()])
                        setFindings([
                            ...result.data.finding_sources.master.map(
                                (task): FindingForm => ({
                                    source_type: 'master',
                                    als_job_task_id: task.id,
                                    task_name: task.task_name,
                                    notes: [emptyNote()],
                                }),
                            ),
                            ...result.data.finding_sources.additional_tasks.map(
                                (task): FindingForm => ({
                                    source_type: 'additional',
                                    als_task_additional_detail_id:
                                        task.id,
                                    task_name: task.task_name,
                                    notes: [emptyNote()],
                                }),
                            ),
                        ])
                        setCurrentStep('details')
                        setIsLoadingForm(false)
                        return
                    }

                    resetFormState()
                    setFormErrorMessage(result.message)
                    setIsLoadingForm(false)
                }

            void fetchFormData()
        })
    }, [
        clientCode,
        periodeBulan,
        periodeTahun,
        resetFormState,
        selectedSpkId,
        tanggal,
    ])

    const getFilesFromEvent = (
        event: ChangeEvent<HTMLInputElement>,
    ): File | null => {
        return event.target.files?.[0] ?? null
    }

    const updateDetailState = (
        task: ProgressReportFormTask,
        updater: (
            current: SelectedDetail,
        ) => SelectedDetail,
    ): void => {
        setDetailState((previous) => {
            const current =
                previous[task.daily_progress_detail_id] ??
                getDefaultDetailState(task)

            return {
                ...previous,
                [task.daily_progress_detail_id]:
                    updater(current),
            }
        })
    }

    const handleToggleDetail = (
        task: ProgressReportFormTask,
    ): void => {
        if (isTaskLockedByProgressReport(task)) {
            return
        }

        updateDetailState(task, (current) => ({
            ...current,
            isSelected: !current.isSelected,
        }))
    }

    const handleSelectAll = (select: boolean): void => {
        if (formData === null) {
            return
        }

        setDetailState((previous) => {
            const next = { ...previous }
            formData.tasks.forEach((task) => {
                if (!isTaskLockedByProgressReport(task)) {
                    const current =
                        next[task.daily_progress_detail_id] ??
                        getDefaultDetailState(task)
                    next[task.daily_progress_detail_id] = {
                        ...current,
                        isSelected: select,
                    }
                }
            })
            return next
        })
    }

    const updateFindingNote = (
        findingIndex: number,
        noteIndex: number,
        patch: Partial<NoteForm>,
    ): void => {
        setFindings((previous) =>
            previous.map((finding, itemIndex) =>
                itemIndex !== findingIndex
                    ? finding
                    : {
                        ...finding,
                        notes: finding.notes.map(
                            (note, currentIndex) =>
                                currentIndex === noteIndex
                                    ? {
                                        ...note,
                                        ...patch,
                                    }
                                    : note,
                        ),
                    },
            ),
        )
    }

    const addFindingNote = (
        findingIndex: number,
    ): void => {
        setFindings((previous) =>
            previous.map((finding, itemIndex) =>
                itemIndex !== findingIndex
                    ? finding
                    : {
                        ...finding,
                        notes: [
                            ...finding.notes,
                            emptyNote(),
                        ],
                    },
            ),
        )
    }

    const removeFindingNote = (
        findingIndex: number,
        noteIndex: number,
    ): void => {
        setFindings((previous) =>
            previous.map((finding, itemIndex) =>
                itemIndex !== findingIndex
                    ? finding
                    : {
                        ...finding,
                        notes:
                            finding.notes.length === 1
                                ? [emptyNote()]
                                : finding.notes.filter(
                                    (_, currentIndex) =>
                                        currentIndex !==
                                        noteIndex,
                                ),
                    },
            ),
        )
    }

    const updateGeneralNote = (
        noteIndex: number,
        patch: Partial<GeneralNoteForm>,
    ): void => {
        setGeneralNotes((previous) =>
            previous.map((note, index) =>
                index === noteIndex
                    ? {
                        ...note,
                        ...patch,
                    }
                    : note,
            ),
        )
    }

    const addGeneralNote = (): void => {
        setGeneralNotes((previous) => [
            ...previous,
            emptyGeneralNote(),
        ])
    }

    const removeGeneralNote = (
        noteIndex: number,
    ): void => {
        setGeneralNotes((previous) =>
            previous.length === 1
                ? [emptyGeneralNote()]
                : previous.filter(
                    (_, index) => index !== noteIndex,
                ),
        )
    }

    const getPreparedDetails = () => {
        if (formData === null) {
            return []
        }

        return formData.tasks.map((task) => ({
            task,
            state:
                detailState[
                    task.daily_progress_detail_id
                ] ?? getDefaultDetailState(task),
        }))
    }

    const getSelectedDetails = () => {
        return getPreparedDetails().filter(
            ({ task, state }) =>
                !isTaskLockedByProgressReport(task) &&
                state.isSelected,
        )
    }

    const validateDetailsStep = (): boolean => {
        if (formData === null || selectedSpkId === '') {
            setErrorMessage(
                'Pilih client, SPK, dan tanggal terlebih dahulu.',
            )
            return false
        }

        const selectedDetails = getSelectedDetails()

        if (selectedDetails.length === 0) {
            setErrorMessage(
                'Pilih minimal satu pekerjaan Daily Progress untuk dimasukkan ke Progress Report.',
            )
            return false
        }

        return true
    }

    const validateFindingsStep = (): boolean => {
        const invalidFinding = findings.some((finding) => {
            const hasDocuments =
                getNoteFiles(finding.notes).length > 0

            return hasDocuments && !hasFilledNote(finding.notes)
        })

        if (invalidFinding) {
            setErrorMessage(
                'Temuan yang memiliki dokumen wajib memiliki catatan.',
            )
            return false
        }

        const hasTooManyFiles = findings.some(
            (finding) =>
                getNoteFiles(finding.notes).length > 10,
        )

        if (hasTooManyFiles) {
            setErrorMessage(
                'Maksimal 10 dokumen per temuan.',
            )
            return false
        }

        return true
    }

    const validateInfoStep = (): boolean => {
        if (
            getNoteFiles(generalNotes).length > 10
        ) {
            setErrorMessage(
                'Maksimal 10 dokumen umum Progress Report.',
            )
            return false
        }

        return true
    }

    const validateCurrentStep = (): boolean => {
        if (currentStep === 'details') {
            return validateDetailsStep()
        }

        if (currentStep === 'findings') {
            return validateFindingsStep()
        }

        return validateInfoStep()
    }

    const goToNextStep = (): void => {
        setErrorMessage(null)

        if (!validateCurrentStep()) {
            return
        }

        const nextStep = steps[currentStepIndex + 1]

        if (nextStep !== undefined) {
            setCurrentStep(nextStep.key)
        }
    }

    const goToPreviousStep = (): void => {
        setErrorMessage(null)

        const previousStep = steps[currentStepIndex - 1]

        if (previousStep !== undefined) {
            setCurrentStep(previousStep.key)
        }
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (
            !validateDetailsStep() ||
            !validateFindingsStep() ||
            !validateInfoStep()
        ) {
            return
        }

        const selectedDetails = getSelectedDetails()

        const submittedFindings = findings.filter((finding) =>
            hasFilledNote(finding.notes),
        )

        const payloadFindings: CreateProgressReportFindingRequest[] =
            submittedFindings.map((finding) => {
                const keterangan = finding.notes
                    .map((note) => note.catatan.trim())
                    .filter((note) => note !== '')
                    .join('\n')

                if (finding.source_type === 'master') {
                    return {
                        source_type: 'master',
                        als_job_task_id: finding.als_job_task_id,
                        keterangan,
                    }
                }

                return {
                    source_type: 'additional',
                    als_task_additional_detail_id:
                        finding.als_task_additional_detail_id,
                    keterangan,
                }
            })

        const payloadNotes = generalNotes
            .filter((note) => note.catatan.trim() !== '')
            .map((note) => ({
                judul:
                    note.judul.trim() === ''
                        ? undefined
                        : note.judul.trim(),
                catatan: note.catatan.trim(),
            }))

        setIsSubmitting(true)

        const result = await progressReportApi.create({
            tanggal,
            client_code: clientCode.trim(),
            als_spk_id: Number(selectedSpkId),
            notes:
                payloadNotes.length === 0
                    ? undefined
                    : payloadNotes,
            details: selectedDetails.map(({ task, state }) => {
                const detailNotes =
                    task.daily_progress_catatan &&
                    task.daily_progress_catatan.trim() !== ''
                        ? [
                              {
                                  catatan:
                                      task.daily_progress_catatan.trim(),
                              },
                          ]
                        : undefined

                const detailDocuments =
                    task.documents && task.documents.length > 0
                        ? task.documents.map((doc) => ({
                              id: doc.id,
                              path: doc.path,
                              original_name: doc.original_name,
                              mime_type: doc.mime_type,
                              size: doc.size,
                          }))
                        : undefined

                return {
                    daily_progress_detail_id:
                        task.daily_progress_detail_id,
                    status: state.status,
                    ...(detailNotes ? { notes: detailNotes } : {}),
                    ...(detailDocuments ? { documents: detailDocuments } : {}),
                }
            }),
            findings:
                payloadFindings.length === 0
                    ? undefined
                    : payloadFindings,
        })

        if (!result.success) {
            setIsSubmitting(false)
            setErrorMessage(result.message)
            return
        }

        const createdReport = result.data

        if (createdReport === undefined) {
            setIsSubmitting(false)
            setErrorMessage(
                'Progress Report berhasil dibuat, tetapi response server tidak lengkap.',
            )
            return
        }

        const generalFiles = getNoteFiles(generalNotes)

        if (generalFiles.length > 0) {
            const uploadResult =
                await progressReportApi.uploadDocuments(
                    createdReport.id,
                    generalFiles,
                )

            if (!uploadResult.success) {
                setIsSubmitting(false)
                setErrorMessage(uploadResult.message)
                return
            }
        }

        for (const finding of submittedFindings) {
            const findingFiles = getNoteFiles(finding.notes)

            if (findingFiles.length === 0) {
                continue
            }

            const createdFinding =
                createdReport.findings.find((item) => {
                    if (
                        item.source_type !==
                        finding.source_type
                    ) {
                        return false
                    }

                    if (item.source_type === 'master') {
                        return (
                            item.master_task?.id ===
                            finding.als_job_task_id
                        )
                    }

                    return (
                        item.additional_task?.id ===
                        finding.als_task_additional_detail_id
                    )
                })

            if (createdFinding === undefined) {
                continue
            }

            const uploadResult =
                await progressReportApi.uploadFindingDocuments(
                    createdReport.id,
                    createdFinding.id,
                    findingFiles,
                )

            if (!uploadResult.success) {
                setIsSubmitting(false)
                setErrorMessage(uploadResult.message)
                return
            }
        }

        setIsSubmitting(false)
        navigate('/progress-report')
    }

    const renderNoteRows = (
        notes: NoteForm[],
        options: {
            placeholder: string
            onAdd: () => void
            onRemove: (noteIndex: number) => void
            onNoteChange: (
                noteIndex: number,
                value: string,
            ) => void
            onDocumentChange: (
                noteIndex: number,
                file: File | null,
            ) => void
            disabled?: boolean
        },
    ) => {
        const isDisabled = options.disabled === true

        return (
            <div className="progress-report-note-list">
                {notes.map((note, noteIndex) => (
                    <div
                        className="progress-report-note-row"
                        key={noteIndex}
                    >
                        <textarea
                            className="form-control"
                            rows={2}
                            value={note.catatan}
                            placeholder={options.placeholder}
                            disabled={isDisabled}
                            onChange={(event) =>
                                options.onNoteChange(
                                    noteIndex,
                                    event.target.value,
                                )
                            }
                        />

                        <label
                            className={`progress-report-document-input ${isDisabled ? 'disabled' : ''}`}
                        >
                            <i className="bi bi-paperclip" />
                            <span>
                                {note.document === null
                                    ? 'Dokumen'
                                    : note.document.name}
                            </span>
                            <input
                                type="file"
                                accept={documentAccept}
                                disabled={isDisabled}
                                onChange={(event) =>
                                    options.onDocumentChange(
                                        noteIndex,
                                        getFilesFromEvent(event),
                                    )
                                }
                            />
                        </label>

                        <button
                            type="button"
                            className="btn btn-outline-danger"
                            disabled={isDisabled}
                            onClick={() =>
                                options.onRemove(noteIndex)
                            }
                            title="Hapus catatan"
                        >
                            <i className="bi bi-trash" />
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={isDisabled}
                    onClick={options.onAdd}
                >
                    <i className="bi bi-plus-lg me-1" />
                    Tambah Catatan
                </button>
            </div>
        )
    }

    const renderHistoryDocuments = (
        documents: ProgressReportDocument[] | undefined,
    ) => {
        if (
            documents === undefined ||
            documents.length === 0
        ) {
            return null
        }

        return (
            <div className="progress-report-history-documents">
                {documents.map((document) => {
                    const url = getDocumentUrl(document)
                    const name = getDocumentName(document)
                    const isImage = isImageDocument(document)

                    return (
                        <div
                            className="progress-report-history-document"
                            key={document.id}
                        >
                            {url !== null && isImage ? (
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={`Buka gambar ${name}`}
                                >
                                    <img
                                        src={url}
                                        alt={name}
                                    />
                                </a>
                            ) : (
                                <div className="file-placeholder">
                                    <i className="bi bi-file-earmark-text" />
                                </div>
                            )}

                            {url === null ? (
                                <span title={name}>{name}</span>
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

                            {document.size !== undefined && (
                                <span
                                    className="text-muted"
                                    style={{ fontSize: '10.5px' }}
                                >
                                    {formatDocumentSize(document.size)}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderTaskDocuments = (
        documents: ProgressReportDocument[] | undefined,
    ) => {
        if (documents === undefined || documents.length === 0) {
            return (
                <div
                    className="text-muted mt-2"
                    style={{ fontSize: '11.5px', fontStyle: 'italic' }}
                >
                    <i className="bi bi-info-circle me-1" />
                    Belum ada dokumen hasil pekerjaan dari Daily Progress.
                </div>
            )
        }

        return (
            <div className="progress-report-dp-documents mt-2">
                <div className="progress-report-dp-documents-title">
                    <i className="bi bi-paperclip" />
                    <span>Dokumen Hasil Daily Progress ({documents.length}):</span>
                </div>
                <div className="progress-report-history-documents">
                    {documents.map((document) => {
                        const url = getDocumentUrl(document)
                        const name = getDocumentName(document)
                        const isImage = isImageDocument(document)

                        return (
                            <div
                                className="progress-report-history-document"
                                key={document.id}
                            >
                                {url !== null && isImage ? (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={`Buka gambar ${name}`}
                                    >
                                        <img
                                            src={url}
                                            alt={name}
                                        />
                                    </a>
                                ) : (
                                    <div className="file-placeholder">
                                        <i className="bi bi-file-earmark-text" />
                                    </div>
                                )}

                                {url === null ? (
                                    <span title={name}>{name}</span>
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

                                {document.size !== undefined && (
                                    <span
                                        className="text-muted"
                                        style={{ fontSize: '10.5px' }}
                                    >
                                        {formatDocumentSize(document.size)}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    const renderCompletionNote = (
        catatan: string | null | undefined,
    ) => {
        const hasCatatan =
            catatan !== null &&
            catatan !== undefined &&
            catatan.trim() !== ''

        return (
            <div className="progress-report-completion-note">
                <div className="progress-report-completion-note-title">
                    <i className="bi bi-chat-left-text" />
                    <span>Catatan Penyelesaian:</span>
                </div>
                {hasCatatan ? (
                    <div className="progress-report-completion-note-content">
                        {catatan}
                    </div>
                ) : (
                    <div
                        className="text-muted"
                        style={{
                            fontSize: '11.5px',
                            fontStyle: 'italic',
                        }}
                    >
                        Tidak ada catatan penyelesaian dari Daily Progress.
                    </div>
                )}
            </div>
        )
    }

    const renderTaskHistory = (
        task: ProgressReportFormTask,
    ) => {
        if (task.history.length === 0) {
            return null
        }

        return (
            <div className="progress-report-history">
                <strong>History sebelumnya</strong>
                {task.history.map((history) => (
                    <div
                        className="progress-report-history-item"
                        key={`${history.progress_report_id}-${history.tanggal}`}
                    >
                        <div className="progress-report-history-meta">
                            <span>{history.nomor_pr}</span>
                            <span>{history.tanggal}</span>
                            <span
                                className={`progress-report-status ${history.status}`}
                            >
                                {statusLabels[history.status]}
                            </span>
                        </div>

                        {getHistoryNoteText(history) === null ? (
                            <p>Tidak ada catatan.</p>
                        ) : (
                            <p>{getHistoryNoteText(history)}</p>
                        )}

                        {renderHistoryDocuments(
                            history.documents,
                        )}
                    </div>
                ))}
            </div>
        )
    }

    const renderDetailsStep = () => {
        const availableTasks =
            formData?.tasks.filter(
                (task) => !isTaskLockedByProgressReport(task),
            ) ?? []

        const selectedCount =
            formData?.tasks.filter((task) => {
                if (isTaskLockedByProgressReport(task)) {
                    return false
                }
                const state =
                    detailState[task.daily_progress_detail_id] ??
                    getDefaultDetailState(task)
                return state.isSelected
            }).length ?? 0

        return (
            <div className="progress-report-section">
                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                    <div>
                        <h2 className="progress-report-section-title mb-1">
                            Pilih Pekerjaan Daily Progress
                        </h2>
                        <span className="text-muted" style={{ fontSize: '12px' }}>
                            Checklist pekerjaan Daily Progress (status pending maupun selesai) yang akan dimasukkan ke nomor Progress Report ini
                            {formData !== null && ` (${selectedCount}/${availableTasks.length} dipilih)`}.
                        </span>
                    </div>

                    {availableTasks.length > 0 && (
                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleSelectAll(true)}
                            >
                                Pilih Semua
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleSelectAll(false)}
                            >
                                Batal Pilih
                            </button>
                        </div>
                    )}
                </div>

                {formData !== null && formData.daily_progress.length > 0 && (
                    <div
                        className="d-flex align-items-center gap-2 flex-wrap mb-3 p-2 rounded bg-light border"
                        style={{ fontSize: '12px' }}
                    >
                        <i className="bi bi-clock-history text-primary" />
                        <span className="fw-semibold text-secondary">
                            Daily Progress Terkait:
                        </span>
                        {formData.daily_progress.map((dp) => (
                            <span
                                key={dp.id}
                                className="badge bg-white text-dark border shadow-xs"
                            >
                                {dp.nomor}
                                {dp.bulan && dp.tahun
                                    ? ` (Periode ${dp.bulan}/${dp.tahun})`
                                    : ''}
                            </span>
                        ))}
                    </div>
                )}

                {selectedSpkId === '' && (
                    <div className="progress-report-state">
                        Pilih SPK terlebih dahulu.
                    </div>
                )}

                {selectedSpkId !== '' && isLoadingForm && (
                    <div className="progress-report-state">
                        Memuat data form...
                    </div>
                )}

                {selectedSpkId !== '' &&
                    !isLoadingForm &&
                    formErrorMessage !== null && (
                        <div className="progress-report-state error">
                            {formErrorMessage}
                        </div>
                    )}

                {formData !== null &&
                    !isLoadingForm &&
                    formData.tasks.length === 0 && (
                        <div className="progress-report-state">
                            Tidak ada detail Daily Progress pada tanggal ini.
                        </div>
                    )}

                {formData?.tasks.map((task) => {
                    const state =
                        detailState[
                            task.daily_progress_detail_id
                        ] ?? getDefaultDetailState(task)

                    const lockedByProgressReport =
                        isTaskLockedByProgressReport(task)

                    return (
                        <div
                            className={`progress-report-task-card ${
                                !state.isSelected && !lockedByProgressReport
                                    ? 'opacity-75'
                                    : ''
                            }`}
                            key={task.daily_progress_detail_id}
                        >
                            <div className="progress-report-task-main">
                                <input
                                    type="checkbox"
                                    className="form-check-input mt-2"
                                    checked={
                                        !lockedByProgressReport &&
                                        state.isSelected
                                    }
                                    disabled={lockedByProgressReport}
                                    onChange={() =>
                                        handleToggleDetail(task)
                                    }
                                />

                                <div className="progress-report-task-title">
                                    <strong>
                                        {task.task.parent
                                            ?.task_name ??
                                            'Task'}
                                        {' / '}
                                        {task.task.task_name}
                                    </strong>
                                    <div
                                        className="d-flex align-items-center gap-2 flex-wrap text-muted"
                                        style={{ fontSize: '11.5px' }}
                                    >
                                        <span>
                                            Daily Progress #{' '}
                                            {task.daily_progress_id}
                                        </span>
                                        <span>&bull;</span>
                                        <span className="d-inline-flex align-items-center gap-1">
                                            Status DP:{' '}
                                            <span
                                                className={`badge ${
                                                    task.daily_progress_status === 'selesai'
                                                        ? 'bg-success-subtle text-success border border-success-subtle'
                                                        : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                                }`}
                                            >
                                                {statusLabels[task.daily_progress_status] ?? task.daily_progress_status}
                                            </span>
                                        </span>
                                    </div>
                                    {lockedByProgressReport && (
                                        <span className="progress-report-locked-text mt-1">
                                            Sudah dimasukkan ke Progress Report sebelumnya.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Catatan Penyelesaian (Read-only dari Daily Progress) */}
                            {renderCompletionNote(
                                task.daily_progress_catatan,
                            )}

                            {/* Dokumen Hasil Pekerjaan dari Daily Progress (Read-only) */}
                            {renderTaskDocuments(task.documents)}

                            {renderTaskHistory(task)}
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderFindingsStep = () => (
        <div className="progress-report-section">
            <div className="progress-report-finding-heading">
                <h2 className="progress-report-section-title">
                    Temuan
                </h2>
            </div>

            {findings.length === 0 && (
                <div className="progress-report-state">
                    Tidak ada sumber temuan.
                </div>
            )}

            {findings.map((finding, index) => (
                <div
                    className="progress-report-finding-card"
                    key={getFindingKey(finding)}
                >
                    <div className="progress-report-finding-parent">
                        <span>
                            {finding.source_type === 'master'
                                ? 'Master Pekerjaan'
                                : 'Additional Task'}
                        </span>
                        <strong>{finding.task_name}</strong>
                    </div>

                    {renderNoteRows(finding.notes, {
                        placeholder: 'Catatan temuan',
                        onAdd: () => addFindingNote(index),
                        onRemove: (noteIndex) =>
                            removeFindingNote(
                                index,
                                noteIndex,
                            ),
                        onNoteChange: (
                            noteIndex,
                            value,
                        ) =>
                            updateFindingNote(
                                index,
                                noteIndex,
                                { catatan: value },
                            ),
                        onDocumentChange: (
                            noteIndex,
                            file,
                        ) =>
                            updateFindingNote(
                                index,
                                noteIndex,
                                { document: file },
                            ),
                    })}
                </div>
            ))}
        </div>
    )

    const renderInfoStep = () => (
        <div className="progress-report-section">
            <h2 className="progress-report-section-title">
                Informasi Lain & Dokumen Umum
            </h2>

            {selectedSpk !== null && (
                <div className="progress-report-state mb-3">
                    <strong>{selectedSpk.no_spk}</strong>
                    <span>
                        {selectedSpk.note ??
                            selectedSpk.job?.description ??
                            'SPK terpilih'}
                    </span>
                </div>
            )}

            <div className="progress-report-note-list">
                {generalNotes.map((note, noteIndex) => (
                    <div
                        className="progress-report-note-row"
                        key={noteIndex}
                    >
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Judul catatan (opsional)"
                            value={note.judul}
                            onChange={(event) =>
                                updateGeneralNote(
                                    noteIndex,
                                    {
                                        judul: event.target
                                            .value,
                                    },
                                )
                            }
                        />

                        <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Catatan umum Progress Report"
                            value={note.catatan}
                            onChange={(event) =>
                                updateGeneralNote(
                                    noteIndex,
                                    {
                                        catatan:
                                            event.target
                                                .value,
                                    },
                                )
                            }
                        />

                        <label className="progress-report-document-input">
                            <i className="bi bi-paperclip" />
                            <span>
                                {note.document === null
                                    ? 'Dokumen'
                                    : note.document.name}
                            </span>
                            <input
                                type="file"
                                accept={documentAccept}
                                onChange={(event) =>
                                    updateGeneralNote(
                                        noteIndex,
                                        {
                                            document:
                                                getFilesFromEvent(
                                                    event,
                                                ),
                                        },
                                    )
                                }
                            />
                        </label>

                        <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() =>
                                removeGeneralNote(noteIndex)
                            }
                            title="Hapus catatan"
                        >
                            <i className="bi bi-trash" />
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={addGeneralNote}
                >
                    <i className="bi bi-plus-lg me-1" />
                    Tambah Catatan Umum
                </button>
            </div>
        </div>
    )

    return (
        <div className="progress-report-page">
            <div className="progress-report-heading">
                <h1 className="progress-report-title">
                    Tambah Progress Report
                </h1>

                <div className="progress-report-breadcrumb">
                    <span className="active">
                        Progress
                    </span>
                    <span>/</span>
                    <span>Progress Report</span>
                    <span>/</span>
                    <span>Tambah</span>
                </div>
            </div>

            <section className="progress-report-form-page">
                <form onSubmit={handleSubmit}>
                    {errorMessage !== null && (
                        <div
                            className="alert alert-danger"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">
                                Tanggal
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={tanggal}
                                onChange={handleTanggalChange}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">
                                Kode Client
                            </label>
                            <ClientSelect
                                clients={clients}
                                selectedCode={clientCode}
                                isLoading={isLoadingClients}
                                errorMessage={
                                    clientErrorMessage
                                }
                                onSearch={handleClientSearch}
                                onSelect={(client) => {
                                    setClientCode(
                                        client.customer_code,
                                    )
                                    setSelectedSpkId('')
                                }}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">
                                Periode Bulan
                            </label>
                            <select
                                className="form-select"
                                value={periodeBulan}
                                onChange={handlePeriodMonthChange}
                            >
                                <option value="">
                                    Pilih bulan
                                </option>
                                {monthOptions.map((month) => (
                                    <option
                                        key={month.value}
                                        value={month.value}
                                    >
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">
                                Periode Tahun
                            </label>
                            <input
                                type="number"
                                className="form-control"
                                min={2000}
                                max={2100}
                                value={periodeTahun}
                                onChange={handlePeriodYearChange}
                            />
                        </div>

                        <div className="col-12">
                            <label className="form-label">
                                SPK
                            </label>
                            <select
                                className="form-select"
                                value={selectedSpkId}
                                disabled={
                                    clientCode.trim() === '' ||
                                    periodeBulan === '' ||
                                    periodeTahun === '' ||
                                    isLoadingSpks ||
                                    spks.length === 0
                                }
                                onChange={(
                                    event: ChangeEvent<HTMLSelectElement>,
                                ) =>
                                    setSelectedSpkId(
                                        event.target.value ===
                                            ''
                                            ? ''
                                            : Number(
                                                event.target
                                                    .value,
                                            ),
                                    )
                                }
                            >
                                <option value="">
                                    Pilih SPK
                                </option>
                                {spks.map((spk) => (
                                    <option
                                        key={spk.spk_id}
                                        value={spk.spk_id}
                                    >
                                        {getSpkLabel(spk)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isLoadingSpks && (
                        <div className="progress-report-state mt-3">
                            Memuat SPK...
                        </div>
                    )}

                    {!isLoadingSpks &&
                        spkErrorMessage !== null && (
                            <div className="progress-report-state error mt-3">
                                {spkErrorMessage}
                            </div>
                        )}

                    <div className="progress-report-stepper">
                        {steps.map((step, index) => (
                            <button
                                type="button"
                                className={[
                                    'progress-report-step',
                                    step.key === currentStep
                                        ? 'active'
                                        : '',
                                    index < currentStepIndex
                                        ? 'done'
                                        : '',
                                ].join(' ')}
                                key={step.key}
                                disabled={
                                    formData === null ||
                                    index > currentStepIndex + 1
                                }
                                onClick={() => {
                                    if (
                                        index <=
                                        currentStepIndex
                                    ) {
                                        setErrorMessage(null)
                                        setCurrentStep(step.key)
                                        return
                                    }

                                    goToNextStep()
                                }}
                            >
                                <span>{index + 1}</span>
                                {step.label}
                            </button>
                        ))}
                    </div>

                    {currentStep === 'details' &&
                        renderDetailsStep()}

                    {currentStep === 'findings' &&
                        renderFindingsStep()}

                    {currentStep === 'info' && renderInfoStep()}

                    <div className="progress-report-form-footer">
                        <button
                            type="button"
                            className="btn btn-light"
                            disabled={isSubmitting}
                            onClick={() =>
                                navigate('/progress-report')
                            }
                        >
                            Batal
                        </button>

                        {currentStepIndex > 0 && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                disabled={isSubmitting}
                                onClick={goToPreviousStep}
                            >
                                Sebelumnya
                            </button>
                        )}

                        {currentStep !== 'info' && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={
                                    isSubmitting ||
                                    formData === null
                                }
                                onClick={goToNextStep}
                            >
                                Selanjutnya
                            </button>
                        )}

                        {currentStep === 'info' && (
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={
                                    isSubmitting ||
                                    formData === null
                                }
                            >
                                {isSubmitting && (
                                    <span className="spinner-border spinner-border-sm me-2" />
                                )}
                                Simpan
                            </button>
                        )}
                    </div>
                </form>
            </section>
        </div>
    )
}

export default ProgressReportCreatePage
