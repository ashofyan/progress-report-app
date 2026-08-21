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
import type {
    DailyProgressFormData,
    DailyProgressFormJobTask,
    DailyProgressFormJobTaskChild,
    DailyProgressFormSpk,
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

        return notes.length === 0
            ? null
            : notes.join('\n')
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
                    getChildLastProgress(child)?.status ===
                    'pending',
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

    const [formData, setFormData] =
        useState<DailyProgressFormData | null>(null)

    const [additionalTasks, setAdditionalTasks] =
        useState<AdditionalTask[]>([])

    const [isLoadingFormData, setIsLoadingFormData] =
        useState<boolean>(false)

    const [isLoadingAdditional, setIsLoadingAdditional] =
        useState<boolean>(false)

    const [
        formDataErrorMessage,
        setFormDataErrorMessage,
    ] = useState<string | null>(null)

    const [
        additionalErrorMessage,
        setAdditionalErrorMessage,
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

    const pendingMasterTasks = useMemo(() => {
        return getPendingMasterTasks(
            selectedJob?.tasks ?? [],
        )
    }, [selectedJob?.tasks])

    const carriedPendingTasks = useMemo<SelectedTask[]>(() => {
        if (selectedJob === null) {
            return []
        }

        const carriedTasks = new Map<string, SelectedTask>()

        pendingMasterTasks.forEach((pending) => {
            const key = `master-${pending.taskId}`

            carriedTasks.set(key, {
                key,
                als_job_id: selectedJob.id,
                als_job_task_id: pending.taskId,
            })
        })

        return Array.from(carriedTasks.values())
    }, [
        pendingMasterTasks,
        selectedJob,
    ])

    const carriedPendingTaskKeys = useMemo(() => {
        return new Set(
            carriedPendingTasks.map((task) => task.key),
        )
    }, [carriedPendingTasks])

    const carriedTaskKeys = useMemo(() => {
        const keys: string[] = []

        pendingMasterTasks.forEach((pending) => {
            keys.push(`master-${pending.taskId}`)
        })

        return new Set(
            keys,
        )
    }, [
        pendingMasterTasks,
    ])

    const isTaskBlocked = (task: SelectedTask): boolean => {
        if (carriedTaskKeys.has(task.key)) {
            return true
        }

        if (
            task.als_job_task_id !== undefined &&
            carriedTaskKeys.has(
                `master-${task.als_job_task_id}`,
            )
        ) {
            return true
        }

        return (
            task.als_task_additional_detail_id !== undefined &&
            carriedTaskKeys.has(
                `additional-${task.als_task_additional_detail_id}`,
            )
        )
    }

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
                            bulan: periodeBulan,
                            tahun: periodeTahun,
                        })

                    if (
                        result.success &&
                        result.data !== undefined
                    ) {
                        setFormData(result.data)
                        setSelectedSpkId('')
                        setSelectedTasks([])
                        setSelectedFindingIds([])
                        setIsLoadingFormData(false)
                        return
                    }

                    setFormData(null)
                    setSelectedSpkId('')
                    setSelectedTasks([])
                    setSelectedFindingIds([])
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
        setSelectedSpkId('')
        setSelectedTasks([])
        setSelectedFindingIds([])
        setAdditionalTasks([])
    }

    const handlePeriodYearChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        setPeriodeTahun(
            event.target.value === ''
                ? ''
                : Number(event.target.value),
        )
        setSelectedSpkId('')
        setSelectedTasks([])
        setAdditionalTasks([])
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
        setAdditionalTasks([])
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

        if (selectedJob === null) {
            setErrorMessage(
                'SPK terpilih belum memiliki master pekerjaan.',
            )
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
            setErrorMessage(
                'Minimal satu task harus dipilih.',
            )
            return
        }

        setIsSubmitting(true)

        const result =
            await dailyProgressApi.create({
                tanggal,
                client_code: clientCode.trim(),
                als_spk_id: selectedSpk.spk_id,
                bulan: periodeBulan,
                tahun: periodeTahun,
                finding_ids: selectedFindingIds,
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
                <h1 className="daily-progress-title">
                    Tambah Daily Progress
                </h1>

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
                                    setAdditionalTasks([])
                                }}
                            />
                        </div>

                    </div>

                    <div className="row g-3 mb-4">
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

                    <div className="daily-progress-task-section">
                        <div className="daily-progress-panel-heading">
                            <h2>Pending Progress Report</h2>
                        </div>

                        {clientCode.trim() === '' && (
                            <div className="daily-progress-task-empty">
                                Pilih client terlebih dahulu.
                            </div>
                        )}

                        {clientCode.trim() !== '' &&
                            selectedSpk === null && (
                                <div className="daily-progress-task-empty">
                                    Pilih SPK terlebih dahulu.
                                </div>
                            )}

                        {selectedSpk !== null &&
                            pendingMasterTasks.length ===
                            0 && (
                                <div className="daily-progress-task-empty">
                                    Tidak ada pending dari Progress Report.
                                </div>
                            )}

                        {selectedSpk !== null &&
                            pendingMasterTasks.map(
                                (pending) => (
                                    <div
                                        className="daily-progress-carry-card"
                                        key={`master-pending-${pending.detailId}`}
                                    >
                                        <div>
                                            <strong>
                                                {pending.parentName}{' '}
                                                /{' '}
                                                {pending.taskName}
                                            </strong>

                                            <span>
                                                {pending.nomor} /{' '}
                                                {pending.tanggal}
                                            </span>
                                        </div>

                                        <span className="daily-progress-carry-badge">
                                            Pending
                                        </span>
                                    </div>
                                ),
                            )}
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

                        {selectedSpk !== null &&
                            selectedJob === null && (
                                <div className="daily-progress-task-empty">
                                    SPK terpilih belum memiliki master pekerjaan.
                                </div>
                            )}

                        {selectedJob !== null &&
                            selectedJob.tasks.map((parent) => {
                                const visibleChildren =
                                    parent.children.filter(
                                        (child) =>
                                            !isMasterChildPending(
                                                child,
                                            ),
                                    )

                                return (
                                    <div
                                        className="daily-progress-task-group"
                                        key={parent.id}
                                    >
                                        <h3>{parent.task_name}</h3>

                                        {visibleChildren.length ===
                                            0 && (
                                            <div className="daily-progress-task-empty compact">
                                                Tidak ada sub task.
                                            </div>
                                        )}

                                        {visibleChildren.map(
                                            (child) => {
                                            const key = `master-${child.id}`
                                            const isCompleted =
                                                isChildCompleted(
                                                    child,
                                                )
                                            const history =
                                                getChildHistory(
                                                    child,
                                                )

                                            return (
                                                <div
                                                    className="daily-progress-task-entry"
                                                    key={key}
                                                >
                                                    <label
                                                        className={`daily-progress-task-option ${
                                                            isCompleted
                                                                ? 'disabled'
                                                                : ''
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                isCompleted
                                                                    ? false
                                                                    : isSelected(
                                                                        key,
                                                                    )
                                                            }
                                                            disabled={
                                                                isCompleted
                                                            }
                                                            onChange={() => {
                                                                if (
                                                                    isCompleted
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
                                                                    },
                                                                )
                                                            }}
                                                        />

                                                        <span>
                                                            {
                                                                child.task_name
                                                            }
                                                        </span>
                                                    </label>

                                                    {history.length >
                                                        0 && (
                                                            <div className="daily-progress-task-history">
                                                                {history.map((progress) => (
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
                                                                                        ]
                                                                                    }
                                                                                </span>
                                                                            </div>

                                                                            {getProgressNoteText(progress) !==
                                                                                null && (
                                                                                    <p>
                                                                                        {
                                                                                            getProgressNoteText(progress)
                                                                                        }
                                                                                    </p>
                                                                                )}
                                                                        </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                </div>
                                            )
                                            },
                                        )}
                                    </div>
                                )
                            })}
                    </div>

                    <div className="daily-progress-task-section mt-4">
                        <div className="daily-progress-panel-heading">
                            <h2>Additional Task</h2>
                        </div>

                        {selectedJob === null && (
                            <div className="daily-progress-task-empty">
                                Pilih SPK dengan master pekerjaan terlebih dahulu.
                            </div>
                        )}

                        {selectedJob !== null &&
                            isLoadingAdditional && (
                                <div className="daily-progress-task-empty">
                                    Memuat additional task...
                                </div>
                            )}

                        {selectedJob !== null &&
                            !isLoadingAdditional &&
                            additionalErrorMessage !==
                            null && (
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
                            additionalTasks.map(
                                (additionalTask) =>
                                    additionalTask.details.map(
                                        (detail) => (
                                            <div
                                                className="daily-progress-task-group"
                                                key={`${additionalTask.id}-${detail.parent_id}`}
                                            >
                                                <h3>
                                                    {
                                                        detail.parent_task
                                                    }
                                                </h3>

                                                {detail.tasks.map(
                                                    (task) => {
                                                        const key = `additional-${task.id}`

                                                        if (
                                                            carriedTaskKeys.has(key)
                                                        ) {
                                                            return null
                                                        }

                                                        return (
                                                            <label
                                                                className="daily-progress-task-option"
                                                                key={
                                                                    key
                                                                }
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected(
                                                                        key,
                                                                    )}
                                                                    onChange={() =>
                                                                        handleToggleTask(
                                                                            {
                                                                                key,
                                                                                als_job_id:
                                                                                    additionalTask
                                                                                        .job
                                                                                        .id,
                                                                                als_task_additional_detail_id:
                                                                                    task.id,
                                                                            },
                                                                        )
                                                                    }
                                                                />

                                                                <span>
                                                                    {
                                                                        task.task_name
                                                                    }
                                                                </span>
                                                            </label>
                                                        )
                                                    },
                                                )}
                                            </div>
                                        ),
                                    ),
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
                                const isOpen =
                                    finding.status === 'open'

                                return (
                                    <div
                                        className="daily-progress-task-entry"
                                        key={finding.id}
                                    >
                                        <label
                                            className={`daily-progress-task-option ${
                                                isOpen
                                                    ? ''
                                                    : 'disabled'
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

                                            <span>
                                                {finding.keterangan}
                                            </span>
                                        </label>

                                        <div className="daily-progress-task-history">
                                            <div className="daily-progress-task-history-item">
                                                <div>
                                                    <strong>
                                                        {finding.nomor_pr}{' '}
                                                        /{' '}
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
