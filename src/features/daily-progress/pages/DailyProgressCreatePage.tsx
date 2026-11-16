import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { additionalTaskApi } from '@/features/additional-task/api/additionalTaskApi'
import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import type {
    AdditionalTask,
} from '@/features/additional-task/types/additional-task.types'
import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import { temuanApi } from '@/features/temuan/api/temuanApi'
import type {
    DailyProgressFormData,
    DailyProgressFormJobTask,
    DailyProgressFormJobTaskChild,
    DailyProgressFormSpk,
    DailyProgressTemuan,
    DailyProgressFormTaskHistory,
} from '@/features/daily-progress/types/daily-progress.types'

import '@/features/daily-progress/styles/daily-progress.scss'

interface SelectedTask {
    key: string
    als_job_id: number
    als_job_task_id?: number
    als_task_additional_detail_id?: number
}


interface PendingMasterTask {
    detailId: number
    dailyProgressId: number
    nomor: string
    tanggal: string
    taskId: number
    taskName: string
    parentName: string
    catatan: string | null
}

type ChildProgressHistory =
    DailyProgressFormTaskHistory

const progressStatusLabels: Record<
    string,
    string
> = {
    open: 'Open',
    pending: 'Pending',
    batal: 'Batal',
    selesai: 'Selesai',
}

const getToday = (): string => {
    return new Date().toISOString().slice(0, 10)
}

const getMonthFromDate = (
    date: string,
): number => {
    return Number(date.slice(5, 7))
}

const getYearFromDate = (
    date: string,
): number => {
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

const getSpkLabel = (
    spk: DailyProgressFormSpk,
): string => {
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

const DailyProgressCreatePage = () => {
    const navigate = useNavigate()

    const [tanggal, setTanggal] =
        useState<string>(getToday())

    const [periodeBulan, setPeriodeBulan] =
        useState<number | ''>(
            getMonthFromDate(getToday()),
        )

    const [periodeTahun, setPeriodeTahun] =
        useState<number | ''>(
            getYearFromDate(getToday()),
        )

    const [clientCode, setClientCode] =
        useState<string>('')

    const [selectedSpkId, setSelectedSpkId] =
        useState<number | ''>('')

    const [selectedTasks, setSelectedTasks] =
        useState<SelectedTask[]>([])

    const [
        selectedFindingIds,
        setSelectedFindingIds,
    ] = useState<number[]>([])

    const [
        selectedTemuanIds,
        setSelectedTemuanIds,
    ] = useState<number[]>([])

    const [formData, setFormData] =
        useState<DailyProgressFormData | null>(null)

    const [additionalTasks, setAdditionalTasks] =
        useState<AdditionalTask[]>([])

    const [openTemuans, setOpenTemuans] =
        useState<DailyProgressTemuan[]>([])

    const [isLoadingFormData, setIsLoadingFormData] =
        useState<boolean>(false)

    const [isLoadingAdditional, setIsLoadingAdditional] =
        useState<boolean>(false)

    const [isLoadingTemuans, setIsLoadingTemuans] =
        useState<boolean>(false)

    const [
        formDataErrorMessage,
        setFormDataErrorMessage,
    ] = useState<string | null>(null)

    const [
        additionalErrorMessage,
        setAdditionalErrorMessage,
    ] = useState<string | null>(null)

    const [
        temuanErrorMessage,
        setTemuanErrorMessage,
    ] = useState<string | null>(null)

    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const selectedSpk = useMemo(() => {
        return (
            formData?.spks.find(
                (spk) => spk.spk_id === selectedSpkId,
            ) ?? null
        )
    }, [
        formData?.spks,
        selectedSpkId,
    ])

    const selectedJob = selectedSpk?.job ?? null

    const selectedFindings = useMemo(() => {
        if (selectedSpk === null) {
            return []
        }

        if (selectedSpk.findings !== undefined) {
            return selectedSpk.findings
        }

        return (formData?.findings ?? []).filter(
            (finding) =>
                (
                    finding.spk_id === undefined &&
                    finding.als_spk_id === undefined
                ) ||
                finding.spk_id === selectedSpk.spk_id ||
                finding.als_spk_id === selectedSpk.spk_id,
        )
    }, [
        formData?.findings,
        selectedSpk,
    ])

    const selectedTemuans = useMemo(() => {
        if (selectedSpk === null) {
            return []
        }

        const temuanMap = new Map<number, DailyProgressTemuan>()

        ;[
            ...(selectedSpk.temuans ?? []),
            ...(formData?.temuans ?? []).filter(
                (temuan) =>
                    (
                        temuan.spk_id === undefined &&
                        temuan.als_spk_id === undefined
                    ) ||
                    temuan.spk_id === selectedSpk.spk_id ||
                    temuan.als_spk_id === selectedSpk.spk_id,
            ),
            ...openTemuans,
        ].forEach((temuan) => {
            temuanMap.set(temuan.id, temuan)
        })

        return Array.from(temuanMap.values())
    }, [
        formData?.temuans,
        openTemuans,
        selectedSpk,
    ])

    const pendingMasterTasks = useMemo(() => {
        return getPendingMasterTasks(
            selectedJob?.tasks ?? [],
        )
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

    const existingDailyProgressTaskKeys = useMemo(() => {
        const keys = new Set<string>()
        const dailyProgresses = formData?.daily_progresses ?? []

        dailyProgresses.forEach((dp) => {
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
    }, [formData?.daily_progresses])

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

    const getTemuanParentId = useCallback(
        (
            temuan: DailyProgressTemuan,
            tasks: DailyProgressFormJobTask[],
        ): number | null => {
            if (!temuan.notes || temuan.notes.length === 0) return null

            for (const note of temuan.notes) {
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
        return selectedTemuans.filter(
            (t) => getTemuanParentId(t, selectedJob.tasks) === null,
        )
    }, [selectedTemuans, selectedJob, getTemuanParentId])

    useEffect(() => {
        if (selectedJob && pendingMasterTasks.length > 0) {
            setSelectedTasks((prev) => {
                const map = new Map<string, SelectedTask>()
                prev.forEach((t) => map.set(t.key, t))
                pendingMasterTasks.forEach((pending) => {
                    const key = `master-${pending.taskId}`
                    if (!map.has(key) && !existingDailyProgressTaskKeys.has(key)) {
                        map.set(key, {
                            key,
                            als_job_id: selectedJob.id,
                            als_job_task_id: pending.taskId,
                        })
                    }
                })
                return Array.from(map.values())
            })
        }
    }, [selectedJob, pendingMasterTasks, existingDailyProgressTaskKeys])

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    useEffect(() => {
        if (
            clientCode.trim() === '' ||
            periodeBulan === '' ||
            periodeTahun === ''
        ) {
            queueMicrotask(() => {
                setFormData(null)
                setSelectedSpkId('')
                setSelectedTasks([])
                setSelectedFindingIds([])
                setSelectedTemuanIds([])
                setAdditionalTasks([])
            })
            return
        }

        queueMicrotask(() => {
            const fetchFormData =
                async (): Promise<void> => {
                    setIsLoadingFormData(true)
                    setFormDataErrorMessage(null)

                    const result =
                        await dailyProgressApi.getFormData({
                            client_code: clientCode,
                        })

                    if (
                        result.success &&
                        result.data !== undefined
                    ) {
                        setFormData(result.data)

                        // Pertahankan pilihan SPK jika masih tersedia di periode baru
                        setSelectedSpkId((prevSelectedSpkId) => {
                            const stillExists =
                                prevSelectedSpkId !== '' &&
                                result.data!.spks.some(
                                    (spk) => spk.spk_id === prevSelectedSpkId,
                                )

                            if (stillExists) {
                                return prevSelectedSpkId
                            }

                            // Jika SPK sudah tidak ada di periode baru, reset SPK dan task
                            setSelectedTasks([])
                            setSelectedFindingIds([])
                            setSelectedTemuanIds([])
                            return ''
                        })

                        setIsLoadingFormData(false)
                        return
                    }

                    setFormData(null)
                    setSelectedSpkId('')
                    setSelectedTasks([])
                    setSelectedFindingIds([])
                    setSelectedTemuanIds([])
                    setFormDataErrorMessage(
                        result.message,
                    )
                    setIsLoadingFormData(false)
                }

            void fetchFormData()
        })
    }, [
        clientCode,
        periodeBulan,
        periodeTahun,
        tanggal,
    ])

    useEffect(() => {
        if (
            clientCode.trim() === '' ||
            selectedJob === null
        ) {
            queueMicrotask(() => {
                setAdditionalTasks([])
            })
            return
        }

        queueMicrotask(() => {
            const fetchAdditionalTasks =
                async (): Promise<void> => {
                    setIsLoadingAdditional(true)
                    setAdditionalErrorMessage(null)

                    const result =
                        await additionalTaskApi.getAll({
                            client_code: clientCode,
                            job_id: selectedJob.id,
                        })

                    if (
                        result.success &&
                        result.data !== undefined
                    ) {
                        setAdditionalTasks(result.data)
                        setIsLoadingAdditional(false)
                        return
                    }

                    setAdditionalTasks([])
                    setAdditionalErrorMessage(
                        result.message,
                    )
                    setIsLoadingAdditional(false)
                }

            void fetchAdditionalTasks()
        })
    }, [
        clientCode,
        selectedJob,
    ])

    useEffect(() => {
        if (
            clientCode.trim() === '' ||
            selectedSpk === null
        ) {
            queueMicrotask(() => {
                setOpenTemuans([])
            })
            return
        }

        queueMicrotask(() => {
            const fetchOpenTemuans =
                async (): Promise<void> => {
                    setIsLoadingTemuans(true)
                    setTemuanErrorMessage(null)

                    const result = await temuanApi.getAll({
                        client_code: clientCode.trim(),
                        als_spk_id: selectedSpk.spk_id,
                        status: 'open,pending',
                    })

                    setIsLoadingTemuans(false)

                    if (
                        result.success &&
                        result.data !== undefined
                    ) {
                        setOpenTemuans(
                            result.data.map((temuan) => ({
                                id: temuan.id,
                                nomor: temuan.nomor,
                                tanggal: temuan.tanggal,
                                status: temuan.status,
                                notes: temuan.notes.map(
                                    (note) => ({
                                        id: note.id,
                                        task: note.task,
                                        note: note.note,
                                    }),
                                ),
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
    }, [
        clientCode,
        selectedSpk,
    ])

    const handleDateChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        setTanggal(event.target.value)
    }

    const handlePeriodMonthChange = (
        event: ChangeEvent<HTMLSelectElement>,
    ): void => {
        setPeriodeBulan(
            event.target.value === ''
                ? ''
                : Number(event.target.value),
        )
    }

    const handlePeriodYearChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        setPeriodeTahun(
            event.target.value === ''
                ? ''
                : Number(event.target.value),
        )
    }

    const handleSpkChange = (
        event: ChangeEvent<HTMLSelectElement>,
    ): void => {
        const value = event.target.value

        setSelectedSpkId(
            value === '' ? '' : Number(value),
        )
        setSelectedTasks([])
        setSelectedFindingIds([])
        setSelectedTemuanIds([])
        setAdditionalTasks([])
        setOpenParentIds(new Set())
    }

    const isSelected = (key: string): boolean => {
        return selectedTasks.some(
            (task) => task.key === key,
        )
    }

    const handleToggleTask = (
        task: SelectedTask,
    ): void => {
        setSelectedTasks((previous) => {
            if (
                previous.some(
                    (item) => item.key === task.key,
                )
            ) {
                return previous.filter(
                    (item) => item.key !== task.key,
                )
            }

            return [
                ...previous,
                task,
            ]
        })
    }

    const handleToggleFinding = (
        findingId: number,
    ): void => {
        setSelectedFindingIds((previous) => {
            if (previous.includes(findingId)) {
                return previous.filter(
                    (id) => id !== findingId,
                )
            }

            return [
                ...previous,
                findingId,
            ]
        })
    }

    const handleToggleTemuan = (
        temuanId: number,
    ): void => {
        setSelectedTemuanIds((previous) => {
            if (previous.includes(temuanId)) {
                return previous.filter(
                    (id) => id !== temuanId,
                )
            }

            return [
                ...previous,
                temuanId,
            ]
        })
    }

    const getTemuanNotes = (
        temuan: DailyProgressTemuan,
    ): string => {
        const notes = (temuan.notes ?? [])
            .map((note) => note.note.trim())
            .filter((note) => note !== '')

        return notes.length === 0
            ? 'Tanpa catatan.'
            : notes.join('\n')
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (tanggal === '') {
            setErrorMessage('Tanggal wajib diisi.')
            return
        }

        if (clientCode.trim() === '') {
            setErrorMessage('Kode client wajib dipilih.')
            return
        }

        if (
            periodeBulan === '' ||
            periodeTahun === ''
        ) {
            setErrorMessage('Periode bulan dan tahun wajib diisi.')
            return
        }

        if (selectedSpk === null) {
            setErrorMessage('SPK wajib dipilih.')
            return
        }

        const details = selectedTasks.filter(
            (task) => !isTaskBlocked(task),
        )

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
            setErrorMessage(
                'SPK terpilih belum memiliki master pekerjaan.',
            )
            return
        }

        setIsSubmitting(true)

        const result =
            await dailyProgressApi.create({
                tanggal,
                client_code: clientCode.trim(),
                als_spk_id: selectedSpk.spk_id,
                bulan: Number(periodeBulan),
                tahun: Number(periodeTahun),
                finding_ids: selectedFindingIds,
                temuan_ids: selectedTemuanIds,
                temuans: selectedTemuanIds,
                details: details.map((task) => ({
                    als_job_id: task.als_job_id,
                    als_job_task_id:
                        task.als_job_task_id,
                    als_task_additional_detail_id:
                        task.als_task_additional_detail_id,
                    status: 'open' as const,
                    catatan: null,
                })),
            })

        setIsSubmitting(false)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        navigate('/daily-progress')
    }

    return (
        <div className="daily-progress-page">
            <div className="daily-progress-heading">
                <div>
                    <h1 className="daily-progress-title">
                        Tambah Daily Progress
                    </h1>
                    <p className="daily-progress-subtitle">
                        Buat pencatatan laporan progress harian untuk pekerjaan operasional
                    </p>
                </div>

                <div className="daily-progress-breadcrumb">
                    <span className="active">
                        Progress
                    </span>

                    <span>/</span>

                    <span>Daily Progress</span>

                    <span>/</span>

                    <span>Tambah</span>
                </div>
            </div>

            <section className="daily-progress-form-page">
                <form onSubmit={handleSubmit}>
                    {errorMessage !== null && (
                        <div
                            className="alert alert-danger"
                            role="alert"
                        >
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
                                <label className="form-label">
                                    Tanggal
                                </label>

                            <input
                                type="date"
                                className="form-control"
                                value={tanggal}
                                onChange={handleDateChange}
                            />
                        </div>

                        <div className="col">
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
                                    setSelectedTasks([])
                                    setSelectedFindingIds([])
                                    setSelectedTemuanIds([])
                                    setAdditionalTasks([])
                                }}
                            />
                        </div>

                    </div>

                    <div className="row g-3 mb-4">

                        <div className="col">
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
                                    isLoadingFormData ||
                                    formData === null
                                }
                                onChange={handleSpkChange}
                            >
                                <option value="">
                                    Pilih SPK
                                </option>

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
                        <div className="col-md-3">
                            <label className="form-label">
                                Periode Bulan
                            </label>

                            <select
                                className="form-select"
                                value={periodeBulan}
                                onChange={
                                    handlePeriodMonthChange
                                }
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
                                onChange={
                                    handlePeriodYearChange
                                }
                            />
                        </div>
                    </div>
                    </div>

                    {isLoadingFormData && (
                        <div className="daily-progress-task-empty mb-4">
                            Memuat data form Daily Progress...
                        </div>
                    )}

                    {!isLoadingFormData &&
                        formDataErrorMessage !== null && (
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
                                const parentFindings = selectedFindings.filter(
                                    (f) => getFindingParentId(f, selectedJob.tasks) === parent.id,
                                )
                                const parentTemuans = selectedTemuans.filter(
                                    (t) => getTemuanParentId(t, selectedJob.tasks) === parent.id,
                                )

                                const totalSubCount =
                                    parent.children.length +
                                    parentAdditional.length +
                                    parentFindings.length +
                                    parentTemuans.length

                                let selectedCount = 0
                                parent.children.forEach((child) => {
                                    const key = `master-${child.id}`
                                    if (isSelected(key)) selectedCount++
                                })
                                parentAdditional.forEach(({ task }) => {
                                    const key = `additional-${task.id}`
                                    if (isSelected(key)) selectedCount++
                                })
                                parentFindings.forEach((f) => {
                                    if (selectedFindingIds.includes(f.id)) selectedCount++
                                })
                                parentTemuans.forEach((t) => {
                                    if (selectedTemuanIds.includes(t.id)) selectedCount++
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
                                                {parent.children.map((child) => {
                                                    const key = `master-${child.id}`
                                                    const isCompleted = isChildCompleted(child)
                                                    const isAlreadyInDp = existingDailyProgressTaskKeys.has(key)
                                                    const isPending = pendingMasterChildMap.has(child.id)
                                                    const isDisabled = isCompleted || isAlreadyInDp
                                                    const checked = isDisabled ? false : isSelected(key)
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
                                                                            {progressStatusLabels[rawStatus] ??
                                                                                rawStatus}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}

                                                {/* 2. Additional Tasks */}
                                                {parentAdditional.map(({ additionalTask, task }) => {
                                                    const key = `additional-${task.id}`
                                                    const isCompleted = task.status === 'selesai'
                                                    const isAlreadyInDp = existingDailyProgressTaskKeys.has(key)
                                                    const isPending = pendingMasterChildMap.has(task.id)
                                                    const isDisabled = isCompleted || isAlreadyInDp
                                                    const checked = isDisabled ? false : isSelected(key)

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
                                                {parentTemuans.map((temuan) => {
                                                    const isSelectableTemuan =
                                                        temuan.status === 'open' ||
                                                        temuan.status === 'pending'
                                                    const isChecked =
                                                        selectedTemuanIds.includes(temuan.id)
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
                                                                        checked={isChecked}
                                                                        disabled={!isSelectableTemuan}
                                                                        onChange={() =>
                                                                            handleToggleTemuan(temuan.id)
                                                                        }
                                                                    />
                                                                    <span>{temuan.nomor}</span>
                                                                </label>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span className="daily-progress-subtask-badge temuan">
                                                                        Temuan
                                                                    </span>
                                                                    <span
                                                                        className={`daily-progress-status ${temuan.status}`}
                                                                    >
                                                                        {temuan.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {temuan.status !== 'selesai' && (
                                                                <div className="daily-progress-task-compact-note">
                                                                    {temuan.tanggal} • {getTemuanNotes(temuan)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
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
                                        <span
                                            className={`daily-progress-parent-count ${
                                                unmatchedFindings.filter((f) =>
                                                    selectedFindingIds.includes(f.id),
                                                ).length +
                                                    unmatchedTemuans.filter((t) =>
                                                        selectedTemuanIds.includes(t.id),
                                                    ).length >
                                                0
                                                    ? 'has-selected'
                                                    : ''
                                            }`}
                                        >
                                            {unmatchedFindings.filter((f) =>
                                                selectedFindingIds.includes(f.id),
                                            ).length +
                                                unmatchedTemuans.filter((t) =>
                                                    selectedTemuanIds.includes(t.id),
                                                ).length}{' '}
                                            /{' '}
                                            {unmatchedFindings.length +
                                                unmatchedTemuans.length}{' '}
                                            dipilih
                                        </span>
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

                                        {unmatchedTemuans.map((temuan) => {
                                            const isSelectableTemuan =
                                                temuan.status === 'open' ||
                                                temuan.status === 'pending'
                                            const isChecked =
                                                selectedTemuanIds.includes(temuan.id)
                                            return (
                                                <div
                                                    className="daily-progress-task-entry"
                                                    key={`unmatched-temuan-${temuan.id}`}
                                                >
                                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                        <label
                                                            className={`daily-progress-task-option ${
                                                                isSelectableTemuan ? '' : 'disabled'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                disabled={!isSelectableTemuan}
                                                                onChange={() =>
                                                                    handleToggleTemuan(temuan.id)
                                                                }
                                                            />
                                                            <span>{temuan.nomor}</span>
                                                        </label>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="daily-progress-subtask-badge temuan">
                                                                Temuan
                                                            </span>
                                                            <span
                                                                className={`daily-progress-status ${temuan.status}`}
                                                            >
                                                                {temuan.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {temuan.status !== 'selesai' && (
                                                        <div className="daily-progress-task-compact-note">
                                                            {temuan.tanggal} • {getTemuanNotes(temuan)}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
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
                            onClick={() =>
                                navigate('/daily-progress')
                            }
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
                            Simpan
                        </button>
                    </div>
                </form>
            </section>
        </div>
    )
}

export default DailyProgressCreatePage
