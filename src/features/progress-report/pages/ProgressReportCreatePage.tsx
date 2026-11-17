import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

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
    ProgressReportFormTemuan,
    ProgressReportSourceType,
    ProgressReportFormTask,
    ProgressReportHistory,
    ProgressReportStatus,
} from '@/features/progress-report/types/progress-report.types'

import { TEMUAN_PRIORITY_OPTIONS } from '@/features/temuan/types/temuan.types'

import '@/features/additional-task/styles/additional-task.scss'
import '@/features/progress-report/styles/progress-report.scss'
import '@/features/temuan/styles/temuan.scss'

interface NoteForm {
    catatan: string
    document: File | null
}

interface FindingNoteForm extends NoteForm {
    priority: number
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
    notes: FindingNoteForm[]
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

const emptyFindingNote = (): FindingNoteForm => ({
    catatan: '',
    priority: 3,
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

interface NavigationState {
    client_code?: string
    als_spk_id?: number | string
    spk_id?: number | string
    no_spk?: string
    bulan?: number | string
    tahun?: number | string
    tanggal?: string
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

const getNoteFiles = (notes: NoteForm[]): File[] => {
    return notes
        .map((note) => note.document)
        .filter((file): file is File => file !== null)
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
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const navState = (location.state as NavigationState | null) ?? null

    const initialClientCode =
        searchParams.get('client_code') ??
        navState?.client_code ??
        ''

    const initialTanggal =
        searchParams.get('tanggal') ??
        navState?.tanggal ??
        getToday()

    const initialBulanParam =
        searchParams.get('bulan') ??
        (navState?.bulan !== undefined ? String(navState.bulan) : null)
    const initialBulan =
        initialBulanParam !== null && initialBulanParam !== ''
            ? Number(initialBulanParam)
            : getMonthFromDate(initialTanggal)

    const initialTahunParam =
        searchParams.get('tahun') ??
        (navState?.tahun !== undefined ? String(navState.tahun) : null)
    const initialTahun =
        initialTahunParam !== null && initialTahunParam !== ''
            ? Number(initialTahunParam)
            : getYearFromDate(initialTanggal)

    const initialSpkIdParam =
        searchParams.get('als_spk_id') ??
        searchParams.get('spk_id') ??
        (navState?.als_spk_id !== undefined ? String(navState.als_spk_id) : null) ??
        (navState?.spk_id !== undefined ? String(navState.spk_id) : null)
    const initialSpkId =
        initialSpkIdParam !== null && initialSpkIdParam !== ''
            ? Number(initialSpkIdParam)
            : null

    const initialNoSpk =
        searchParams.get('no_spk') ??
        navState?.no_spk ??
        ''

    const isForwardedFromDp = Boolean(
        initialSpkId !== null || initialNoSpk.trim() !== '',
    )

    const pendingSpkIdRef = useRef<number | null>(initialSpkId)
    const pendingNoSpkRef = useRef<string | null>(
        initialNoSpk.trim() !== '' ? initialNoSpk.trim() : null,
    )

    const [tanggal, setTanggal] =
        useState<string>(initialTanggal)

    const [periodeBulan, setPeriodeBulan] =
        useState<number | ''>(initialBulan)

    const [periodeTahun, setPeriodeTahun] =
        useState<number | ''>(initialTahun)

    const [clientCode, setClientCode] =
        useState<string>(initialClientCode)

    const [spks, setSpks] =
        useState<DailyProgressFormSpk[]>([])

    const [selectedSpkId, setSelectedSpkId] =
        useState<number | ''>(initialSpkId ?? '')

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

    useEffect(() => {
        if (initialClientCode.trim() !== '') {
            void searchClients(initialClientCode.trim())
        }
    }, [initialClientCode, searchClients])

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

    const displaySpkLabel = useMemo(() => {
        if (selectedSpk) return getSpkLabel(selectedSpk)
        if (formData?.spk) {
            const desc =
                formData.spk.note ??
                formData.spk.job?.description ??
                formData.spk.kode_product_jasa ??
                ''
            return desc
                ? `${formData.spk.no_spk} - ${desc}`
                : formData.spk.no_spk
        }
        return initialNoSpk || (selectedSpkId ? `SPK #${selectedSpkId}` : '')
    }, [selectedSpk, formData, initialNoSpk, selectedSpkId])

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
        pendingSpkIdRef.current = null
        pendingNoSpkRef.current = null
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
        pendingSpkIdRef.current = null
        pendingNoSpkRef.current = null
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
                    let spkList = result.data.spks
                    const targetSpkId = pendingSpkIdRef.current
                    const targetNoSpk = pendingNoSpkRef.current?.trim().toLowerCase()

                    const findSpk = (list: typeof spkList) => {
                        return list.find((spk) => {
                            if (
                                targetSpkId !== null &&
                                (spk.spk_id === targetSpkId ||
                                    spk.source_id === targetSpkId ||
                                    String(spk.spk_id) === String(targetSpkId) ||
                                    String(spk.source_id) === String(targetSpkId))
                            ) {
                                return true
                            }
                            if (
                                targetNoSpk !== undefined &&
                                targetNoSpk !== '' &&
                                spk.no_spk?.trim().toLowerCase() === targetNoSpk
                            ) {
                                return true
                            }
                            return false
                        })
                    }

                    let matchedSpk = findSpk(spkList)

                    // Fallback: Jika SPK tidak ditemukan pada hasil filter bulan/tahun, ambil seluruh SPK client tanpa batasan bulan
                    if (!matchedSpk && (targetSpkId !== null || (targetNoSpk !== undefined && targetNoSpk !== ''))) {
                        try {
                            const allResult = await dailyProgressApi.getFormData({
                                client_code: clientCode,
                            })
                            if (allResult.success && allResult.data?.spks && allResult.data.spks.length > 0) {
                                const fallbackMatch = findSpk(allResult.data.spks)
                                if (fallbackMatch) {
                                    matchedSpk = fallbackMatch
                                    spkList = allResult.data.spks
                                }
                            }
                        } catch {
                            // Abaikan error fallback
                        }
                    }

                    if (!matchedSpk && initialSpkId !== null) {
                        const syntheticSpk: DailyProgressFormSpk = {
                            spk_id: initialSpkId,
                            source_id: initialSpkId,
                            source_pt: '',
                            no_spk: initialNoSpk.trim() !== '' ? initialNoSpk.trim() : `SPK #${initialSpkId}`,
                            client_code: clientCode,
                            kode_product_jasa: null,
                            note: null,
                            jenis: null,
                            periode_awal: null,
                            periode_akhir: null,
                            tanggal: null,
                            status: null,
                            job: null,
                        }
                        spkList = [syntheticSpk, ...spkList]
                        matchedSpk = syntheticSpk
                    }

                    setSpks(spkList)

                    if (matchedSpk) {
                        setSelectedSpkId(matchedSpk.spk_id)
                        pendingSpkIdRef.current = null
                        pendingNoSpkRef.current = null
                    } else if (isForwardedFromDp && initialSpkId !== null) {
                        setSelectedSpkId(initialSpkId)
                    } else {
                        setSelectedSpkId('')
                        resetFormState()
                    }
                    setIsLoadingSpks(false)
                    return
                }

                if (isForwardedFromDp && initialSpkId !== null) {
                    setSelectedSpkId(initialSpkId)
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
                                    notes: [],
                                }),
                            ),
                            ...result.data.finding_sources.additional_tasks.map(
                                (task): FindingForm => ({
                                    source_type: 'additional',
                                    als_task_additional_detail_id:
                                        task.id,
                                    task_name: task.task_name,
                                    notes: [],
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

    const updateFindingNote = (
        findingKey: string,
        noteIndex: number,
        patch: Partial<FindingNoteForm>,
    ): void => {
        setFindings((previous) =>
            previous.map((finding) =>
                getFindingKey(finding) !== findingKey
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

    const addFindingNote = (findingKey: string): void => {
        setFindings((previous) =>
            previous.map((finding) =>
                getFindingKey(finding) !== findingKey
                    ? finding
                    : {
                        ...finding,
                        notes: [
                            ...finding.notes,
                            emptyFindingNote(),
                        ],
                    },
            ),
        )
    }

    const removeFindingNote = (
        findingKey: string,
        noteIndex: number,
    ): void => {
        setFindings((previous) =>
            previous.map((finding) =>
                getFindingKey(finding) !== findingKey
                    ? finding
                    : {
                        ...finding,
                        notes: finding.notes.filter(
                            (_, currentIndex) =>
                                currentIndex !== noteIndex,
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
            ({ task }) =>
                !isTaskLockedByProgressReport(task),
        )
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

        const selectedDetails = getSelectedDetails()

        if (selectedDetails.length === 0) {
            setErrorMessage(
                'Tidak ada pekerjaan Daily Progress yang dapat dimasukkan ke Progress Report.',
            )
            return false
        }

        return true
    }

    const validateFindingsStep = (): boolean => {
        for (const finding of findings) {
            for (const note of finding.notes) {
                if (note.document !== null && note.catatan.trim() === '') {
                    setErrorMessage(
                        'Temuan yang memiliki dokumen wajib memiliki catatan.',
                    )
                    return false
                }
            }
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

        const submittedEntries: Array<{
            payload: CreateProgressReportFindingRequest
            document: File | null
        }> = []

        findings.forEach((finding) => {
            finding.notes.forEach((note) => {
                const text = note.catatan.trim()
                if (text !== '') {
                    submittedEntries.push({
                        payload: {
                            source_type: finding.source_type,
                            ...(finding.source_type === 'master'
                                ? { als_job_task_id: finding.als_job_task_id }
                                : {
                                      als_task_additional_detail_id:
                                          finding.als_task_additional_detail_id,
                                  }),
                            keterangan: text,
                            priority: note.priority ?? 3,
                        },
                        document: note.document,
                    })
                }
            })
        })

        const payloadFindings = submittedEntries.map((entry) => entry.payload)

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
            bulan: Number(periodeBulan),
            tahun: Number(periodeTahun),
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

        for (let i = 0; i < submittedEntries.length; i++) {
            const entry = submittedEntries[i]

            if (entry.document === null) {
                continue
            }

            const createdFinding =
                createdReport.findings[i] ??
                createdReport.findings.find((item) => {
                    if (item.source_type !== entry.payload.source_type) {
                        return false
                    }

                    if (item.source_type === 'master') {
                        return (
                            item.master_task?.id ===
                                entry.payload.als_job_task_id &&
                            item.keterangan === entry.payload.keterangan
                        )
                    }

                    return (
                        item.additional_task?.id ===
                            entry.payload.als_task_additional_detail_id &&
                        item.keterangan === entry.payload.keterangan
                    )
                })

            if (createdFinding === undefined) {
                continue
            }

            const uploadResult =
                await progressReportApi.uploadFindingDocuments(
                    createdReport.id,
                    createdFinding.id,
                    [entry.document],
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

    const renderFindingTaskRow = (finding: FindingForm) => {
        const key = getFindingKey(finding)

        return (
            <div className="temuan-task-row" key={key}>
                <div className="temuan-task-header">
                    <span className="temuan-task-name">{finding.task_name}</span>
                    <button
                        type="button"
                        className="temuan-task-add-btn"
                        onClick={() => addFindingNote(key)}
                    >
                        <i className="bi bi-plus-circle" />
                        <span>Tambah Temuan</span>
                    </button>
                </div>

                {finding.notes.map((note, noteIndex) => (
                    <div className="temuan-task-note-box" key={noteIndex}>
                        <div className="temuan-task-note-top">
                            <div className="temuan-task-note-priority-picker">
                                <label className="priority-picker-label">
                                    Prioritas:
                                </label>
                                <select
                                    className="form-select form-select-sm"
                                    value={note.priority}
                                    onChange={(e) =>
                                        updateFindingNote(key, noteIndex, {
                                            priority: Number(e.target.value),
                                        })
                                    }
                                    style={{
                                        width: 'auto',
                                        minWidth: '160px',
                                    }}
                                >
                                    {TEMUAN_PRIORITY_OPTIONS.map((opt) => (
                                        <option
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <span
                                    className={`temuan-priority-badge p${note.priority}`}
                                >
                                    P{note.priority}
                                </span>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <label
                                    className="progress-report-document-input mb-0"
                                    style={{
                                        height: '28px',
                                        padding: '0 10px',
                                        fontSize: '11.5px',
                                    }}
                                >
                                    <i className="bi bi-paperclip" />
                                    <span>
                                        {note.document === null
                                            ? 'Lampiran'
                                            : note.document.name}
                                    </span>
                                    <input
                                        type="file"
                                        accept={documentAccept}
                                        onChange={(e) =>
                                            updateFindingNote(key, noteIndex, {
                                                document:
                                                    getFilesFromEvent(e),
                                            })
                                        }
                                    />
                                </label>

                                {note.document !== null && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary p-0 px-1"
                                        style={{ height: '28px' }}
                                        title="Hapus Lampiran"
                                        onClick={() =>
                                            updateFindingNote(key, noteIndex, {
                                                document: null,
                                            })
                                        }
                                    >
                                        <i className="bi bi-x" />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="temuan-task-note-delete-btn"
                                    onClick={() =>
                                        removeFindingNote(key, noteIndex)
                                    }
                                    title="Hapus Catatan"
                                >
                                    <i className="bi bi-trash" />
                                    <span>Hapus</span>
                                </button>
                            </div>
                        </div>

                        <div className="temuan-task-note-main flex-column w-100">
                            <textarea
                                className="temuan-task-note-textarea w-100"
                                placeholder="Tulis catatan temuan pada pekerjaan ini..."
                                rows={2}
                                value={note.catatan}
                                onChange={(e) =>
                                    updateFindingNote(key, noteIndex, {
                                        catatan: e.target.value,
                                    })
                                }
                            />
                            {note.document !== null && (
                                <div
                                    className="mt-1 d-inline-flex align-items-center gap-1 text-primary small bg-light px-2 py-1 rounded border"
                                    style={{ fontSize: '11px' }}
                                >
                                    <i className="bi bi-file-earmark-check" />
                                    <span
                                        className="text-truncate"
                                        style={{ maxWidth: '280px' }}
                                    >
                                        {note.document.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
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

                        {renderHistoryDocuments(
                            history.documents,
                        )}
                    </div>
                ))}
            </div>
        )
    }

    const renderTemuansFromDailyProgress = (
        temuans?: ProgressReportFormTemuan[],
        isStep2: boolean = false,
    ) => {
        if (!temuans || temuans.length === 0) {
            return null
        }

        return (
            <div className={isStep2 ? 'mb-4' : 'mt-4 pt-3 border-top'}>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <div>
                        <h2 className="progress-report-section-title mb-1">
                            {isStep2
                                ? 'Temuan Rujukan dari Daily Progress'
                                : 'Penyelesaian Temuan (Daily Progress)'}
                        </h2>
                        <span className="text-muted" style={{ fontSize: '12px' }}>
                            {isStep2
                                ? `Daftar temuan yang ditindaklanjuti pada Daily Progress terkait (${temuans.length} temuan).`
                                : `Daftar temuan yang ditindaklanjuti atau diselesaikan pada Daily Progress ini (${temuans.length} temuan).`}
                        </span>
                    </div>
                </div>

                <div className="d-flex flex-column gap-3">
                    {temuans.map((temuan) => {
                        const taskParentName =
                            temuan.notes?.[0]?.task?.category ||
                            temuan.notes?.[0]?.task?.task_name ||
                            'Temuan'

                        return (
                            <div
                                className="progress-report-task-card"
                                key={temuan.id}
                            >
                                <div className="progress-report-task-main">
                                    <div className="progress-report-task-title flex-grow-1">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                            <strong>
                                                {taskParentName !== 'Temuan' ? `${taskParentName} / ` : ''}
                                                {temuan.nomor}
                                                {temuan.type ? ` (${temuan.type})` : ''}
                                            </strong>
                                            {temuan.dp_followup ? (
                                                <span
                                                    className={`badge ${
                                                        temuan.dp_followup.status === 'selesai'
                                                            ? 'bg-success-subtle text-success border border-success-subtle'
                                                            : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                                    }`}
                                                >
                                                    Status DP:{' '}
                                                    {statusLabels[temuan.dp_followup.status] ??
                                                        temuan.dp_followup.status.toUpperCase()}
                                                </span>
                                            ) : (
                                                <span className="badge bg-secondary-subtle text-secondary border">
                                                    Status: {temuan.status}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className="d-flex align-items-center gap-2 flex-wrap text-muted"
                                            style={{ fontSize: '11.5px' }}
                                        >
                                            {temuan.dp_followup && (
                                                <span>
                                                    Daily Progress #{' '}
                                                    {temuan.dp_followup.daily_progress_nomor ??
                                                        temuan.dp_followup.daily_progress_id}
                                                </span>
                                            )}
                                            {temuan.priority !== undefined && (
                                                <>
                                                    <span>&bull;</span>
                                                    <span>Prioritas {temuan.priority}</span>
                                                </>
                                            )}
                                            {temuan.no_pr && (
                                                <>
                                                    <span>&bull;</span>
                                                    <span>PR Rujukan: {temuan.no_pr}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Uraian Masalah Temuan */}
                                {temuan.notes && temuan.notes.length > 0 && (
                                    <div className="progress-report-completion-note">
                                        <div className="progress-report-completion-note-title">
                                            <i className="bi bi-card-text" />
                                            <span>Uraian Temuan:</span>
                                        </div>
                                        <div className="progress-report-completion-note-content">
                                            {temuan.notes.map((n) => (
                                                <div key={n.id} className="mb-1">
                                                    {n.task?.task_name && n.task.task_name !== taskParentName && (
                                                        <span className="fw-semibold text-secondary me-1">
                                                            [{n.task.task_name}]:
                                                        </span>
                                                    )}
                                                    <span>{n.note}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Solusi atau Alasan Pending dari Daily Progress */}
                                {temuan.dp_followup && (
                                    <div className="progress-report-completion-note">
                                        <div className="progress-report-completion-note-title">
                                            <i className="bi bi-chat-left-text" />
                                            <span>
                                                {temuan.dp_followup.status === 'selesai'
                                                    ? 'Solusi Penyelesaian (Daily Progress):'
                                                    : 'Alasan / Kendala Pending (Daily Progress):'}
                                            </span>
                                        </div>
                                        <div className="progress-report-completion-note-content">
                                            {temuan.dp_followup.status === 'selesai'
                                                ? (temuan.dp_followup.solusi || 'Pekerjaan temuan telah diselesaikan.')
                                                : (temuan.dp_followup.alasan_pending || 'Tindak lanjut temuan masih tertunda.')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    const renderDetailsStep = () => {
        const availableTasks =
            formData?.tasks.filter(
                (task) => !isTaskLockedByProgressReport(task),
            ) ?? []
        return (
            <div className="progress-report-section">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <div>
                        <h2 className="progress-report-section-title mb-1">
                            Detail Pekerjaan Daily Progress
                        </h2>
                        <span className="text-muted" style={{ fontSize: '12px' }}>
                            Daftar seluruh pekerjaan Daily Progress yang dimasukkan ke nomor Progress Report ini
                            {availableTasks.length > 0 && ` (${availableTasks.length} pekerjaan)`}.
                        </span>
                    </div>
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
                    formData.tasks.length === 0 &&
                    (!formData.temuans || formData.temuans.length === 0) && (
                        <div className="progress-report-state">
                            Tidak ada detail maupun temuan Daily Progress pada tanggal ini.
                        </div>
                    )}

                {formData?.tasks.map((task) => {
                    const lockedByProgressReport =
                        isTaskLockedByProgressReport(task)

                    return (
                        <div
                            className={`progress-report-task-card ${
                                lockedByProgressReport ? 'opacity-75' : ''
                            }`}
                            key={task.daily_progress_detail_id}
                        >
                            <div className="progress-report-task-main">
                                <div className="progress-report-task-title flex-grow-1">
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                        <strong>
                                            {task.task?.parent
                                                ?.task_name ??
                                                'Task'}
                                            {' / '}
                                            {task.task?.task_name ?? 'Task'}
                                        </strong>
                                        <span
                                            className={`badge ${
                                                task.daily_progress_status === 'selesai'
                                                    ? 'bg-success-subtle text-success border border-success-subtle'
                                                    : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                            }`}
                                        >
                                            Status DP:{' '}
                                            {statusLabels[task.daily_progress_status] ?? task.daily_progress_status}
                                        </span>
                                    </div>
                                    <div
                                        className="d-flex align-items-center gap-2 flex-wrap text-muted"
                                        style={{ fontSize: '11.5px' }}
                                    >
                                        <span>
                                            Daily Progress #{' '}
                                            {task.daily_progress_id}
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

                {/* Temuan dari Daily Progress */}
                {renderTemuansFromDailyProgress(formData?.temuans, false)}
            </div>
        )
    }

    const renderFindingsStep = () => {
        const masterFindings = findings.filter(
            (f) => f.source_type === 'master',
        )
        const additionalFindings = findings.filter(
            (f) => f.source_type === 'additional',
        )

        return (
            <div className="progress-report-section">
                <div className="progress-report-finding-heading mb-3">
                    <h2 className="progress-report-section-title">
                        Temuan
                    </h2>
                </div>

                {/* Temuan rujukan dari Daily Progress */}
                {renderTemuansFromDailyProgress(formData?.temuans, true)}

                <div className="mb-3">
                    <h3 className="h6 fw-bold text-dark mb-1">
                        Input Temuan Baru Progress Report
                    </h3>
                    <span className="text-muted" style={{ fontSize: '12px' }}>
                        Tambahkan temuan baru hasil pelaksanaan pekerjaan jika ada.
                    </span>
                </div>

                {findings.length === 0 && (!formData?.temuans || formData.temuans.length === 0) && (
                    <div className="progress-report-state mb-4">
                        Tidak ada sumber temuan.
                    </div>
                )}

                {findings.length > 0 && (
                    <>
                        <div className="temuan-task-section mb-4">
                            <div className="daily-progress-panel-heading">
                                <div className="daily-progress-panel-icon info">
                                    <i className="bi bi-list-check" />
                                </div>
                                <div>
                                    <h2>Master Task (Header Task Saja)</h2>
                                    <p>
                                        Pekerjaan utama SPK. Temuan hanya dikaitkan dengan Header / Parent Task utama SPK. Anda dapat mencatat lebih dari 1 temuan per task dengan prioritas masing-masing.
                                    </p>
                                </div>
                            </div>

                            {masterFindings.length === 0 ? (
                                <div className="daily-progress-task-empty">
                                    Tidak ada daftar pekerjaan utama untuk SPK ini.
                                </div>
                            ) : (
                                <div className="temuan-task-group">
                                    {masterFindings.map((finding) =>
                                        renderFindingTaskRow(finding),
                                    )}
                                </div>
                            )}
                        </div>

                        {additionalFindings.length > 0 && (
                            <div className="temuan-task-section mb-4">
                                <div className="daily-progress-panel-heading">
                                    <div className="daily-progress-panel-icon warning">
                                        <i className="bi bi-plus-square" />
                                    </div>
                                    <div>
                                        <h2>Pekerjaan Tambahan (Additional Task)</h2>
                                        <p>
                                            Temuan pada pekerjaan tambahan SPK. Anda dapat mencatat temuan dengan prioritas masing-masing.
                                        </p>
                                    </div>
                                </div>
                                <div className="temuan-task-group">
                                    {additionalFindings.map((finding) =>
                                        renderFindingTaskRow(finding),
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        )
    }

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
                                    pendingSpkIdRef.current = null
                                    pendingNoSpkRef.current = null
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

                        {isForwardedFromDp ? (
                            <div className="col-12">
                                <label className="form-label d-flex align-items-center gap-1">
                                    <i className="bi bi-lock-fill text-secondary" />
                                    <span>Nomor SPK (Terkunci dari Daily Progress)</span>
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light text-muted">
                                        <i className="bi bi-file-earmark-text" />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control bg-light fw-medium"
                                        readOnly
                                        value={displaySpkLabel}
                                    />
                                </div>
                            </div>
                        ) : (
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
                        )}
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
