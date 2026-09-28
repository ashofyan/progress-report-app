import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import {
    useNavigate,
    useParams,
} from 'react-router-dom'

import { additionalTaskApi } from '@/features/additional-task/api/additionalTaskApi'
import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import type { AdditionalTask } from '@/features/additional-task/types/additional-task.types'
import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import { temuanApi } from '@/features/temuan/api/temuanApi'
import type {
    DailyProgress,
    DailyProgressFormData,
    DailyProgressFormJobTask,
    DailyProgressFormJobTaskChild,
    DailyProgressFormSpk,
    DailyProgressFormTaskHistory,
    DailyProgressStatus,
    DailyProgressTemuan,
    EditDailyProgressRequest,
} from '@/features/daily-progress/types/daily-progress.types'

import '@/features/daily-progress/styles/daily-progress.scss'

interface SelectedTask {
    key: string
    id?: number | null
    als_job_id: number
    als_job_task_id?: number
    als_task_additional_detail_id?: number
    status?: DailyProgressStatus
    catatan?: string | null
}

interface PendingMasterTask {
    detailId: number
    dailyProgressId: number
    nomor: string
    tanggal: string
    taskId: number
    taskName: string
    parentName: string
    catatan?: string | null
}

type ChildProgressHistory =
    | DailyProgressFormTaskHistory
    | NonNullable<DailyProgressFormJobTaskChild['last_progress_report']>

const progressStatusLabels: Record<string, string> = {
    open: 'Open',
    pending: 'Pending',
    batal: 'Batal',
    selesai: 'Selesai',
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

const getChildLastProgress = (
    child: DailyProgressFormJobTaskChild,
): ChildProgressHistory | null => {
    return child.last_progress_report ?? null
}

const getProgressDetailId = (
    progress: ChildProgressHistory,
): number => {
    return progress.progress_report_detail_id
}

const getProgressHeaderId = (
    progress: ChildProgressHistory,
): number => {
    return progress.progress_report_id
}

const getProgressNoteText = (
    progress: ChildProgressHistory,
): string | null => {
    if (
        'notes' in progress &&
        progress.notes !== undefined &&
        progress.notes.length > 0
    ) {
        const notes = progress.notes
            .map((note) => note.catatan.trim())
            .filter((note) => note !== '')

        return notes.length === 0 ? null : notes.join('\n')
    }

    return progress.catatan ?? null
}

const getChildHistory = (
    child: DailyProgressFormJobTaskChild,
): ChildProgressHistory[] => {
    if (
        child.history !== undefined &&
        child.history.length > 0
    ) {
        return child.history
    }

    const lastProgress = getChildLastProgress(child)

    return lastProgress === null ? [] : [lastProgress]
}

const getPendingMasterTasks = (
    tasks: DailyProgressFormJobTask[],
): PendingMasterTask[] => {
    return tasks.flatMap((parent) =>
        parent.children
            .filter(
                (child) =>
                    getChildLastProgress(child)?.status === 'pending',
            )
            .map((child) => {
                const progress = getChildLastProgress(child)

                return {
                    detailId:
                        progress === null
                            ? child.id
                            : getProgressDetailId(progress),
                    dailyProgressId:
                        progress === null
                            ? 0
                            : getProgressHeaderId(progress),
                    nomor: progress?.nomor ?? '-',
                    tanggal: progress?.tanggal ?? '-',
                    taskId: child.id,
                    taskName: child.task_name,
                    parentName: parent.task_name,
                    catatan:
                        progress === null
                            ? null
                            : getProgressNoteText(progress),
                }
            }),
    )
}

const hasChildPending = (
    child: DailyProgressFormJobTaskChild,
): boolean => {
    return getChildLastProgress(child)?.status === 'pending'
}

const isChildCompleted = (
    child: DailyProgressFormJobTaskChild,
): boolean => {
    return getChildLastProgress(child)?.status === 'selesai'
}

const isMasterChildPending = (
    child: DailyProgressFormJobTaskChild,
): boolean => {
    return hasChildPending(child)
}

const DailyProgressCorrectionPage = () => {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()

    const [currentProgress, setCurrentProgress] =
        useState<DailyProgress | null>(null)
    const [isLoadingInitial, setIsLoadingInitial] =
        useState<boolean>(true)
    const [initialErrorMessage, setInitialErrorMessage] =
        useState<string | null>(null)

    const [tanggal, setTanggal] = useState<string>('')
    const [periodeBulan, setPeriodeBulan] = useState<number | ''>('')
    const [periodeTahun, setPeriodeTahun] = useState<number | ''>('')
    const [clientCode, setClientCode] = useState<string>('')
    const [selectedSpkId, setSelectedSpkId] = useState<number | ''>('')

    const [selectedTasks, setSelectedTasks] = useState<SelectedTask[]>([])
    const [selectedFindingIds, setSelectedFindingIds] = useState<number[]>([])
    const [selectedTemuanIds, setSelectedTemuanIds] = useState<number[]>([])

    const [formData, setFormData] = useState<DailyProgressFormData | null>(null)
    const [additionalTasks, setAdditionalTasks] = useState<AdditionalTask[]>([])
    const [openTemuans, setOpenTemuans] = useState<DailyProgressTemuan[]>([])

    const [isLoadingFormData, setIsLoadingFormData] = useState<boolean>(false)
    const [isLoadingAdditional, setIsLoadingAdditional] = useState<boolean>(false)
    const [isLoadingTemuans, setIsLoadingTemuans] = useState<boolean>(false)

    const [formDataErrorMessage, setFormDataErrorMessage] =
        useState<string | null>(null)
    const [additionalErrorMessage, setAdditionalErrorMessage] =
        useState<string | null>(null)
    const [temuanErrorMessage, setTemuanErrorMessage] =
        useState<string | null>(null)

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const initialDetailMapRef = useRef<Map<string, SelectedTask>>(new Map())
    const initialSpkMatchedRef = useRef<boolean>(false)

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    // 1. Fetch existing Daily Progress by ID
    useEffect(() => {
        const fetchExistingProgress = async (): Promise<void> => {
            const progressId = Number(id)
            if (id === undefined || Number.isNaN(progressId)) {
                setInitialErrorMessage('ID Daily Progress tidak valid.')
                setIsLoadingInitial(false)
                return
            }

            setIsLoadingInitial(true)
            setInitialErrorMessage(null)

            const result = await dailyProgressApi.getById(progressId)

            setIsLoadingInitial(false)

            if (!result.success || result.data === undefined) {
                setInitialErrorMessage(result.message)
                return
            }

            const dp = result.data
            setCurrentProgress(dp)
            setTanggal(dp.tanggal)
            setClientCode(dp.client_code)
            setPeriodeBulan(dp.bulan)
            setPeriodeTahun(dp.tahun)

            setSelectedFindingIds(
                (dp.findings ?? []).map((f) => f.id),
            )
            setSelectedTemuanIds(
                (dp.temuans ?? []).map((t) => t.id),
            )

            const detailMap = new Map<string, SelectedTask>()
            const initialTasks: SelectedTask[] = dp.details.map((detail) => {
                const key = detail.als_job_task_id
                    ? `master-${detail.als_job_task_id}`
                    : `additional-${detail.als_task_additional_detail_id}`

                const taskItem: SelectedTask = {
                    key,
                    id: detail.id,
                    als_job_id: detail.als_job_id,
                    als_job_task_id: detail.als_job_task_id ?? undefined,
                    als_task_additional_detail_id:
                        detail.als_task_additional_detail_id ?? undefined,
                    status: detail.status,
                    catatan: detail.catatan,
                }

                detailMap.set(key, taskItem)
                return taskItem
            })

            initialDetailMapRef.current = detailMap
            setSelectedTasks(initialTasks)
        }

        void fetchExistingProgress()
    }, [id])

    // 2. Fetch Form Data when clientCode, periodeBulan, periodeTahun are present
    useEffect(() => {
        if (
            clientCode.trim() === '' ||
            periodeBulan === '' ||
            periodeTahun === ''
        ) {
            setFormData(null)
            setSelectedSpkId('')
            return
        }

        const fetchFormData = async (): Promise<void> => {
            setIsLoadingFormData(true)
            setFormDataErrorMessage(null)

            const result = await dailyProgressApi.getFormData({
                client_code: clientCode.trim(),
                bulan:
                    typeof periodeBulan === 'number'
                        ? periodeBulan
                        : undefined,
                tahun:
                    typeof periodeTahun === 'number'
                        ? periodeTahun
                        : undefined,
            })

            if (result.success && result.data !== undefined) {
                setFormData(result.data)
                setIsLoadingFormData(false)

                // Match initial SPK on first successful load
                if (
                    !initialSpkMatchedRef.current &&
                    currentProgress !== null
                ) {
                    initialSpkMatchedRef.current = true

                    const spks = result.data.spks
                    const matchedSpk =
                        spks.find((spk) => {
                            if (currentProgress.als_spk_id) {
                                return spk.spk_id === currentProgress.als_spk_id
                            }
                            if (currentProgress.spk_id) {
                                return spk.spk_id === currentProgress.spk_id
                            }
                            return spk.no_spk === currentProgress.no_spk
                        }) ?? null

                    if (matchedSpk !== null) {
                        setSelectedSpkId(matchedSpk.spk_id)
                    }
                }
                return
            }

            setFormData(null)
            setSelectedSpkId('')
            setFormDataErrorMessage(result.message)
            setIsLoadingFormData(false)
        }

        void fetchFormData()
    }, [clientCode, periodeBulan, periodeTahun, currentProgress])

    const selectedSpk = useMemo(() => {
        return (
            formData?.spks.find(
                (spk) => spk.spk_id === selectedSpkId,
            ) ?? null
        )
    }, [formData?.spks, selectedSpkId])

    const selectedJob = selectedSpk?.job ?? null

    // 3. Fetch Additional Tasks when clientCode and selectedJob change
    useEffect(() => {
        if (clientCode.trim() === '' || selectedJob === null) {
            setAdditionalTasks([])
            return
        }

        const fetchAdditionalTasks = async (): Promise<void> => {
            setIsLoadingAdditional(true)
            setAdditionalErrorMessage(null)

            const result = await additionalTaskApi.getAll({
                client_code: clientCode,
                job_id: selectedJob.id,
            })

            if (result.success && result.data !== undefined) {
                setAdditionalTasks(result.data)
                setIsLoadingAdditional(false)
                return
            }

            setAdditionalTasks([])
            setAdditionalErrorMessage(result.message)
            setIsLoadingAdditional(false)
        }

        void fetchAdditionalTasks()
    }, [clientCode, selectedJob])

    // 4. Fetch Open Temuans when clientCode and selectedSpk change
    useEffect(() => {
        if (clientCode.trim() === '' || selectedSpk === null) {
            setOpenTemuans([])
            return
        }

        const fetchOpenTemuans = async (): Promise<void> => {
            setIsLoadingTemuans(true)
            setTemuanErrorMessage(null)

            const result = await temuanApi.getAll({
                client_code: clientCode.trim(),
                als_spk_id: selectedSpk.spk_id,
                status: 'open',
            })

            setIsLoadingTemuans(false)

            if (result.success && result.data !== undefined) {
                setOpenTemuans(
                    result.data.map((temuan) => ({
                        id: temuan.id,
                        nomor: temuan.nomor,
                        tanggal: temuan.tanggal,
                        status: temuan.status,
                        notes: temuan.notes.map((note) => ({
                            id: note.id,
                            task: note.task,
                            note: note.note,
                        })),
                        spk_id: temuan.spk?.id,
                        als_spk_id: temuan.spk?.id,
                    })),
                )
                return
            }

            setOpenTemuans([])
            setTemuanErrorMessage(result.message)
        }

        void fetchOpenTemuans()
    }, [clientCode, selectedSpk])

    const selectedFindings = useMemo(() => {
        if (selectedSpk === null) {
            return []
        }

        const findingsFromSpk =
            selectedSpk.findings !== undefined
                ? selectedSpk.findings
                : (formData?.findings ?? []).filter(
                    (finding) =>
                        (finding.spk_id === undefined &&
                            finding.als_spk_id === undefined) ||
                        finding.spk_id === selectedSpk.spk_id ||
                        finding.als_spk_id === selectedSpk.spk_id,
                )

        // Also make sure currently attached findings on this DP are present
        const findingMap = new Map<number, typeof findingsFromSpk[number]>()
        findingsFromSpk.forEach((f) => findingMap.set(f.id, f))

        ;(currentProgress?.findings ?? []).forEach((f) => {
            if (!findingMap.has(f.id)) {
                findingMap.set(f.id, {
                    id: f.id,
                    progress_report_id: f.progress_report_id,
                    nomor_pr: f.nomor_pr,
                    tanggal: f.tanggal,
                    source_type: f.source_type,
                    keterangan: f.keterangan,
                    status: f.status,
                    spk_id: selectedSpk.spk_id,
                    als_spk_id: selectedSpk.spk_id,
                })
            }
        })

        return Array.from(findingMap.values())
    }, [formData?.findings, selectedSpk, currentProgress?.findings])

    const selectedTemuans = useMemo(() => {
        if (selectedSpk === null) {
            return []
        }

        const temuanMap = new Map<number, DailyProgressTemuan>()

        ;[
            ...(selectedSpk.temuans ?? []),
            ...(formData?.temuans ?? []).filter(
                (temuan) =>
                    (temuan.spk_id === undefined &&
                        temuan.als_spk_id === undefined) ||
                    temuan.spk_id === selectedSpk.spk_id ||
                    temuan.als_spk_id === selectedSpk.spk_id,
            ),
            ...openTemuans,
            ...(currentProgress?.temuans ?? []),
        ].forEach((temuan) => {
            temuanMap.set(temuan.id, temuan)
        })

        return Array.from(temuanMap.values())
    }, [formData?.temuans, openTemuans, selectedSpk, currentProgress?.temuans])

    const pendingMasterTasks = useMemo(() => {
        return getPendingMasterTasks(selectedJob?.tasks ?? [])
    }, [selectedJob?.tasks])

    const carriedPendingTasks = useMemo<SelectedTask[]>(() => {
        if (selectedJob === null) {
            return []
        }

        const carriedTasks = new Map<string, SelectedTask>()

        pendingMasterTasks.forEach((pending) => {
            const key = `master-${pending.taskId}`
            const original = initialDetailMapRef.current.get(key)

            carriedTasks.set(key, {
                key,
                id: original?.id,
                als_job_id: selectedJob.id,
                als_job_task_id: pending.taskId,
                status: original?.status ?? 'open',
                catatan: original?.catatan ?? null,
            })
        })

        return Array.from(carriedTasks.values())
    }, [pendingMasterTasks, selectedJob])

    const carriedPendingTaskKeys = useMemo(() => {
        return new Set(carriedPendingTasks.map((task) => task.key))
    }, [carriedPendingTasks])

    const carriedTaskKeys = useMemo(() => {
        return new Set(
            pendingMasterTasks.map((pending) => `master-${pending.taskId}`),
        )
    }, [pendingMasterTasks])

    // Crucial: Exclude currentProgress.id so tasks in THIS DP are not blocked as already in DP
    const existingDailyProgressTaskKeys = useMemo(() => {
        const keys = new Set<string>()
        const dailyProgresses = formData?.daily_progresses ?? []

        dailyProgresses.forEach((dp) => {
            if (dp.id === currentProgress?.id) {
                return
            }

            dp.details?.forEach((detail) => {
                if (detail.als_job_task_id) {
                    keys.add(`master-${detail.als_job_task_id}`)
                }
                if (detail.als_task_additional_detail_id) {
                    keys.add(
                        `additional-${detail.als_task_additional_detail_id}`,
                    )
                }
            })
        })

        return keys
    }, [formData?.daily_progresses, currentProgress?.id])

    const isTaskBlocked = (task: SelectedTask): boolean => {
        if (
            carriedTaskKeys.has(task.key) ||
            existingDailyProgressTaskKeys.has(task.key)
        ) {
            return true
        }

        if (
            task.als_job_task_id !== undefined &&
            (carriedTaskKeys.has(`master-${task.als_job_task_id}`) ||
                existingDailyProgressTaskKeys.has(
                    `master-${task.als_job_task_id}`,
                ))
        ) {
            return true
        }

        return (
            task.als_task_additional_detail_id !== undefined &&
            (carriedTaskKeys.has(
                `additional-${task.als_task_additional_detail_id}`,
            ) ||
                existingDailyProgressTaskKeys.has(
                    `additional-${task.als_task_additional_detail_id}`,
                ))
        )
    }

    const handleClientSearch = (keyword: string): void => {
        void searchClients(keyword)
    }

    const handleDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setTanggal(event.target.value)
    }

    const handlePeriodMonthChange = (
        event: ChangeEvent<HTMLSelectElement>,
    ): void => {
        setPeriodeBulan(
            event.target.value === '' ? '' : Number(event.target.value),
        )
        setSelectedSpkId('')
        setSelectedTasks([])
        setSelectedFindingIds([])
        setSelectedTemuanIds([])
        setAdditionalTasks([])
    }

    const handlePeriodYearChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        setPeriodeTahun(
            event.target.value === '' ? '' : Number(event.target.value),
        )
        setSelectedSpkId('')
        setSelectedTasks([])
        setSelectedFindingIds([])
        setSelectedTemuanIds([])
        setAdditionalTasks([])
    }

    const handleSpkChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const value = event.target.value
        setSelectedSpkId(value === '' ? '' : Number(value))
        setSelectedTasks([])
        setSelectedFindingIds([])
        setSelectedTemuanIds([])
        setAdditionalTasks([])
    }

    const isSelected = (key: string): boolean => {
        return selectedTasks.some((task) => task.key === key)
    }

    const handleToggleTask = (task: SelectedTask): void => {
        setSelectedTasks((previous) => {
            const isCurrentlySelected = previous.some(
                (item) => item.key === task.key,
            )

            if (isCurrentlySelected) {
                // Jika subtask dari master task statusnya sudah selesai, batasi dengan tidak dapat di unchecklist
                if (
                    task.als_job_task_id !== undefined &&
                    task.als_job_task_id !== null
                ) {
                    const original = initialDetailMapRef.current.get(task.key)
                    const current = previous.find(
                        (item) => item.key === task.key,
                    )
                    if (
                        original?.status === 'selesai' ||
                        current?.status === 'selesai'
                    ) {
                        return previous
                    }
                }

                return previous.filter((item) => item.key !== task.key)
            }

            const original = initialDetailMapRef.current.get(task.key)
            const taskToAdd: SelectedTask = original ? { ...original } : task

            return [...previous, taskToAdd]
        })
    }

    const handleToggleFinding = (findingId: number): void => {
        setSelectedFindingIds((previous) => {
            if (previous.includes(findingId)) {
                return previous.filter((findingIdItem) => findingIdItem !== findingId)
            }

            return [...previous, findingId]
        })
    }

    const handleToggleTemuan = (temuanId: number): void => {
        setSelectedTemuanIds((previous) => {
            if (previous.includes(temuanId)) {
                return previous.filter((temuanIdItem) => temuanIdItem !== temuanId)
            }

            return [...previous, temuanId]
        })
    }

    const getTemuanNotes = (temuan: DailyProgressTemuan): string => {
        const notes = (temuan.notes ?? [])
            .map((note) => note.note.trim())
            .filter((note) => note !== '')

        return notes.length === 0 ? 'Tanpa catatan.' : notes.join('\n')
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (currentProgress === null) {
            setErrorMessage('Data Daily Progress belum siap.')
            return
        }

        if (tanggal === '') {
            setErrorMessage('Tanggal wajib diisi.')
            return
        }

        if (clientCode.trim() === '') {
            setErrorMessage('Kode client wajib dipilih.')
            return
        }

        if (periodeBulan === '' || periodeTahun === '') {
            setErrorMessage('Periode bulan dan tahun wajib diisi.')
            return
        }

        if (selectedSpk === null) {
            setErrorMessage('SPK wajib dipilih.')
            return
        }

        if (selectedJob === null) {
            setErrorMessage('SPK terpilih belum memiliki master pekerjaan.')
            return
        }

        const details = [
            ...carriedPendingTasks,
            ...selectedTasks.filter(
                (task) =>
                    !isTaskBlocked(task) &&
                    !carriedPendingTaskKeys.has(task.key),
            ),
        ]

        if (details.length === 0) {
            setErrorMessage('Minimal satu task harus dipilih.')
            return
        }

        setIsSubmitting(true)

        const payload: EditDailyProgressRequest = {
            tanggal,
            client_code: clientCode.trim(),
            als_spk_id: selectedSpk.spk_id,
            bulan: Number(periodeBulan),
            tahun: Number(periodeTahun),
            finding_ids: selectedFindingIds,
            temuan_ids: selectedTemuanIds,
            details: details.map((task) => ({
                id: task.id ?? null,
                als_job_id: task.als_job_id,
                als_job_task_id: task.als_job_task_id ?? null,
                als_task_additional_detail_id:
                    task.als_task_additional_detail_id ?? null,
                status: task.status ?? 'open',
                catatan: task.catatan ?? null,
            })),
        }

        const result = await dailyProgressApi.edit(
            currentProgress.id,
            payload,
        )

        setIsSubmitting(false)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        navigate('/daily-progress')
    }

    if (isLoadingInitial) {
        return (
            <div className="daily-progress-page">
                <div className="daily-progress-loading">
                    <div className="spinner-border" role="status" />
                    <span>Memuat data Daily Progress...</span>
                </div>
            </div>
        )
    }

    if (initialErrorMessage !== null || currentProgress === null) {
        return (
            <div className="daily-progress-page">
                <div className="alert alert-danger" role="alert">
                    {initialErrorMessage ?? 'Daily Progress tidak ditemukan.'}
                </div>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/daily-progress')}
                >
                    Kembali
                </button>
            </div>
        )
    }

    return (
        <div className="daily-progress-page">
            <div className="daily-progress-heading">
                <div>
                    <h1 className="daily-progress-title">
                        Edit Daily Progress
                    </h1>

                    <div className="daily-progress-breadcrumb">
                        <span className="active">Progress</span>

                        <span>/</span>

                        <span>Daily Progress</span>

                        <span>/</span>

                        <span>Edit Form</span>

                        <span>/</span>

                        <span>{currentProgress.nomor}</span>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() =>
                            navigate(
                                `/daily-progress/${currentProgress.id}/edit`,
                            )
                        }
                    >
                        <i className="bi bi-arrow-repeat me-1" />
                        Update Status & Dokumen
                    </button>
                </div>
            </div>

            <section className="daily-progress-form-page">
                <form onSubmit={handleSubmit}>
                    {errorMessage !== null && (
                        <div className="alert alert-danger" role="alert">
                            {errorMessage}
                        </div>
                    )}

                    <div className="row g-3 mb-4">
                        <div className="col">
                            <label className="form-label">Tanggal</label>

                            <input
                                type="date"
                                className="form-control"
                                value={tanggal}
                                onChange={handleDateChange}
                            />
                        </div>

                        <div className="col">
                            <label className="form-label">Kode Client</label>

                            <ClientSelect
                                clients={clients}
                                selectedCode={clientCode}
                                isLoading={isLoadingClients}
                                errorMessage={clientErrorMessage}
                                onSearch={handleClientSearch}
                                onSelect={(client) => {
                                    setClientCode(client.customer_code)
                                    setSelectedSpkId('')
                                    setSelectedTasks([])
                                    setSelectedFindingIds([])
                                    setSelectedTemuanIds([])
                                    setAdditionalTasks([])
                                }}
                            />
                        </div>
                    </div>

                    <div className="row g-3 mb-4">
                        <div className="col-md-3">
                            <label className="form-label">Periode Bulan</label>

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
                            <label className="form-label">Periode Tahun</label>

                            <input
                                type="number"
                                className="form-control"
                                min={2000}
                                max={2100}
                                value={periodeTahun}
                                onChange={handlePeriodYearChange}
                            />
                        </div>

                        <div className="col">
                            <label className="form-label">SPK</label>

                            <select
                                className="form-select"
                                value={selectedSpkId}
                                disabled={
                                    clientCode.trim() === '' ||
                                    periodeBulan === '' ||
                                    periodeTahun === '' ||
                                    isLoadingFormData ||
                                    formData === null
                                }
                                onChange={handleSpkChange}
                            >
                                <option value="">Pilih SPK</option>

                                {formData?.spks.map((spk) => (
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

                    {isLoadingFormData && (
                        <div className="daily-progress-task-empty mb-4">
                            Memuat data form Daily Progress...
                        </div>
                    )}

                    {!isLoadingFormData && formDataErrorMessage !== null && (
                        <div className="daily-progress-task-empty error mb-4">
                            {formDataErrorMessage}
                        </div>
                    )}

                    {!isLoadingFormData &&
                        formDataErrorMessage === null &&
                        clientCode.trim() !== '' &&
                        formData?.spks.length === 0 && (
                            <div className="daily-progress-task-empty mb-4">
                                Tidak ada SPK untuk client dan periode ini.
                            </div>
                        )}

                    <div className="daily-progress-task-section">
                        <div className="daily-progress-panel-heading">
                            <h2>Pending Progress Report</h2>
                        </div>

                        {clientCode.trim() === '' && (
                            <div className="daily-progress-task-empty">
                                Pilih client terlebih dahulu.
                            </div>
                        )}

                        {clientCode.trim() !== '' && selectedSpk === null && (
                            <div className="daily-progress-task-empty">
                                Pilih SPK terlebih dahulu.
                            </div>
                        )}

                        {selectedSpk !== null &&
                            pendingMasterTasks.length === 0 && (
                                <div className="daily-progress-task-empty">
                                    Tidak ada pending dari Progress Report.
                                </div>
                            )}

                        {selectedSpk !== null &&
                            pendingMasterTasks.map((pending) => (
                                <div
                                    className="daily-progress-carry-card"
                                    key={`master-pending-${pending.detailId}`}
                                >
                                    <div>
                                        <strong>
                                            {pending.parentName} /{' '}
                                            {pending.taskName}
                                        </strong>

                                        <span>
                                            {pending.nomor} / {pending.tanggal}
                                        </span>
                                    </div>

                                    <span className="daily-progress-carry-badge">
                                        Pending
                                    </span>
                                </div>
                            ))}
                    </div>

                    <div className="daily-progress-task-section">
                        <div className="daily-progress-panel-heading">
                            <h2>Master Task</h2>
                        </div>

                        {selectedSpk === null && (
                            <div className="daily-progress-task-empty">
                                Pilih SPK terlebih dahulu.
                            </div>
                        )}

                        {selectedSpk !== null && selectedJob === null && (
                            <div className="daily-progress-task-empty">
                                SPK terpilih belum memiliki master pekerjaan.
                            </div>
                        )}

                        {selectedJob !== null &&
                            selectedJob.tasks.map((parent) => {
                                const visibleChildren = parent.children.filter(
                                    (child) => !isMasterChildPending(child),
                                )

                                return (
                                    <div
                                        className="daily-progress-task-group"
                                        key={parent.id}
                                    >
                                        <h3>{parent.task_name}</h3>

                                        {visibleChildren.length === 0 && (
                                            <div className="daily-progress-task-empty compact">
                                                Tidak ada sub task.
                                            </div>
                                        )}

                                        {visibleChildren.map((child) => {
                                            const key = `master-${child.id}`
                                            const originalDetail =
                                                initialDetailMapRef.current.get(
                                                    key,
                                                )
                                            const isOriginalCompleted =
                                                originalDetail?.status ===
                                                'selesai'
                                            const isExternalCompleted =
                                                isChildCompleted(child) &&
                                                !isOriginalCompleted
                                            const isCompleted =
                                                isOriginalCompleted ||
                                                isExternalCompleted
                                            const isAlreadyInDp =
                                                existingDailyProgressTaskKeys.has(
                                                    key,
                                                )
                                            const isSelectedTask =
                                                isSelected(key)
                                            const isChecked =
                                                isOriginalCompleted ||
                                                isSelectedTask
                                            const isDisabled =
                                                isCompleted || isAlreadyInDp
                                            const history =
                                                getChildHistory(child)

                                            return (
                                                <div
                                                    className="daily-progress-task-entry"
                                                    key={key}
                                                >
                                                    <label
                                                        className={`daily-progress-task-option ${
                                                            isDisabled
                                                                ? 'disabled'
                                                                : ''
                                                        }`}
                                                        title={
                                                            isOriginalCompleted
                                                                ? 'Subtask sudah selesai dan tidak dapat di-unchecklist'
                                                                : isExternalCompleted
                                                                    ? 'Subtask sudah selesai di Progress Report'
                                                                    : isAlreadyInDp
                                                                        ? 'Task sudah masuk di Daily Progress lain'
                                                                        : undefined
                                                        }
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            disabled={isDisabled}
                                                            onChange={() => {
                                                                if (
                                                                    isDisabled
                                                                ) {
                                                                    return
                                                                }

                                                                handleToggleTask(
                                                                    {
                                                                        key,
                                                                        als_job_id:
                                                                            selectedJob.id,
                                                                        als_job_task_id:
                                                                            child.id,
                                                                        status: 'open',
                                                                        catatan:
                                                                            null,
                                                                    },
                                                                )
                                                            }}
                                                        />

                                                        <span>
                                                            {child.task_name}
                                                            {isAlreadyInDp && (
                                                                <small className="text-muted ms-2">
                                                                    (Sudah ada
                                                                    di Daily
                                                                    Progress
                                                                    lain)
                                                                </small>
                                                            )}
                                                            {isCompleted && (
                                                                <span className="daily-progress-status selesai ms-2">
                                                                    Selesai
                                                                </span>
                                                            )}
                                                        </span>
                                                    </label>

                                                    {history.length > 0 && (
                                                        <div className="daily-progress-task-history">
                                                            {history.map(
                                                                (progress) => (
                                                                    <div
                                                                        className="daily-progress-task-history-item"
                                                                        key={`${getProgressHeaderId(progress)}-${getProgressDetailId(progress)}`}
                                                                    >
                                                                        <div>
                                                                            <strong>
                                                                                {
                                                                                    progress.nomor
                                                                                }{' '}
                                                                                /{' '}
                                                                                {
                                                                                    progress.tanggal
                                                                                }
                                                                            </strong>

                                                                            <span
                                                                                className={`daily-progress-status ${progress.status}`}
                                                                            >
                                                                                {
                                                                                    progressStatusLabels[
                                                                                        progress
                                                                                            .status
                                                                                    ] ??
                                                                                        progress.status
                                                                                }
                                                                            </span>
                                                                        </div>

                                                                        {progress.catatan !==
                                                                            null && (
                                                                            <p>
                                                                                {
                                                                                    progress.catatan
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                    </div>

                    <div className="daily-progress-task-section mt-4">
                        <div className="daily-progress-panel-heading">
                            <h2>Additional Task</h2>
                        </div>

                        {selectedSpk === null && (
                            <div className="daily-progress-task-empty">
                                Pilih SPK terlebih dahulu.
                            </div>
                        )}

                        {selectedSpk !== null && selectedJob === null && (
                            <div className="daily-progress-task-empty">
                                SPK terpilih belum memiliki master pekerjaan.
                            </div>
                        )}

                        {selectedJob !== null && clientCode.trim() === '' && (
                            <div className="daily-progress-task-empty">
                                Pilih client terlebih dahulu.
                            </div>
                        )}

                        {selectedJob !== null &&
                            clientCode.trim() !== '' &&
                            selectedJob.tasks.length === 0 && (
                                <div className="daily-progress-task-empty">
                                    SPK terpilih belum memiliki master
                                    pekerjaan. Pilih client dan SPK terlebih
                                    dahulu.
                                </div>
                            )}

                        {selectedJob !== null && isLoadingAdditional && (
                            <div className="daily-progress-task-empty">
                                Memuat additional task...
                            </div>
                        )}

                        {selectedJob !== null &&
                            !isLoadingAdditional &&
                            additionalErrorMessage !== null && (
                                <div className="daily-progress-task-empty error">
                                    {additionalErrorMessage}
                                </div>
                            )}

                        {selectedJob !== null &&
                            !isLoadingAdditional &&
                            additionalErrorMessage === null &&
                            additionalTasks.length === 0 && (
                                <div className="daily-progress-task-empty">
                                    Tidak ada additional task.
                                </div>
                            )}

                        {selectedJob !== null &&
                            !isLoadingAdditional &&
                            additionalErrorMessage === null &&
                            additionalTasks.map((additionalTask) =>
                                additionalTask.details.map((detail) => (
                                    <div
                                        className="daily-progress-task-group"
                                        key={`${additionalTask.id}-${detail.parent_id}`}
                                    >
                                        <h3>{detail.parent_task}</h3>

                                        {detail.tasks.map((task) => {
                                            const key = `additional-${task.id}`

                                            if (carriedTaskKeys.has(key)) {
                                                return null
                                            }

                                            const isCompleted =
                                                task.status === 'selesai'
                                            const isAlreadyInDp =
                                                existingDailyProgressTaskKeys.has(
                                                    key,
                                                )
                                            const isDisabled =
                                                isCompleted || isAlreadyInDp

                                            return (
                                                <label
                                                    className={`daily-progress-task-option ${
                                                        isDisabled
                                                            ? 'disabled'
                                                            : ''
                                                    }`}
                                                    key={key}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            isDisabled
                                                                ? false
                                                                : isSelected(
                                                                    key,
                                                                )
                                                        }
                                                        disabled={isDisabled}
                                                        onChange={() => {
                                                            if (isDisabled) {
                                                                return
                                                            }
                                                            handleToggleTask({
                                                                key,
                                                                als_job_id:
                                                                    additionalTask
                                                                        .job.id,
                                                                als_task_additional_detail_id:
                                                                    task.id,
                                                            })
                                                        }}
                                                    />

                                                    <span>
                                                        {task.task_name}
                                                        {isAlreadyInDp && (
                                                            <small className="text-muted ms-2">
                                                                (Sudah ada di
                                                                Daily Progress
                                                                lain)
                                                            </small>
                                                        )}
                                                    </span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                )),
                            )}
                    </div>

                    <div className="daily-progress-task-section mt-4">
                        <div className="daily-progress-panel-heading">
                            <h2>Temuan Progress Report</h2>
                        </div>

                        {selectedSpk === null && (
                            <div className="daily-progress-task-empty">
                                Pilih SPK terlebih dahulu.
                            </div>
                        )}

                        {selectedSpk !== null &&
                            selectedFindings.length === 0 && (
                                <div className="daily-progress-task-empty">
                                    Tidak ada temuan open untuk SPK ini.
                                </div>
                            )}

                        {selectedSpk !== null &&
                            selectedFindings.map((finding) => {
                                const isOpen = finding.status === 'open'

                                return (
                                    <div
                                        className="daily-progress-task-entry"
                                        key={finding.id}
                                    >
                                        <label
                                            className={`daily-progress-task-option ${
                                                isOpen ? '' : 'disabled'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedFindingIds.includes(
                                                    finding.id,
                                                )}
                                                disabled={!isOpen}
                                                onChange={() =>
                                                    handleToggleFinding(
                                                        finding.id,
                                                    )
                                                }
                                            />

                                            <span>{finding.keterangan}</span>
                                        </label>

                                        <div className="daily-progress-task-history">
                                            <div className="daily-progress-task-history-item">
                                                <div>
                                                    <strong>
                                                        {finding.nomor_pr} /{' '}
                                                        {finding.tanggal}
                                                    </strong>

                                                    <span
                                                        className={`daily-progress-status ${finding.status}`}
                                                    >
                                                        {finding.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>

                    <div className="daily-progress-task-section mt-4">
                        <div className="daily-progress-panel-heading">
                            <h2>Temuan Global</h2>
                        </div>

                        {selectedSpk === null && (
                            <div className="daily-progress-task-empty">
                                Pilih SPK terlebih dahulu.
                            </div>
                        )}

                        {selectedSpk !== null && isLoadingTemuans && (
                            <div className="daily-progress-task-empty">
                                Memuat Temuan Global...
                            </div>
                        )}

                        {selectedSpk !== null &&
                            !isLoadingTemuans &&
                            temuanErrorMessage !== null && (
                                <div className="daily-progress-task-empty error">
                                    {temuanErrorMessage}
                                </div>
                            )}

                        {selectedSpk !== null &&
                            !isLoadingTemuans &&
                            temuanErrorMessage === null &&
                            selectedTemuans.length === 0 && (
                                <div className="daily-progress-task-empty">
                                    Tidak ada Temuan Global open untuk SPK ini.
                                </div>
                            )}

                        {selectedSpk !== null &&
                            !isLoadingTemuans &&
                            temuanErrorMessage === null &&
                            selectedTemuans.map((temuan) => {
                                const isOpen = temuan.status === 'open'

                                return (
                                    <div
                                        className="daily-progress-task-entry"
                                        key={temuan.id}
                                    >
                                        <label
                                            className={`daily-progress-task-option ${
                                                isOpen ? '' : 'disabled'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTemuanIds.includes(
                                                    temuan.id,
                                                )}
                                                disabled={!isOpen}
                                                onChange={() =>
                                                    handleToggleTemuan(
                                                        temuan.id,
                                                    )
                                                }
                                            />

                                            <span>{temuan.nomor}</span>
                                        </label>

                                        <div className="daily-progress-task-history">
                                            <div className="daily-progress-task-history-item">
                                                <div>
                                                    <strong>
                                                        {temuan.tanggal}
                                                    </strong>

                                                    <span
                                                        className={`daily-progress-status ${temuan.status}`}
                                                    >
                                                        {temuan.status}
                                                    </span>
                                                </div>

                                                <p>
                                                    {getTemuanNotes(temuan)}
                                                </p>
                                            </div>
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
                            onClick={() => navigate('/daily-progress')}
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && (
                                <span className="spinner-border spinner-border-sm me-2" />
                            )}
                            Simpan Perubahan
                        </button>
                    </div>
                </form>
            </section>
        </div>
    )
}

export default DailyProgressCorrectionPage
