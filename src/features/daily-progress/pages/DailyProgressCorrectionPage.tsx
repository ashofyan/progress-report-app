import {
    Fragment,
    useCallback,
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
    DailyProgressTemuanNote,
    EditDailyProgressRequest,
} from '@/features/daily-progress/types/daily-progress.types'

import '@/features/daily-progress/styles/daily-progress.scss'
import '@/features/temuan/styles/temuan.scss'

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

const getChildLatestHistory = (
    child: DailyProgressFormJobTaskChild,
): ChildProgressHistory | null => {
    if (child.last_progress_report) {
        return child.last_progress_report
    }
    if (child.history && child.history.length > 0) {
        return child.history[0]
    }
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
    const noteList: string[] = []

    if (
        'notes' in progress &&
        progress.notes !== undefined &&
        progress.notes.length > 0
    ) {
        progress.notes.forEach((note) => {
            const trimmed = note.catatan?.trim()
            if (trimmed) {
                noteList.push(trimmed)
            }
        })
    }

    if (
        progress.catatan &&
        progress.catatan.trim() !== '' &&
        !noteList.includes(progress.catatan.trim())
    ) {
        noteList.push(progress.catatan.trim())
    }

    return noteList.length === 0 ? null : noteList.join('\n')
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

    const lastProgress = getChildLatestHistory(child)

    return lastProgress === null ? [] : [lastProgress]
}

const getPendingMasterTasks = (
    tasks: DailyProgressFormJobTask[],
): PendingMasterTask[] => {
    return tasks.flatMap((parent) =>
        parent.children
            .filter((child) => hasChildPending(child))
            .map((child) => {
                const history = getChildHistory(child)
                const progress =
                    child.last_progress_report?.status === 'pending'
                        ? child.last_progress_report
                        : history.find((h) => h.status === 'pending') ??
                          getChildLatestHistory(child)

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
    const latest = getChildLatestHistory(child)
    if (latest?.status === 'pending') {
        return true
    }
    if (child.history && child.history.length > 0) {
        const hasPending = child.history.some((h) => h.status === 'pending')
        const hasSelesai = child.history.some((h) => h.status === 'selesai')
        if (hasPending && !hasSelesai) {
            return true
        }
    }
    return false
}

const isChildCompleted = (
    child: DailyProgressFormJobTaskChild,
): boolean => {
    const latest = getChildLatestHistory(child)
    if (latest?.status === 'selesai') {
        return true
    }
    if (latest?.status === 'pending') {
        return false
    }
    if (child.history && child.history.length > 0) {
        return child.history.some((h) => h.status === 'selesai')
    }
    return false
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
    const [selectedTemuanNoteIds, setSelectedTemuanNoteIds] = useState<number[]>([])

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
    const [submitAction, setSubmitAction] =
        useState<'save' | 'save_and_continue'>('save')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const initialSpkMatchedRef = useRef<boolean>(false)

    const initialDetailMap = useMemo(() => {
        const map = new Map<string, SelectedTask>()
        if (currentProgress === null) return map

        currentProgress.details.forEach((detail) => {
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

            map.set(key, taskItem)
        })

        return map
    }, [currentProgress])

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

            if (dp.is_used_in_progress_report) {
                setInitialErrorMessage(
                    'Daily Progress ini sudah dimasukkan ke dalam Progress Report dan terkunci permanen (Read-Only). Form koreksi tidak dapat diubah.',
                )
                return
            }

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
            setSelectedTemuanNoteIds(
                (dp.temuans ?? []).flatMap((t) => (t.notes ?? []).map((n) => n.id)),
            )

            const initialTasks: SelectedTask[] = dp.details.map((detail) => {
                const key = detail.als_job_task_id
                    ? `master-${detail.als_job_task_id}`
                    : `additional-${detail.als_task_additional_detail_id}`

                return {
                    key,
                    id: detail.id,
                    als_job_id: detail.als_job_id,
                    als_job_task_id: detail.als_job_task_id ?? undefined,
                    als_task_additional_detail_id:
                        detail.als_task_additional_detail_id ?? undefined,
                    status: detail.status,
                    catatan: detail.catatan,
                }
            })

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
            queueMicrotask(() => {
                setFormData(null)
                setSelectedSpkId('')
            })
            return
        }

        queueMicrotask(() => {
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
        })
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
            queueMicrotask(() => {
                setAdditionalTasks([])
            })
            return
        }

        queueMicrotask(() => {
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
        })
    }, [clientCode, selectedJob])

    // 4. Fetch Open Temuans when clientCode and selectedSpk change
    useEffect(() => {
        if (clientCode.trim() === '' || selectedSpk === null) {
            queueMicrotask(() => {
                setOpenTemuans([])
            })
            return
        }

        queueMicrotask(() => {
            const fetchOpenTemuans = async (): Promise<void> => {
                setIsLoadingTemuans(true)
                setTemuanErrorMessage(null)

                const result = await temuanApi.getAll({
                    client_code: clientCode.trim(),
                    als_spk_id: selectedSpk.spk_id,
                    status: 'open,pending',
                })

                setIsLoadingTemuans(false)

                if (result.success && result.data !== undefined) {
                    setOpenTemuans(
                        result.data.map((temuan) => ({
                            id: temuan.id,
                            nomor: temuan.nomor,
                            tanggal: temuan.tanggal,
                            status: temuan.status,
                            type: temuan.type,
                            no_pr: temuan.no_pr,
                            priority: temuan.priority,
                            notes: temuan.notes?.map((note) => ({
                                id: note.id,
                                task: note.task,
                                note: note.note,
                                priority: note.priority,
                            })) ?? [],
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
        })
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

    const pendingMasterChildMap = useMemo(() => {
        return new Map<number, PendingMasterTask>(
            pendingMasterTasks.map((p) => [p.taskId, p]),
        )
    }, [pendingMasterTasks])

    const [openParentIds, setOpenParentIds] = useState<Set<number | string>>(
        new Set(),
    )

    const handleToggleParent = (parentId: number | string): void => {
        setOpenParentIds((prev) => {
            const next = new Set(prev)
            if (next.has(parentId)) {
                next.delete(parentId)
            } else {
                next.add(parentId)
            }
            return next
        })
    }

    const handleExpandAllParents = (ids: Array<number | string>): void => {
        setOpenParentIds(new Set(ids))
    }

    const handleCollapseAllParents = (): void => {
        setOpenParentIds(new Set())
    }

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
        if (existingDailyProgressTaskKeys.has(task.key)) {
            return true
        }

        if (
            task.als_job_task_id !== undefined &&
            existingDailyProgressTaskKeys.has(`master-${task.als_job_task_id}`)
        ) {
            return true
        }

        return (
            task.als_task_additional_detail_id !== undefined &&
            existingDailyProgressTaskKeys.has(
                `additional-${task.als_task_additional_detail_id}`,
            )
        )
    }

    const additionalTasksByParentId = useMemo(() => {
        const map = new Map<
            number,
            Array<{
                additionalTask: AdditionalTask
                task: AdditionalTask['details'][0]['tasks'][0]
            }>
        >()

        additionalTasks.forEach((at) => {
            at.details.forEach((detail) => {
                const list = map.get(detail.parent_id) ?? []
                detail.tasks.forEach((t) => {
                    list.push({
                        additionalTask: at,
                        task: t,
                    })
                })
                map.set(detail.parent_id, list)
            })
        })

        return map
    }, [additionalTasks])

    const getTemuanNoteParentId = useCallback(
        (
            note: DailyProgressTemuanNote,
            tasks?: DailyProgressFormJobTask[],
        ): number | null => {
            if (!tasks || tasks.length === 0) return null

            const taskId = note.task?.id
            if (taskId) {
                const parentMatch = tasks.find((p) => p.id === taskId)
                if (parentMatch) return parentMatch.id

                const childMatch = tasks.find((p) =>
                    p.children.some((c) => c.id === taskId),
                )
                if (childMatch) return childMatch.id
            }

            const taskName = note.task?.task_name?.toLowerCase()
            if (taskName) {
                const match = tasks.find(
                    (p) =>
                        p.task_name.toLowerCase().includes(taskName) ||
                        taskName.includes(p.task_name.toLowerCase()) ||
                        p.children.some(
                            (c) =>
                                c.task_name.toLowerCase().includes(taskName) ||
                                taskName.includes(c.task_name.toLowerCase()),
                        ),
                )
                if (match) return match.id
            }

            return null
        },
        [],
    )

    const getFindingParentId = useCallback(
        (
            finding: (typeof selectedFindings)[0],
            tasks: DailyProgressFormJobTask[],
        ): number | null => {
            const ket = finding.keterangan.toLowerCase()
            const match = tasks.find(
                (p) =>
                    ket.includes(p.task_name.toLowerCase()) ||
                    p.children.some((c) =>
                        ket.includes(c.task_name.toLowerCase()),
                    ),
            )
            return match ? match.id : null
        },
        [],
    )

    const unmatchedFindings = useMemo(() => {
        if (!selectedJob) return selectedFindings
        return selectedFindings.filter(
            (f) => getFindingParentId(f, selectedJob.tasks) === null,
        )
    }, [selectedFindings, selectedJob, getFindingParentId])

    const unmatchedTemuans = useMemo(() => {
        if (!selectedJob) return selectedTemuans
        return selectedTemuans.filter((t) => {
            if (!t.notes || t.notes.length === 0) return true
            return t.notes.some(
                (note) =>
                    getTemuanNoteParentId(note, selectedJob.tasks) === null,
            )
        })
    }, [selectedTemuans, selectedJob, getTemuanNoteParentId])

    useEffect(() => {
        if (selectedJob && pendingMasterTasks.length > 0) {
            queueMicrotask(() => {
                setSelectedTasks((prev) => {
                    const map = new Map<string, SelectedTask>()
                    prev.forEach((t) => map.set(t.key, t))
                    pendingMasterTasks.forEach((pending) => {
                        const key = `master-${pending.taskId}`
                        if (!map.has(key) && !existingDailyProgressTaskKeys.has(key)) {
                            const original = initialDetailMap.get(key)
                            map.set(key, {
                                key,
                                id: original?.id,
                                als_job_id: selectedJob.id,
                                als_job_task_id: pending.taskId,
                                status: original?.status ?? 'open',
                                catatan: original?.catatan ?? null,
                            })
                        }
                    })
                    return Array.from(map.values())
                })
            })
        }
    }, [selectedJob, pendingMasterTasks, existingDailyProgressTaskKeys, initialDetailMap])

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
        setSelectedTemuanNoteIds([])
        setAdditionalTasks([])
        setOpenParentIds(new Set())
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
        setSelectedTemuanNoteIds([])
        setAdditionalTasks([])
        setOpenParentIds(new Set())
    }

    const handleSpkChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const value = event.target.value
        setSelectedSpkId(value === '' ? '' : Number(value))
        setSelectedTasks([])
        setSelectedFindingIds([])
        setSelectedTemuanIds([])
        setSelectedTemuanNoteIds([])
        setAdditionalTasks([])
        setOpenParentIds(new Set())
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
                // Jika task statusnya sudah selesai, dikunci dan tidak dapat di-unchecklist (dihapus)
                const original = initialDetailMap.get(task.key)
                const current = previous.find(
                    (item) => item.key === task.key,
                )
                if (
                    original?.status === 'selesai' ||
                    current?.status === 'selesai'
                ) {
                    return previous
                }

                return previous.filter((item) => item.key !== task.key)
            }

            const original = initialDetailMap.get(task.key)
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

    const handleToggleTemuanNote = (
        temuanId: number,
        noteId: number,
    ): void => {
        setSelectedTemuanNoteIds((previous) => {
            const isChecked = previous.includes(noteId)
            const nextNoteIds = isChecked
                ? previous.filter((id) => id !== noteId)
                : [...previous, noteId]

            setSelectedTemuanIds((prevTemuanIds) => {
                const temuan = selectedTemuans.find((t) => t.id === temuanId)
                const hasCheckedNote =
                    temuan?.notes?.some((n) => nextNoteIds.includes(n.id)) ?? false

                if (hasCheckedNote) {
                    return prevTemuanIds.includes(temuanId)
                        ? prevTemuanIds
                        : [...prevTemuanIds, temuanId]
                }

                return prevTemuanIds.filter((id) => id !== temuanId)
            })

            return nextNoteIds
        })
    }

    const renderTemuanEntry = (
        temuan: DailyProgressTemuan,
        parentId?: number | null,
    ) => {
        const isSelectableTemuan =
            temuan.status === 'open' || temuan.status === 'pending'
        const allNotes = temuan.notes ?? []
        const notes =
            parentId !== undefined
                ? allNotes.filter((note) =>
                      parentId === null
                          ? getTemuanNoteParentId(note, selectedJob?.tasks) === null
                          : getTemuanNoteParentId(note, selectedJob?.tasks) === parentId,
                  )
                : allNotes

        const renderBadges = (priority?: number) => (
            <div className="d-flex align-items-center gap-2">
                <span className="daily-progress-subtask-badge temuan d-inline-flex align-items-center gap-1">
                    <i className="bi bi-shield-exclamation" />
                    <span>{temuan.nomor}</span>
                </span>
                {temuan.type === 'PR' && (
                    <span
                        className="badge bg-light text-secondary border"
                        style={{ fontSize: '11px' }}
                    >
                        PR: {temuan.no_pr ?? '-'}
                    </span>
                )}
                {priority !== undefined && (
                    <span
                        className={`temuan-priority-badge p${priority}`}
                        style={{
                            fontSize: '11px',
                            flexShrink: 0,
                        }}
                    >
                        P{priority}
                    </span>
                )}
                <span
                    className={`daily-progress-status ${temuan.status}`}
                >
                    {temuan.status}
                </span>
            </div>
        )

        if (allNotes.length === 0) {
            if (parentId !== undefined && parentId !== null) {
                return null
            }

            return (
                <div
                    className="daily-progress-task-entry"
                    key={`temuan-${temuan.id}`}
                >
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <label
                            className={`daily-progress-task-option ${
                                isSelectableTemuan ? '' : 'disabled'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedTemuanIds.includes(temuan.id)}
                                disabled={!isSelectableTemuan}
                                onChange={() => handleToggleTemuan(temuan.id)}
                            />
                            <span
                                style={{
                                    fontSize: '12.5px',
                                    color: '#64748b',
                                    fontStyle: 'italic',
                                }}
                            >
                                Tanpa rincian catatan
                            </span>
                        </label>

                        {renderBadges(temuan.priority)}
                    </div>
                </div>
            )
        }

        if (notes.length === 0) {
            return null
        }

        return (
            <Fragment key={`temuan-${temuan.id}-parent-${parentId ?? 'unmatched'}`}>
                {notes.map((note) => {
                    const isNoteChecked =
                        selectedTemuanNoteIds.includes(note.id)
                    return (
                        <div
                            className="daily-progress-task-entry"
                            key={`temuan-${temuan.id}-note-${note.id}`}
                        >
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                <label
                                    className={`daily-progress-task-option ${
                                        isSelectableTemuan ? '' : 'disabled'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isNoteChecked}
                                        disabled={!isSelectableTemuan}
                                        onChange={() =>
                                            handleToggleTemuanNote(
                                                temuan.id,
                                                note.id,
                                            )
                                        }
                                    />
                                    <span>{note.note}</span>
                                </label>

                                {renderBadges(note.priority ?? temuan.priority)}
                            </div>
                        </div>
                    )
                })}
            </Fragment>
        )
    }

    const handleSave = async (
        continueToProgressReport: boolean,
    ): Promise<void> => {
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

        const details = selectedTasks.filter((task) => !isTaskBlocked(task))

        const hasTask = details.length > 0
        const hasTemuan =
            selectedFindingIds.length > 0 ||
            selectedTemuanIds.length > 0

        if (!hasTask && !hasTemuan) {
            setErrorMessage(
                'Minimal satu pekerjaan atau temuan harus dipilih.',
            )
            return
        }

        if (hasTask && selectedJob === null) {
            setErrorMessage('SPK terpilih belum memiliki master pekerjaan.')
            return
        }

        setIsSubmitting(true)
        setSubmitAction(
            continueToProgressReport ? 'save_and_continue' : 'save',
        )

        const payload: EditDailyProgressRequest = {
            tanggal,
            client_code: clientCode.trim(),
            als_spk_id: selectedSpk.spk_id,
            bulan: Number(periodeBulan),
            tahun: Number(periodeTahun),
            finding_ids: selectedFindingIds,
            temuan_ids: selectedTemuanIds,
            temuans: selectedTemuanIds,
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

        if (continueToProgressReport) {
            const spkId = selectedSpk.spk_id
            const queryParams = new URLSearchParams()
            queryParams.set('client_code', clientCode.trim())
            queryParams.set('spk_id', String(spkId))
            queryParams.set('als_spk_id', String(spkId))
            if (selectedSpk.no_spk) {
                queryParams.set('no_spk', selectedSpk.no_spk)
            }
            if (tanggal) {
                queryParams.set('tanggal', tanggal)
            }
            queryParams.set('bulan', String(periodeBulan))
            queryParams.set('tahun', String(periodeTahun))

            navigate(`/progress-report/tambah?${queryParams.toString()}`, {
                state: {
                    client_code: clientCode.trim(),
                    spk_id: spkId,
                    als_spk_id: spkId,
                    no_spk: selectedSpk.no_spk,
                    tanggal,
                    bulan: Number(periodeBulan),
                    tahun: Number(periodeTahun),
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
                    <p className="daily-progress-subtitle">
                        Edit lengkap seluruh form, SPK, dan subtask Daily Progress
                    </p>

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

                    <div className="daily-progress-form-card mb-4">
                        <div className="daily-progress-panel-heading">
                            <div className="daily-progress-panel-icon primary">
                                <i className="bi bi-card-checklist" />
                            </div>
                            <div>
                                <h2>Informasi Dokumen</h2>
                                <p>Tentukan tanggal, client, SPK, dan periode laporan</p>
                            </div>
                        </div>

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
                                    setSelectedTemuanNoteIds([])
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


                    <div className="daily-progress-task-section mb-4">
                        <div className="daily-progress-panel-heading d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div className="d-flex align-items-center gap-3">
                                <div className="daily-progress-panel-icon primary">
                                    <i className="bi bi-list-task" />
                                </div>
                                <div>
                                    <h2 className="mb-0">
                                        Daftar Pekerjaan & Sub-Task
                                        {(isLoadingAdditional || isLoadingTemuans) && (
                                            <span className="spinner-border spinner-border-sm text-secondary ms-2" />
                                        )}
                                    </h2>
                                    <p className="text-muted small mb-0">
                                        Pekerjaan utama, pekerjaan tambahan, dan temuan yang terhubung
                                    </p>
                                    {additionalErrorMessage !== null && (
                                        <div className="text-danger small mt-1">{additionalErrorMessage}</div>
                                    )}
                                    {temuanErrorMessage !== null && (
                                        <div className="text-danger small mt-1">{temuanErrorMessage}</div>
                                    )}
                                </div>
                            </div>
                            {selectedSpk !== null && (
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => {
                                            const allIds: Array<number | string> = selectedJob
                                                ? selectedJob.tasks.map((p) => p.id)
                                                : []
                                            if (
                                                unmatchedFindings.length > 0 ||
                                                unmatchedTemuans.length > 0
                                            ) {
                                                allIds.push('unmatched-temuan')
                                            }
                                            handleExpandAllParents(allIds)
                                        }}
                                    >
                                        <i className="bi bi-chevron-expand me-1" />
                                        Buka Semua
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={handleCollapseAllParents}
                                    >
                                        <i className="bi bi-chevron-contract me-1" />
                                        Tutup Semua
                                    </button>
                                </div>
                            )}
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
                            selectedJob === null &&
                            unmatchedTemuans.length === 0 &&
                            unmatchedFindings.length === 0 && (
                                <div className="daily-progress-task-empty">
                                    Pekerjaan dan temuan untuk SPK ini tidak ditemukan.
                                </div>
                            )}

                        {selectedSpk !== null &&
                            selectedJob === null &&
                            (unmatchedTemuans.length > 0 ||
                                unmatchedFindings.length > 0) && (
                                <div className="alert alert-info py-2 px-3 small mb-3">
                                    <i className="bi bi-info-circle me-1" />
                                    SPK terpilih tidak memiliki master pekerjaan, namun memiliki temuan yang dapat Anda tindaklanjuti di bawah.
                                </div>
                            )}

                        {selectedJob !== null &&
                            selectedJob.tasks.map((parent) => {
                                const isOpen = openParentIds.has(parent.id)
                                const parentAdditional = additionalTasksByParentId.get(parent.id) ?? []
                                const visibleChildren = parent.children.filter((child) => {
                                    const key = `master-${child.id}`
                                    const originalDetail = initialDetailMap.get(key)
                                    const isOriginalCompleted = originalDetail?.status === 'selesai'
                                    const isExternalCompleted = isChildCompleted(child) && !isOriginalCompleted
                                    return !isExternalCompleted
                                })
                                const visibleAdditional = parentAdditional.filter(({ task }) => {
                                    const key = `additional-${task.id}`
                                    const originalDetail = initialDetailMap.get(key)
                                    const isOriginalCompleted = originalDetail?.status === 'selesai'
                                    const isExternalCompleted = task.status === 'selesai' && !isOriginalCompleted
                                    return !isExternalCompleted
                                })
                                const parentFindings = selectedFindings.filter(
                                    (f) => getFindingParentId(f, selectedJob.tasks) === parent.id,
                                )
                                const parentTemuans = selectedTemuans.filter((t) => {
                                    if (!t.notes || t.notes.length === 0) return false
                                    return t.notes.some(
                                        (note) =>
                                            getTemuanNoteParentId(note, selectedJob.tasks) === parent.id,
                                    )
                                })

                                const parentTemuanNotesCount = parentTemuans.reduce(
                                    (acc, t) => {
                                        const matchingNotes =
                                            t.notes?.filter(
                                                (note) =>
                                                    getTemuanNoteParentId(note, selectedJob.tasks) ===
                                                    parent.id,
                                            ) ?? []
                                        return acc + matchingNotes.length
                                    },
                                    0,
                                )

                                const totalSubCount =
                                    visibleChildren.length +
                                    visibleAdditional.length +
                                    parentFindings.length +
                                    parentTemuanNotesCount

                                let selectedCount = 0
                                visibleChildren.forEach((child) => {
                                    const key = `master-${child.id}`
                                    if (isSelected(key)) selectedCount++
                                })
                                visibleAdditional.forEach(({ task }) => {
                                    const key = `additional-${task.id}`
                                    if (isSelected(key)) selectedCount++
                                })
                                parentFindings.forEach((f) => {
                                    if (selectedFindingIds.includes(f.id)) selectedCount++
                                })
                                parentTemuans.forEach((t) => {
                                    const matchingNotes =
                                        t.notes?.filter(
                                            (note) =>
                                                getTemuanNoteParentId(note, selectedJob.tasks) ===
                                                parent.id,
                                        ) ?? []
                                    matchingNotes.forEach((n) => {
                                        if (selectedTemuanNoteIds.includes(n.id)) selectedCount++
                                    })
                                })

                                return (
                                    <div className="daily-progress-parent-card" key={`parent-${parent.id}`}>
                                        <div
                                            className="daily-progress-parent-header"
                                            onClick={() => handleToggleParent(parent.id)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className="daily-progress-parent-summary">
                                                <i className="bi bi-folder2-open text-primary" />
                                                <span className="fw-semibold">
                                                    {parent.task_name}
                                                </span>
                                                <span
                                                    className={`daily-progress-parent-count ${
                                                        selectedCount > 0 ? 'has-selected' : ''
                                                    }`}
                                                >
                                                    {selectedCount} / {totalSubCount} dipilih
                                                </span>
                                            </div>
                                            <i
                                                className={`bi bi-chevron-${
                                                    isOpen ? 'down' : 'right'
                                                } daily-progress-parent-chevron`}
                                            />
                                        </div>

                                        {isOpen && (
                                            <div className="daily-progress-parent-body">
                                                {/* 1. Master Sub-tasks */}
                                                {visibleChildren.map((child) => {
                                                    const key = `master-${child.id}`
                                                    const originalDetail = initialDetailMap.get(key)
                                                    const isOriginalCompleted = originalDetail?.status === 'selesai'
                                                    const isExternalCompleted = isChildCompleted(child) && !isOriginalCompleted
                                                    const isCompleted = isOriginalCompleted || isExternalCompleted
                                                    const isAlreadyInDp = existingDailyProgressTaskKeys.has(key)
                                                    const isPending = pendingMasterChildMap.has(child.id)
                                                    const isDisabled = isCompleted || isAlreadyInDp
                                                    const checked = isOriginalCompleted ? true : (isDisabled ? false : isSelected(key))
                                                    const rawStatus = isCompleted ? 'selesai' : isPending ? 'pending' : 'open'

                                                    return (
                                                        <div className="daily-progress-task-entry" key={key}>
                                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                                <label
                                                                    className={`daily-progress-task-option ${
                                                                        isDisabled ? 'disabled' : ''
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        disabled={isDisabled}
                                                                        onChange={() => {
                                                                            if (isDisabled) return
                                                                            handleToggleTask({
                                                                                key,
                                                                                als_job_id: selectedJob.id,
                                                                                als_job_task_id: child.id,
                                                                                status: 'open',
                                                                                catatan: null,
                                                                            })
                                                                        }}
                                                                    />
                                                                    <span>
                                                                        {child.task_name}
                                                                    </span>
                                                                </label>

                                                                <div className="d-flex align-items-center gap-2">
                                                                    {isPending && (
                                                                        <span className="daily-progress-status pending">
                                                                            Pending PR
                                                                        </span>
                                                                    )}
                                                                    {isCompleted ? (
                                                                        <span className="daily-progress-status selesai">
                                                                            Selesai
                                                                        </span>
                                                                    ) : isAlreadyInDp ? (
                                                                        <span className="daily-progress-status selesai">
                                                                            Sudah di DP
                                                                        </span>
                                                                    ) : (
                                                                        <span
                                                                            className={`daily-progress-status ${rawStatus}`}
                                                                        >
                                                                            {progressStatusLabels[rawStatus] ?? rawStatus}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}

                                                {/* 2. Additional Tasks */}
                                                {visibleAdditional.map(({ additionalTask, task }) => {
                                                    const key = `additional-${task.id}`
                                                    const originalDetail = initialDetailMap.get(key)
                                                    const isOriginalCompleted = originalDetail?.status === 'selesai'
                                                    const isCompleted = task.status === 'selesai' || isOriginalCompleted
                                                    const isAlreadyInDp = existingDailyProgressTaskKeys.has(key)
                                                    const isPending = pendingMasterChildMap.has(task.id)
                                                    const isDisabled = isCompleted || isAlreadyInDp
                                                    const checked = isOriginalCompleted ? true : (isDisabled ? false : isSelected(key))

                                                    return (
                                                        <div className="daily-progress-task-entry" key={key}>
                                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                                <label
                                                                    className={`daily-progress-task-option ${
                                                                        isDisabled ? 'disabled' : ''
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        disabled={isDisabled}
                                                                        onChange={() => {
                                                                            if (isDisabled) return
                                                                            handleToggleTask({
                                                                                key,
                                                                                als_job_id: additionalTask.job.id,
                                                                                als_task_additional_detail_id: task.id,
                                                                                status: 'open',
                                                                                catatan: null,
                                                                            })
                                                                        }}
                                                                    />
                                                                    <span>{task.task_name}</span>
                                                                </label>

                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span
                                                                        className={`daily-progress-subtask-badge ${
                                                                            additionalTask.type === 'custom'
                                                                                ? 'custom'
                                                                                : 'tambahan'
                                                                        }`}
                                                                    >
                                                                        {additionalTask.type === 'custom'
                                                                            ? 'Custom Pekerjaan'
                                                                            : 'Pekerjaan Tambahan'}
                                                                    </span>
                                                                    {isPending && (
                                                                        <span className="daily-progress-status pending">
                                                                            Pending PR
                                                                        </span>
                                                                    )}
                                                                    {isCompleted ? (
                                                                        <span className="daily-progress-status selesai">
                                                                            Selesai
                                                                        </span>
                                                                    ) : isAlreadyInDp ? (
                                                                        <span className="daily-progress-status selesai">
                                                                            Sudah di DP
                                                                        </span>
                                                                    ) : (
                                                                        <span
                                                                            className={`daily-progress-status ${task.status}`}
                                                                        >
                                                                            {progressStatusLabels[task.status] ??
                                                                                task.status}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}

                                                {/* 3. Findings / Temuan PR under this parent */}
                                                {parentFindings.map((finding) => {
                                                    const isOpenFinding = finding.status === 'open'
                                                    return (
                                                        <div
                                                            className="daily-progress-task-entry"
                                                            key={`finding-${finding.id}`}
                                                        >
                                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                                <label
                                                                    className={`daily-progress-task-option ${
                                                                        isOpenFinding ? '' : 'disabled'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedFindingIds.includes(finding.id)}
                                                                        disabled={!isOpenFinding}
                                                                        onChange={() =>
                                                                            handleToggleFinding(finding.id)
                                                                        }
                                                                    />
                                                                    <span>{finding.keterangan}</span>
                                                                </label>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span className="daily-progress-subtask-badge temuan">
                                                                        Temuan PR
                                                                    </span>
                                                                    <span
                                                                        className={`daily-progress-status ${finding.status}`}
                                                                    >
                                                                        {finding.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {finding.status !== 'selesai' && (
                                                                <div className="daily-progress-task-compact-note">
                                                                    {finding.nomor_pr ? `${finding.nomor_pr} • ` : ''}
                                                                    {finding.tanggal}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}

                                                {/* 4. Global Temuan under this parent */}
                                                {parentTemuans.map((temuan) =>
                                                    renderTemuanEntry(temuan, parent.id),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                        {/* Unmatched Findings & Temuans */}
                        {(unmatchedFindings.length > 0 || unmatchedTemuans.length > 0) && (
                            <div className="daily-progress-parent-card mt-3" key="unmatched-temuan">
                                <div
                                    className="daily-progress-parent-header"
                                    onClick={() => handleToggleParent('unmatched-temuan')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="daily-progress-parent-summary">
                                        <i className="bi bi-shield-exclamation text-warning" />
                                        <span className="fw-semibold">Temuan Lainnya / Umum</span>
                                        {(() => {
                                            const unmatchedTemuanNotesCount =
                                                unmatchedTemuans.reduce(
                                                    (acc, t) => {
                                                        if (!t.notes || t.notes.length === 0) return acc + 1
                                                        const unNotes = selectedJob
                                                            ? t.notes.filter(
                                                                  (n) =>
                                                                      getTemuanNoteParentId(
                                                                          n,
                                                                          selectedJob.tasks,
                                                                      ) === null,
                                                              )
                                                            : t.notes
                                                        return acc + unNotes.length
                                                    },
                                                    0,
                                                )
                                            let selectedUnmatchedTemuanNotesCount =
                                                0
                                            unmatchedTemuans.forEach((t) => {
                                                if (
                                                    !t.notes ||
                                                    t.notes.length === 0
                                                ) {
                                                    if (
                                                        selectedTemuanIds.includes(
                                                            t.id,
                                                        )
                                                    ) {
                                                        selectedUnmatchedTemuanNotesCount++
                                                    }
                                                } else {
                                                    const unNotes = selectedJob
                                                        ? t.notes.filter(
                                                              (n) =>
                                                                  getTemuanNoteParentId(
                                                                      n,
                                                                      selectedJob.tasks,
                                                                  ) === null,
                                                          )
                                                        : t.notes
                                                    unNotes.forEach((n) => {
                                                        if (
                                                            selectedTemuanNoteIds.includes(
                                                                n.id,
                                                            )
                                                        ) {
                                                            selectedUnmatchedTemuanNotesCount++
                                                        }
                                                    })
                                                }
                                            })
                                            const selectedUnmatchedCount =
                                                unmatchedFindings.filter((f) =>
                                                    selectedFindingIds.includes(
                                                        f.id,
                                                    ),
                                                ).length +
                                                selectedUnmatchedTemuanNotesCount
                                            const totalUnmatchedCount =
                                                unmatchedFindings.length +
                                                unmatchedTemuanNotesCount

                                            return (
                                                <span
                                                    className={`daily-progress-parent-count ${
                                                        selectedUnmatchedCount >
                                                        0
                                                            ? 'has-selected'
                                                            : ''
                                                    }`}
                                                >
                                                    {selectedUnmatchedCount} /{' '}
                                                    {totalUnmatchedCount}{' '}
                                                    dipilih
                                                </span>
                                            )
                                        })()}
                                    </div>
                                    <i
                                        className={`bi bi-chevron-${
                                            openParentIds.has('unmatched-temuan') ? 'down' : 'right'
                                        } daily-progress-parent-chevron`}
                                    />
                                </div>

                                {openParentIds.has('unmatched-temuan') && (
                                    <div className="daily-progress-parent-body">
                                        {unmatchedFindings.map((finding) => {
                                            const isOpenFinding = finding.status === 'open'
                                            return (
                                                <div
                                                    className="daily-progress-task-entry"
                                                    key={`unmatched-finding-${finding.id}`}
                                                >
                                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                        <label
                                                            className={`daily-progress-task-option ${
                                                                isOpenFinding ? '' : 'disabled'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedFindingIds.includes(finding.id)}
                                                                disabled={!isOpenFinding}
                                                                onChange={() =>
                                                                    handleToggleFinding(finding.id)
                                                                }
                                                            />
                                                            <span>{finding.keterangan}</span>
                                                        </label>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="daily-progress-subtask-badge temuan">
                                                                Temuan PR
                                                            </span>
                                                            <span
                                                                className={`daily-progress-status ${finding.status}`}
                                                            >
                                                                {finding.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {finding.status !== 'selesai' && (
                                                        <div className="daily-progress-task-compact-note">
                                                            {finding.nomor_pr ? `${finding.nomor_pr} • ` : ''}
                                                            {finding.tanggal}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}

                                        {unmatchedTemuans.map((temuan) =>
                                            renderTemuanEntry(temuan, null),
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
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
                                Simpan Perubahan
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
                                Simpan &amp; Lanjut Progress Report
                            </button>
                        </div>
                    </div>
                </form>
            </section>
        </div>
    )
}

export default DailyProgressCorrectionPage
