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
    ProgressReportFormTemuan,
    ProgressReportHistory,
    ProgressReportSourceType,
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
    id?: number
    priority: number
    existingDocuments?: ProgressReportDocument[]
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
    source_type: ProgressReportSourceType
    als_job_task_id?: number
    als_task_additional_detail_id?: number
    task_name: string
    notes: FindingNoteForm[]
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
                        const existingList = (currentReport.findings ?? []).filter(
                            (f) =>
                                f.source_type === 'master' &&
                                f.master_task?.id === task.id,
                        )

                        mappedFindings.push({
                            source_type: 'master',
                            als_job_task_id: task.id,
                            task_name: task.task_name,
                            notes: existingList.map((f) => ({
                                id: f.id,
                                catatan: f.keterangan,
                                priority: f.priority ?? 3,
                                document: null,
                                existingDocuments: f.documents ?? [],
                            })),
                        })
                    })

                    // Additional task sources
                    result.data.finding_sources.additional_tasks.forEach(
                        (task) => {
                            const existingList = (currentReport.findings ?? []).filter(
                                (f) =>
                                    f.source_type === 'additional' &&
                                    f.additional_task?.id === task.id,
                            )

                            mappedFindings.push({
                                source_type: 'additional',
                                als_task_additional_detail_id: task.id,
                                task_name: task.task_name,
                                notes: existingList.map((f) => ({
                                    id: f.id,
                                    catatan: f.keterangan,
                                    priority: f.priority ?? 3,
                                    document: null,
                                    existingDocuments: f.documents ?? [],
                                })),
                            })
                        },
                    )

                    setFindings(mappedFindings)
                } else if (!initialPopulatedRef.current) {
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
                                als_task_additional_detail_id: task.id,
                                task_name: task.task_name,
                                notes: [],
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

    const addFindingNote = (findingKey: string): void => {
        setFindings((previous) =>
            previous.map((finding) =>
                getFindingKey(finding) !== findingKey
                    ? finding
                    : {
                          ...finding,
                          notes: [...finding.notes, emptyFindingNote()],
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
                              (_, noteIdx) => noteIdx !== noteIndex,
                          ),
                      },
            ),
        )
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
                          notes: finding.notes.map((note, noteIdx) =>
                              noteIdx === noteIndex
                                  ? { ...note, ...patch }
                                  : note,
                          ),
                      },
            ),
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
            return !isTaskLockedByProgressReport(task, currentReportDetailIds)
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

        const submittedEntries: Array<{
            payload: EditProgressReportFindingRequest
            document: File | null
        }> = []

        findings.forEach((finding) => {
            finding.notes.forEach((note) => {
                const text = note.catatan.trim()
                if (text !== '') {
                    submittedEntries.push({
                        payload: {
                            id: note.id,
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
            for (let i = 0; i < submittedEntries.length; i++) {
                const entry = submittedEntries[i]
                if (entry.document === null) continue

                const updatedFinding =
                    (entry.payload.id !== undefined
                        ? updatedReport.findings.find(
                              (item) => item.id === entry.payload.id,
                          )
                        : null) ??
                    updatedReport.findings[i] ??
                    updatedReport.findings.find((item) => {
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

                if (updatedFinding !== undefined) {
                    await progressReportApi.uploadFindingDocuments(
                        updatedReport.id,
                        updatedFinding.id,
                        [entry.document],
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

                        {note.existingDocuments &&
                            note.existingDocuments.length > 0 && (
                                <div className="mt-1">
                                    <span
                                        className="text-muted"
                                        style={{ fontSize: '11px' }}
                                    >
                                        Dokumen Lampiran Sebelumnya:
                                    </span>
                                    {renderHistoryDocuments(
                                        note.existingDocuments,
                                    )}
                                </div>
                            )}

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
                (task) =>
                    !isTaskLockedByProgressReport(
                        task,
                        currentReportDetailIds,
                    ),
            ) ?? []

        return (
            <div className="progress-report-section">
                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                    <div>
                        <h2 className="progress-report-section-title mb-1">
                            Pekerjaan Daily Progress
                        </h2>
                        <span
                            className="text-muted"
                            style={{ fontSize: '12px' }}
                        >
                            Daftar seluruh pekerjaan Daily Progress yang dimasukkan ke nomor Progress Report ini
                            {formData !== null &&
                                ` (${availableTasks.length} pekerjaan)`}
                            .
                        </span>
                    </div>
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

                    return (
                        <div
                            className={`progress-report-task-card ${
                                isLocked ? 'opacity-75' : ''
                            }`}
                            key={task.daily_progress_detail_id}
                        >
                            <div className="progress-report-task-main">
                                <div className="progress-report-task-title flex-grow-1">
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                                        <strong>
                                            {task.task?.parent
                                                ?.task_name ?? 'Task'}
                                            {' / '}
                                            {task.task?.task_name ?? 'Task'}
                                        </strong>
                                        <span
                                            className={`badge ${
                                                task.daily_progress_status ===
                                                'selesai'
                                                    ? 'bg-success-subtle text-success border border-success-subtle'
                                                    : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                            }`}
                                        >
                                            Status DP:{' '}
                                            {statusLabels[
                                                task
                                                    .daily_progress_status
                                            ] ??
                                                task.daily_progress_status}
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

                {/* Temuan dari Daily Progress */}
                {renderTemuansFromDailyProgress(
                    currentReport?.dp_temuans ?? formData?.temuans,
                    false,
                )}
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
                {renderTemuansFromDailyProgress(
                    currentReport?.dp_temuans ?? formData?.temuans,
                    true,
                )}

                <div className="mb-3">
                    <h3 className="h6 fw-bold text-dark mb-1">
                        Input Temuan Baru Progress Report
                    </h3>
                    <span className="text-muted" style={{ fontSize: '12px' }}>
                        Tambahkan atau sesuaikan temuan hasil pelaksanaan pekerjaan jika ada.
                    </span>
                </div>

                {findings.length === 0 &&
                    (!currentReport?.dp_temuans || currentReport.dp_temuans.length === 0) &&
                    (!formData?.temuans || formData.temuans.length === 0) && (
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
