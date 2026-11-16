import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import type { DailyProgressFormSpk } from '@/features/daily-progress/types/daily-progress.types'
import { progressReportApi } from '@/features/progress-report/api/progressReportApi'
import type {
    EditProgressReportFindingRequest,
    EditProgressReportRequest,
    ProgressReport,
    ProgressReportDocument,
    ProgressReportFormData,
    ProgressReportFormTask,
    ProgressReportHistory,
    ProgressReportSourceType,
    ProgressReportStatus,
} from '@/features/progress-report/types/progress-report.types'

import '@/features/additional-task/styles/additional-task.scss'
import '@/features/progress-report/styles/progress-report.scss'

interface NoteForm {
    catatan: string
    document: File | null
}

interface GeneralNoteForm extends NoteForm {
    id?: number
    judul: string
}

interface SelectedDetail {
    isSelected: boolean
    status: ProgressReportStatus
}

interface FindingForm {
    id?: number
    source_type: ProgressReportSourceType
    als_job_task_id?: number
    als_task_additional_detail_id?: number
    task_name: string
    priority?: number
    notes: NoteForm[]
    existingDocuments?: ProgressReportDocument[]
}

type EditStep = 'details' | 'findings' | 'info'

const steps: Array<{
    key: EditStep
    label: string
}> = [
    {
        key: 'details',
        label: 'Pilih Pekerjaan Daily Progress',
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

const isTaskLockedByProgressReport = (
    task: ProgressReportFormTask,
    currentReportDetailIds: Set<number>,
): boolean => {
    // Detail yang sudah termasuk dalam Progress Report yang sedang diedit ini tetap valid
    if (currentReportDetailIds.has(task.daily_progress_detail_id)) {
        return false
    }

    return (
        task.is_already_reported === true ||
        task.history.some(
            (history) => history.status === 'selesai',
        )
    )
}

const getHistoryNoteText = (
    history: ProgressReportHistory,
): string | null => {
    const noteList: string[] = []

    if (
        history.notes !== undefined &&
        history.notes.length > 0
    ) {
        history.notes.forEach((note) => {
            const trimmed = note.catatan?.trim()
            if (trimmed) {
                noteList.push(trimmed)
            }
        })
    }

    if (
        history.catatan &&
        history.catatan.trim() !== '' &&
        !noteList.includes(history.catatan.trim())
    ) {
        noteList.push(history.catatan.trim())
    }

    return noteList.length === 0 ? null : noteList.join('\n')
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

const getFindingKey = (finding: FindingForm): string => {
    if (finding.source_type === 'master') {
        return `master-${finding.als_job_task_id ?? ''}`
    }

    return `additional-${finding.als_task_additional_detail_id ?? ''}`
}

const getFilesFromEvent = (
    event: ChangeEvent<HTMLInputElement>,
): File | null => {
    return event.target.files?.[0] ?? null
}

const hasFilledNote = (notes: NoteForm[]): boolean => {
    return notes.some(
        (note) => note.catatan.trim() !== '',
    )
}

const ProgressReportEditPage = () => {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const reportId = Number(id)
    const { employee: authEmployee } = useAuth()

    const [currentReport, setCurrentReport] =
        useState<ProgressReport | null>(null)
    const [isLoadingInitial, setIsLoadingInitial] =
        useState<boolean>(true)
    const [initialErrorMessage, setInitialErrorMessage] =
        useState<string | null>(null)

    const [tanggal, setTanggal] = useState<string>('')
    const [periodeBulan, setPeriodeBulan] =
        useState<number | ''>('')
    const [periodeTahun, setPeriodeTahun] =
        useState<number | ''>('')
    const [clientCode, setClientCode] = useState<string>('')
    const [spks, setSpks] =
        useState<DailyProgressFormSpk[]>([])
    const [selectedSpkId, setSelectedSpkId] =
        useState<number | ''>('')

    const [formData, setFormData] =
        useState<ProgressReportFormData | null>(null)
    const [currentStep, setCurrentStep] =
        useState<EditStep>('details')
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

    const initialPopulatedRef = useRef<boolean>(false)

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
    }, [selectedSpkId, spks])

    const currentReportDetailIds = useMemo(() => {
        const ids = new Set<number>()
        if (currentReport?.details) {
            currentReport.details.forEach((d) => {
                ids.add(d.daily_progress_detail_id)
            })
        }
        return ids
    }, [currentReport])

    // 1. Initial Load: Fetch Progress Report by ID
    useEffect(() => {
        if (Number.isNaN(reportId) || reportId <= 0) {
            queueMicrotask(() => {
                setInitialErrorMessage('ID Progress Report tidak valid.')
                setIsLoadingInitial(false)
            })
            return
        }

        const fetchReport = async (): Promise<void> => {
            setIsLoadingInitial(true)
            setInitialErrorMessage(null)

            const result = await progressReportApi.getById(reportId)

            if (!result.success || result.data === undefined) {
                setInitialErrorMessage(
                    result.message || 'Gagal memuat Progress Report.',
                )
                setIsLoadingInitial(false)
                return
            }

            const report = result.data

            // Permission check: only creator can edit
            if (
                authEmployee &&
                authEmployee.employee_code !== report.created_by
            ) {
                setInitialErrorMessage(
                    'Anda tidak memiliki akses untuk mengedit Progress Report ini. Hanya pembuat yang berhak mengubah.',
                )
                setIsLoadingInitial(false)
                return
            }

            setCurrentReport(report)
            setTanggal(report.tanggal)
            setPeriodeBulan(
                report.bulan ?? getMonthFromDate(report.tanggal),
            )
            setPeriodeTahun(
                report.tahun ?? getYearFromDate(report.tanggal),
            )
            setClientCode(report.client_code)
            setSelectedSpkId(report.spk?.id ?? '')

            if (report.notes && report.notes.length > 0) {
                setGeneralNotes(
                    report.notes.map((n) => ({
                        id: n.id,
                        judul: n.judul ?? '',
                        catatan: n.catatan,
                        document: null,
                    })),
                )
            }

            void searchClients(report.client_code)
            setIsLoadingInitial(false)
        }

        void fetchReport()
    }, [authEmployee, reportId, searchClients])

    // 2. Fetch SPKs when clientCode, bulan, and tahun change
    useEffect(() => {
        if (
            clientCode.trim() === '' ||
            periodeBulan === '' ||
            periodeTahun === ''
        ) {
            queueMicrotask(() => {
                setSpks([])
            })
            return
        }

        const fetchSpks = async (): Promise<void> => {
            setIsLoadingSpks(true)
            setSpkErrorMessage(null)

            const result =
                await dailyProgressApi.getFormData({
                    client_code: clientCode,
                    bulan: Number(periodeBulan),
                    tahun: Number(periodeTahun),
                })

            if (result.success && result.data !== undefined) {
                setSpks(result.data.spks)
                setIsLoadingSpks(false)
                return
            }

            setSpks([])
            setSpkErrorMessage(result.message)
            setIsLoadingSpks(false)
        }

        void fetchSpks()
    }, [clientCode, periodeBulan, periodeTahun])

    // 3. Fetch Form Data when clientCode, selectedSpkId, tanggal, bulan, and tahun change
    useEffect(() => {
        if (
            clientCode.trim() === '' ||
            selectedSpkId === '' ||
            tanggal === '' ||
            periodeBulan === '' ||
            periodeTahun === ''
        ) {
            queueMicrotask(() => {
                setFormData(null)
            })
            return
        }

        const fetchFormData = async (): Promise<void> => {
            setIsLoadingForm(true)
            setFormErrorMessage(null)

            const result =
                await progressReportApi.getFormData({
                    client_code: clientCode,
                    als_spk_id: Number(selectedSpkId),
                    tanggal,
                    bulan: Number(periodeBulan),
                    tahun: Number(periodeTahun),
                })

            if (result.success && result.data !== undefined) {
                const nextDetailState: Record<number, SelectedDetail> = {}

                result.data.tasks.forEach((task) => {
                    const existingDetail = currentReport?.details.find(
                        (d) =>
                            d.daily_progress_detail_id ===
                            task.daily_progress_detail_id,
                    )

                    if (existingDetail) {
                        nextDetailState[task.daily_progress_detail_id] = {
                            isSelected: true,
                            status: existingDetail.status,
                        }
                    } else {
                        const isLocked = isTaskLockedByProgressReport(
                            task,
                            currentReportDetailIds,
                        )

                        nextDetailState[task.daily_progress_detail_id] = {
                            isSelected: !isLocked,
                            status:
                                task.default_progress_report_status ??
                                (task.daily_progress_status === 'pending'
                                    ? 'pending'
                                    : 'selesai'),
                        }
                    }
                })

                setFormData(result.data)
                setDetailState(nextDetailState)

                // Map finding sources with existing findings
                if (!initialPopulatedRef.current && currentReport?.findings) {
                    initialPopulatedRef.current = true

                    const mappedFindings: FindingForm[] = []

                    // Master task sources
                    result.data.finding_sources.master.forEach((task) => {
                        const existing = currentReport.findings.find(
                            (f) =>
                                f.source_type === 'master' &&
                                f.master_task?.id === task.id,
                        )

                        mappedFindings.push({
                            id: existing?.id,
                            source_type: 'master',
                            als_job_task_id: task.id,
                            task_name: task.task_name,
                            priority: existing?.priority ?? 3,
                            notes: existing?.keterangan
                                ? [
                                      {
                                          catatan: existing.keterangan,
                                          document: null,
                                      },
                                  ]
                                : [emptyNote()],
                            existingDocuments: existing?.documents,
                        })
                    })

                    // Additional task sources
                    result.data.finding_sources.additional_tasks.forEach(
                        (task) => {
                            const existing = currentReport.findings.find(
                                (f) =>
                                    f.source_type === 'additional' &&
                                    f.additional_task?.id === task.id,
                            )

                            mappedFindings.push({
                                id: existing?.id,
                                source_type: 'additional',
                                als_task_additional_detail_id: task.id,
                                task_name: task.task_name,
                                priority: existing?.priority ?? 3,
                                notes: existing?.keterangan
                                    ? [
                                          {
                                              catatan: existing.keterangan,
                                              document: null,
                                          },
                                      ]
                                    : [emptyNote()],
                            existingDocuments: existing?.documents,
                        })
                    })

                    setFindings(mappedFindings)
                } else if (!initialPopulatedRef.current) {
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
                                als_task_additional_detail_id: task.id,
                                task_name: task.task_name,
                                notes: [emptyNote()],
                            }),
                        ),
                    ])
                }

                setIsLoadingForm(false)
                return
            }

            setFormData(null)
            setFormErrorMessage(result.message)
            setIsLoadingForm(false)
        }

        void fetchFormData()
    }, [
        clientCode,
        currentReport,
        currentReportDetailIds,
        periodeBulan,
        periodeTahun,
        selectedSpkId,
        tanggal,
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

    const handleToggleDetail = (task: ProgressReportFormTask): void => {
        const key = task.daily_progress_detail_id
        const currentState = detailState[key]
        if (!currentState) return

        if (isTaskLockedByProgressReport(task, currentReportDetailIds)) {
            return
        }

        setDetailState((previous) => ({
            ...previous,
            [key]: {
                ...currentState,
                isSelected: !currentState.isSelected,
            },
        }))
    }

    const handleSelectAll = (select: boolean): void => {
        if (formData === null) {
            return
        }

        setDetailState((previous) => {
            const next = { ...previous }
            formData.tasks.forEach((task) => {
                if (
                    !isTaskLockedByProgressReport(
                        task,
                        currentReportDetailIds,
                    )
                ) {
                    const current =
                        next[task.daily_progress_detail_id] ?? {
                            isSelected: false,
                            status: 'selesai',
                        }
                    next[task.daily_progress_detail_id] = {
                        ...current,
                        isSelected: select,
                    }
                }
            })
            return next
        })
    }

    const addFindingNote = (findingIndex: number): void => {
        setFindings((previous) =>
            previous.map((finding, idx) =>
                idx === findingIndex
                    ? {
                          ...finding,
                          notes: [...finding.notes, emptyNote()],
                      }
                    : finding,
            ),
        )
    }

    const removeFindingNote = (
        findingIndex: number,
        noteIndex: number,
    ): void => {
        setFindings((previous) =>
            previous.map((finding, idx) => {
                if (idx !== findingIndex) return finding

                if (finding.notes.length === 1) {
                    return {
                        ...finding,
                        notes: [emptyNote()],
                    }
                }

                return {
                    ...finding,
                    notes: finding.notes.filter(
                        (_, noteIdx) => noteIdx !== noteIndex,
                    ),
                }
            }),
        )
    }

    const updateFindingNote = (
        findingIndex: number,
        noteIndex: number,
        patch: Partial<NoteForm>,
    ): void => {
        setFindings((previous) =>
            previous.map((finding, idx) => {
                if (idx !== findingIndex) return finding

                const nextNotes = finding.notes.map(
                    (note, noteIdx) =>
                        noteIdx === noteIndex
                            ? { ...note, ...patch }
                            : note,
                )

                return { ...finding, notes: nextNotes }
            }),
        )
    }

    const addGeneralNote = (): void => {
        setGeneralNotes((previous) => [
            ...previous,
            emptyGeneralNote(),
        ])
    }

    const removeGeneralNote = (index: number): void => {
        setGeneralNotes((previous) => {
            if (previous.length === 1) {
                return [emptyGeneralNote()]
            }
            return previous.filter((_, idx) => idx !== index)
        })
    }

    const updateGeneralNote = (
        index: number,
        patch: Partial<GeneralNoteForm>,
    ): void => {
        setGeneralNotes((previous) =>
            previous.map((note, idx) =>
                idx === index ? { ...note, ...patch } : note,
            ),
        )
    }

    const getSelectedDetails = () => {
        if (!formData) return []
        return formData.tasks.filter((task) => {
            const state = detailState[task.daily_progress_detail_id]
            return state?.isSelected === true
        })
    }

    const validateDetailsStep = (): boolean => {
        if (
            formData === null ||
            selectedSpkId === '' ||
            periodeBulan === '' ||
            periodeTahun === ''
        ) {
            setErrorMessage(
                'Pilih client, SPK, tanggal, dan periode terlebih dahulu.',
            )
            return false
        }

        const selected = getSelectedDetails()
        if (selected.length === 0) {
            setErrorMessage(
                'Pilih minimal satu pekerjaan Daily Progress untuk dimasukkan ke Progress Report.',
            )
            return false
        }
        return true
    }

    const validateFindingsStep = (): boolean => {
        return true
    }

    const validateInfoStep = (): boolean => {
        return true
    }

    const goToNextStep = (): void => {
        setErrorMessage(null)

        if (currentStep === 'details') {
            if (!validateDetailsStep()) return
            setCurrentStep('findings')
            return
        }

        if (currentStep === 'findings') {
            if (!validateFindingsStep()) return
            setCurrentStep('info')
        }
    }

    const goToPreviousStep = (): void => {
        setErrorMessage(null)

        if (currentStep === 'info') {
            setCurrentStep('findings')
            return
        }

        if (currentStep === 'findings') {
            setCurrentStep('details')
        }
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (currentReport === null) {
            setErrorMessage('Data Progress Report belum dimuat.')
            return
        }

        if (!selectedSpk) {
            setErrorMessage('SPK harus dipilih.')
            return
        }

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

        const payloadFindings: EditProgressReportFindingRequest[] =
            submittedFindings.map((finding) => {
                const keterangan = finding.notes
                    .map((note) => note.catatan.trim())
                    .filter((note) => note !== '')
                    .join('\n')

                if (finding.source_type === 'master') {
                    return {
                        id: finding.id,
                        source_type: 'master',
                        als_job_task_id: finding.als_job_task_id,
                        keterangan,
                        priority: finding.priority ?? 3,
                    }
                }

                return {
                    id: finding.id,
                    source_type: 'additional',
                    als_task_additional_detail_id:
                        finding.als_task_additional_detail_id,
                    keterangan,
                    priority: finding.priority ?? 3,
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

        const payload: EditProgressReportRequest = {
            tanggal,
            bulan: Number(periodeBulan),
            tahun: Number(periodeTahun),
            client_code: clientCode.trim(),
            als_spk_id: selectedSpk.spk_id,
            notes: payloadNotes.length === 0 ? undefined : payloadNotes,
            details: selectedDetails.map((task) => {
                const state = detailState[task.daily_progress_detail_id]
                return {
                    daily_progress_detail_id:
                        task.daily_progress_detail_id,
                    status: state.status,
                }
            }),
            findings:
                payloadFindings.length === 0
                    ? undefined
                    : payloadFindings,
        }

        const result = await progressReportApi.update(
            currentReport.id,
            payload,
        )

        if (!result.success) {
            setIsSubmitting(false)
            setErrorMessage(result.message)
            return
        }

        const updatedReport = result.data

        if (updatedReport !== undefined) {
            // Upload new general note documents
            const generalFiles = generalNotes
                .map((n) => n.document)
                .filter((file): file is File => file !== null)

            if (generalFiles.length > 0) {
                await progressReportApi.uploadDocuments(
                    updatedReport.id,
                    generalFiles,
                )
            }

            // Upload new finding documents
            for (const finding of submittedFindings) {
                const findingFiles = finding.notes
                    .map((n) => n.document)
                    .filter((file): file is File => file !== null)

                if (findingFiles.length === 0) continue

                const updatedFinding =
                    updatedReport.findings.find((item) => {
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

                if (updatedFinding !== undefined) {
                    await progressReportApi.uploadFindingDocuments(
                        updatedReport.id,
                        updatedFinding.id,
                        findingFiles,
                    )
                }
            }
        }

        setIsSubmitting(false)
        navigate(`/progress-report/${reportId}`)
    }

    const renderHistoryDocuments = (
        documents: ProgressReportDocument[] | undefined,
    ) => {
        if (documents === undefined || documents.length === 0) {
            return null
        }

        return (
            <div className="progress-report-history-documents">
                {documents.map((document) => {
                    const url = getDocumentUrl(document)
                    const name = getDocumentName(document)
                    const isImg = isImageDocument(document)

                    return (
                        <div
                            className="progress-report-history-document"
                            key={document.id}
                        >
                            {url !== null && isImg ? (
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
                        const isImg = isImageDocument(document)

                        return (
                            <div
                                className="progress-report-history-document"
                                key={document.id}
                            >
                                {url !== null && isImg ? (
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

    const renderTaskHistory = (task: ProgressReportFormTask) => {
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

                        {getHistoryNoteText(history) !== null && (
                            <div className="progress-report-history-note">
                                <i className="bi bi-chat-left-text" />
                                <span className="progress-report-history-note-label">
                                    Catatan:
                                </span>
                                <span className="progress-report-history-note-text">
                                    {getHistoryNoteText(history)}
                                </span>
                            </div>
                        )}

                        {renderHistoryDocuments(history.documents)}
                    </div>
                ))}
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

    const renderNoteRows = (
        notes: NoteForm[],
        options: {
            placeholder: string
            onAdd: () => void
            onRemove: (index: number) => void
            onNoteChange: (index: number, value: string) => void
            onDocumentChange: (
                index: number,
                file: File | null,
            ) => void
        },
    ) => (
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
                        onChange={(event) =>
                            options.onNoteChange(
                                noteIndex,
                                event.target.value,
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
                onClick={options.onAdd}
            >
                <i className="bi bi-plus-lg me-1" />
                Tambah Catatan
            </button>
        </div>
    )

    const renderDetailsStep = () => {
        const availableTasks =
            formData?.tasks.filter(
                (task) =>
                    !isTaskLockedByProgressReport(
                        task,
                        currentReportDetailIds,
                    ),
            ) ?? []

        const selectedCount =
            formData?.tasks.filter((task) => {
                if (
                    isTaskLockedByProgressReport(
                        task,
                        currentReportDetailIds,
                    )
                ) {
                    return false
                }
                const state = detailState[task.daily_progress_detail_id]
                return state?.isSelected === true
            }).length ?? 0

        return (
            <div className="progress-report-section">
                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                    <div>
                        <h2 className="progress-report-section-title mb-1">
                            Pilih Pekerjaan Daily Progress
                        </h2>
                        <span
                            className="text-muted"
                            style={{ fontSize: '12px' }}
                        >
                            Checklist pekerjaan Daily Progress yang akan
                            dimasukkan ke nomor Progress Report ini
                            {formData !== null &&
                                ` (${selectedCount}/${availableTasks.length} dipilih)`}
                            .
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

                {formData !== null &&
                    formData.daily_progress.length > 0 && (
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
                    const isLocked = isTaskLockedByProgressReport(
                        task,
                        currentReportDetailIds,
                    )
                    const state =
                        detailState[task.daily_progress_detail_id] ?? {
                            isSelected: false,
                            status: 'selesai',
                        }

                    return (
                        <div
                            className={`progress-report-task-card ${
                                !state.isSelected && !isLocked
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
                                        !isLocked &&
                                        state.isSelected
                                    }
                                    disabled={isLocked}
                                    title={
                                        isLocked
                                            ? 'Sudah dimasukkan ke Progress Report lain'
                                            : undefined
                                    }
                                    onChange={() =>
                                        handleToggleDetail(task)
                                    }
                                />

                                <div className="progress-report-task-title flex-grow-1">
                                    <strong>
                                        {task.task?.parent
                                            ?.task_name ?? 'Task'}
                                        {' / '}
                                        {task.task?.task_name ?? 'Task'}
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
                                                    task.daily_progress_status ===
                                                    'selesai'
                                                        ? 'bg-success-subtle text-success border border-success-subtle'
                                                        : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                                }`}
                                            >
                                                {statusLabels[
                                                    task
                                                        .daily_progress_status
                                                ] ??
                                                    task.daily_progress_status}
                                            </span>
                                        </span>
                                    </div>

                                    {isLocked && (
                                        <span className="progress-report-locked-text mt-1">
                                            Sudah dimasukkan ke Progress
                                            Report sebelumnya.
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
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                        <div className="progress-report-finding-parent mb-0">
                            <span>
                                {finding.source_type === 'master'
                                    ? 'Master Pekerjaan'
                                    : 'Additional Task'}
                            </span>
                            <strong>{finding.task_name}</strong>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <label className="form-label mb-0 small text-secondary fw-semibold" style={{ fontSize: '11.5px' }}>
                                Prioritas:
                            </label>
                            <select
                                className="form-select form-select-sm"
                                style={{ width: '150px', fontSize: '12px' }}
                                value={finding.priority ?? 3}
                                onChange={(e) =>
                                    setFindings((prev) =>
                                        prev.map((f, i) =>
                                            i === index ? { ...f, priority: Number(e.target.value) } : f
                                        )
                                    )
                                }
                            >
                                <option value={1}>1 - Rendah</option>
                                <option value={2}>2 - Minor</option>
                                <option value={3}>3 - Sedang (Default)</option>
                                <option value={4}>4 - Tinggi</option>
                                <option value={5}>5 - Kritis</option>
                            </select>
                        </div>
                    </div>

                    {finding.existingDocuments &&
                        finding.existingDocuments.length > 0 && (
                            <div className="mb-2">
                                <span
                                    className="text-muted"
                                    style={{ fontSize: '11.5px' }}
                                >
                                    Dokumen Temuan Terlampir Sebelumnya:
                                </span>
                                {renderHistoryDocuments(
                                    finding.existingDocuments,
                                )}
                            </div>
                        )}

                    {renderNoteRows(finding.notes, {
                        placeholder: 'Catatan temuan',
                        onAdd: () => addFindingNote(index),
                        onRemove: (noteIndex) =>
                            removeFindingNote(index, noteIndex),
                        onNoteChange: (noteIndex, value) =>
                            updateFindingNote(index, noteIndex, {
                                catatan: value,
                            }),
                        onDocumentChange: (noteIndex, file) =>
                            updateFindingNote(index, noteIndex, {
                                document: file,
                            }),
                    })}
                </div>
            ))}
        </div>
    )

    const renderInfoStep = () => (
        <div className="progress-report-section">
            <h2 className="progress-report-section-title">
                Informasi Lain &amp; Dokumen Umum
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

            {currentReport?.documents &&
                currentReport.documents.length > 0 && (
                    <div className="mb-3">
                        <span
                            className="text-muted fw-medium d-block mb-1"
                            style={{ fontSize: '12px' }}
                        >
                            Dokumen Umum yang Terlampir Sebelumnya:
                        </span>
                        {renderHistoryDocuments(currentReport.documents)}
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
                                updateGeneralNote(noteIndex, {
                                    judul: event.target.value,
                                })
                            }
                        />

                        <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Catatan umum Progress Report"
                            value={note.catatan}
                            onChange={(event) =>
                                updateGeneralNote(noteIndex, {
                                    catatan: event.target.value,
                                })
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
                                    updateGeneralNote(noteIndex, {
                                        document:
                                            getFilesFromEvent(event),
                                    })
                                }
                            />
                        </label>

                        <button
                            type="button"
                            className="btn btn-outline-danger"
                            disabled={generalNotes.length === 1}
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

    if (isLoadingInitial) {
        return (
            <div className="progress-report-page">
                <div className="progress-report-loading my-5 text-center">
                    <div
                        className="spinner-border text-primary"
                        role="status"
                    />
                    <div className="mt-2 text-muted">
                        Memuat data Progress Report...
                    </div>
                </div>
            </div>
        )
    }

    if (initialErrorMessage !== null || currentReport === null) {
        return (
            <div className="progress-report-page">
                <div className="alert alert-danger my-4" role="alert">
                    {initialErrorMessage ??
                        'Progress Report tidak ditemukan.'}
                </div>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/progress-report')}
                >
                    <i className="bi bi-arrow-left me-1" />
                    Kembali
                </button>
            </div>
        )
    }

    return (
        <div className="progress-report-page">
            <div className="progress-report-heading">
                <h1 className="progress-report-title">
                    Edit Progress Report
                </h1>

                <div className="progress-report-breadcrumb">
                    <span>Progress</span>
                    <span>/</span>
                    <span>Progress Report</span>
                    <span>/</span>
                    <span className="active">
                        Edit ({currentReport.nomor})
                    </span>
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
                        <div className="col-md-2">
                            <label className="form-label">
                                Nomor PR
                            </label>
                            <input
                                type="text"
                                className="form-control bg-light"
                                value={currentReport.nomor}
                                readOnly
                                disabled
                            />
                        </div>

                        <div className="col-md-2">
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
                                errorMessage={clientErrorMessage}
                                onSearch={handleClientSearch}
                                onSelect={(client) => {
                                    setClientCode(client.customer_code)
                                    setSelectedSpkId('')
                                }}
                            />
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">
                                Periode Bulan
                            </label>
                            <select
                                className="form-select"
                                value={periodeBulan}
                                onChange={handlePeriodMonthChange}
                            >
                                <option value="">Pilih bulan</option>
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
                                onChange={(e) =>
                                    setSelectedSpkId(
                                        e.target.value === ''
                                            ? ''
                                            : Number(e.target.value),
                                    )
                                }
                            >
                                <option value="">
                                    {isLoadingSpks
                                        ? 'Memuat SPK...'
                                        : spks.length === 0
                                          ? 'Tidak ada SPK pada periode ini'
                                          : 'Pilih SPK'}
                                </option>
                                {spks.map((spk) => (
                                    <option
                                        key={spk.spk_id}
                                        value={spk.spk_id}
                                    >
                                        {spk.no_spk} -{' '}
                                        {spk.job?.description ??
                                            'Tanpa Deskripsi'}
                                    </option>
                                ))}
                            </select>
                            {spkErrorMessage !== null && (
                                <div className="progress-report-state error mt-2">
                                    {spkErrorMessage}
                                </div>
                            )}
                        </div>
                    </div>

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
                                    if (index <= currentStepIndex) {
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
                                navigate(`/progress-report/${reportId}`)
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
                                Simpan Perubahan
                            </button>
                        )}
                    </div>
                </form>
            </section>
        </div>
    )
}

export default ProgressReportEditPage
