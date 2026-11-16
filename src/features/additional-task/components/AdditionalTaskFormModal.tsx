import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from 'react'

import { useMasterJobs } from '@/features/master-job/hooks/useMasterJobs'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import JobSelect from '@/features/additional-task/components/JobSelect'

import {
    PRIORITY_OPTIONS,
    type AdditionalTask,
    type AdditionalTaskApiResult,
    type AdditionalTaskStatus,
    type AdditionalTaskType,
    type CreateAdditionalTaskRequest,
    type UpdateAdditionalTaskRequest,
} from '@/features/additional-task/types/additional-task.types'

interface AdditionalTaskFormModalProps {
    isOpen: boolean
    task: AdditionalTask | null
    defaultType?: AdditionalTaskType

    onClose: () => void

    onCreate: (
        payload: CreateAdditionalTaskRequest,
    ) => Promise<AdditionalTaskApiResult<AdditionalTask>>

    onUpdate: (
        id: number,
        payload: UpdateAdditionalTaskRequest,
    ) => Promise<AdditionalTaskApiResult<AdditionalTask>>
}

interface AdditionalTaskItemFormData {
    id?: number
    task_name: string
    status: AdditionalTaskStatus
}

interface AdditionalTaskDetailFormData {
    parent_id: number
    tasks: AdditionalTaskItemFormData[]
}

interface AdditionalTaskFormData {
    client_code: string
    job_id: number | ''
    priority: number
    details: AdditionalTaskDetailFormData[]
}

const statusOptions: Array<{
    value: AdditionalTaskStatus
    label: string
}> = [
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'batal', label: 'Batal' },
    { value: 'selesai', label: 'Selesai' },
]

const createInitialForm = (): AdditionalTaskFormData => ({
    client_code: '',
    job_id: '',
    priority: 3,
    details: [],
})

const AdditionalTaskFormModal = ({
                                     isOpen,
                                     task,
                                     defaultType = 'tambahan',
                                     onClose,
                                     onCreate,
                                     onUpdate,
                                 }: AdditionalTaskFormModalProps) => {
    const [formData, setFormData] =
        useState<AdditionalTaskFormData>(
            createInitialForm(),
        )

    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const {
        jobs,
        isLoading: isLoadingJobs,
        errorMessage: jobErrorMessage,
    } = useMasterJobs()

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const selectedJob = useMemo(() => {
        if (formData.job_id === '') {
            return null
        }

        return (
            jobs.find(
                (job) => job.id === formData.job_id,
            ) ?? null
        )
    }, [jobs, formData.job_id])

    const selectedParentIds = useMemo(
        () =>
            formData.details.map(
                (detail) => detail.parent_id,
            ),
        [formData.details],
    )

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    useEffect(() => {
        if (!isOpen) {
            return
        }

        queueMicrotask(() => {
            setErrorMessage(null)

            if (task === null) {
                setFormData(createInitialForm())

                return
            }

            setFormData({
                client_code: task.client_code,
                job_id: task.job.id,
                priority: task.priority ?? 3,
                details: task.details.map((detail) => ({
                    parent_id: detail.parent_id,
                    tasks: detail.tasks.map((item) => ({
                        id: item.id,
                        task_name: item.task_name,
                        status: item.status,
                    })),
                })),
            })
        })
    }, [isOpen, task])

    if (!isOpen) {
        return null
    }

    const handleJobSelect = (
        job: typeof jobs[number],
    ): void => {
        setFormData((previous) => ({
            ...previous,
            job_id: job.id,
            details: [],
        }))
    }

    const getAvailableParentId = (): number | null => {
        if (selectedJob === null) {
            return null
        }

        const availableParent =
            selectedJob.tasks.find(
                (jobTask) =>
                    !selectedParentIds.includes(
                        jobTask.id,
                    ),
            ) ?? null

        return availableParent?.id ?? null
    }

    const handleAddDetail = (): void => {
        const parentId = getAvailableParentId()

        if (parentId === null) {
            return
        }

        setFormData((previous) => ({
            ...previous,
            details: [
                ...previous.details,
                {
                    parent_id: parentId,
                    tasks: [
                        {
                            task_name: '',
                            status: 'open',
                        },
                    ],
                },
            ],
        }))
    }

    const handleParentChange = (
        detailIndex: number,
        value: string,
    ): void => {
        setFormData((previous) => ({
            ...previous,
            details: previous.details.map(
                (detail, index) =>
                    index === detailIndex
                        ? {
                            ...detail,
                            parent_id: Number(value),
                        }
                        : detail,
            ),
        }))
    }

    const handleRemoveDetail = (
        detailIndex: number,
    ): void => {
        setFormData((previous) => ({
            ...previous,
            details: previous.details.filter(
                (_, index) => index !== detailIndex,
            ),
        }))
    }

    const handleAddTask = (
        detailIndex: number,
    ): void => {
        setFormData((previous) => ({
            ...previous,
            details: previous.details.map(
                (detail, index) =>
                    index === detailIndex
                        ? {
                            ...detail,
                            tasks: [
                                ...detail.tasks,
                                {
                                    task_name: '',
                                    status: 'open',
                                },
                            ],
                        }
                        : detail,
            ),
        }))
    }

    const handleTaskNameChange = (
        detailIndex: number,
        taskIndex: number,
        value: string,
    ): void => {
        setFormData((previous) => ({
            ...previous,
            details: previous.details.map(
                (detail, currentDetailIndex) => {
                    if (
                        currentDetailIndex !==
                        detailIndex
                    ) {
                        return detail
                    }

                    return {
                        ...detail,
                        tasks: detail.tasks.map(
                            (
                                item,
                                currentTaskIndex,
                            ) =>
                                currentTaskIndex === taskIndex
                                    ? {
                                        ...item,
                                        task_name: value,
                                    }
                                    : item,
                        ),
                    }
                },
            ),
        }))
    }

    const handleStatusChange = (
        detailIndex: number,
        taskIndex: number,
        value: AdditionalTaskStatus,
    ): void => {
        setFormData((previous) => ({
            ...previous,
            details: previous.details.map(
                (detail, currentDetailIndex) => {
                    if (
                        currentDetailIndex !==
                        detailIndex
                    ) {
                        return detail
                    }

                    return {
                        ...detail,
                        tasks: detail.tasks.map(
                            (
                                item,
                                currentTaskIndex,
                            ) =>
                                currentTaskIndex === taskIndex
                                    ? {
                                        ...item,
                                        status: value,
                                    }
                                    : item,
                        ),
                    }
                },
            ),
        }))
    }

    const handleRemoveTask = (
        detailIndex: number,
        taskIndex: number,
    ): void => {
        setFormData((previous) => ({
            ...previous,
            details: previous.details.map(
                (detail, currentDetailIndex) => {
                    if (
                        currentDetailIndex !==
                        detailIndex
                    ) {
                        return detail
                    }

                    return {
                        ...detail,
                        tasks: detail.tasks.filter(
                            (
                                _,
                                currentTaskIndex,
                            ) =>
                                currentTaskIndex !==
                                taskIndex,
                        ),
                    }
                },
            ),
        }))
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()

        setErrorMessage(null)

        if (formData.client_code.trim() === '') {
            setErrorMessage('Kode client wajib diisi.')

            return
        }

        if (formData.job_id === '') {
            setErrorMessage('Pekerjaan wajib dipilih.')

            return
        }

        if (formData.details.length === 0) {
            setErrorMessage(
                'Minimal terdapat satu parent task.',
            )

            return
        }

        const hasDuplicateParent =
            new Set(selectedParentIds).size !==
            selectedParentIds.length

        if (hasDuplicateParent) {
            setErrorMessage(
                'Parent task tidak boleh duplikat.',
            )

            return
        }

        const hasEmptyTask =
            formData.details.some(
                (detail) =>
                    detail.tasks.length === 0 ||
                    detail.tasks.some(
                        (item) =>
                            item.task_name.trim() === '',
                    ),
            )

        if (hasEmptyTask) {
            setErrorMessage(
                'Setiap parent harus memiliki minimal satu task dan nama task tidak boleh kosong.',
            )

            return
        }

        setIsSubmitting(true)

        const commonPayload = {
            client_code: formData.client_code.trim(),
            job_id: formData.job_id,
            als_spk_id: task?.als_spk_id ?? 0,
            type: task?.type ?? defaultType,
            priority: formData.priority,
        }

        const result =
            task === null
                ? await onCreate({
                    ...commonPayload,
                    details: formData.details.map(
                        (detail) => ({
                            parent_id: detail.parent_id,
                            tasks: detail.tasks.map(
                                (item) => ({
                                    task_name:
                                        item.task_name.trim(),
                                }),
                            ),
                        }),
                    ),
                })
                : await onUpdate(task.id, {
                    ...commonPayload,
                    details: formData.details.map(
                        (detail) => ({
                            parent_id: detail.parent_id,
                            tasks: detail.tasks.map(
                                (item) => ({
                                    id: item.id,
                                    task_name:
                                        item.task_name.trim(),
                                    status: item.status,
                                }),
                            ),
                        }),
                    ),
                })

        setIsSubmitting(false)

        if (!result.success) {
            setErrorMessage(result.message)

            return
        }

        onClose()
    }

    return (
        <div className="additional-task-modal-backdrop">
            <div className="additional-task-modal">
                <div className="additional-task-modal-header">
                    <h2>
                        {task === null
                            ? (defaultType === 'custom' ? 'Tambah Custom Pekerjaan' : 'Tambah Pekerjaan Tambahan')
                            : (defaultType === 'custom' ? 'Edit Custom Pekerjaan' : 'Edit Pekerjaan Tambahan')}
                    </h2>

                    <button
                        type="button"
                        className="additional-task-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="additional-task-modal-body">
                        {errorMessage !== null && (
                            <div
                                className="alert alert-danger"
                                role="alert"
                            >
                                {errorMessage}
                            </div>
                        )}

                        {task?.spk && (
                            <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center gap-2">
                                <i className="bi bi-file-earmark-text" />
                                <div>
                                    <strong>SPK:</strong> {task.spk.no_spk} {task.spk.note ? `(${task.spk.note})` : ''}
                                </div>
                            </div>
                        )}
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label">
                                    Kode Client
                                </label>

                                <ClientSelect
                                    clients={clients}
                                    selectedCode={
                                        formData.client_code
                                    }
                                    isLoading={isLoadingClients}
                                    errorMessage={
                                        clientErrorMessage
                                    }
                                    onSearch={handleClientSearch}
                                    onSelect={(client) => {
                                        setFormData(
                                            (previous) => ({
                                                ...previous,
                                                client_code:
                                                    client.customer_code,
                                            }),
                                        )
                                    }}
                                />
                            </div>

                            <div className="col-md-5">
                                <label
                                    htmlFor="job_id"
                                    className="form-label"
                                >
                                    Pekerjaan
                                </label>

                                <JobSelect
                                    jobs={jobs}
                                    selectedId={formData.job_id}
                                    isLoading={isLoadingJobs}
                                    errorMessage={jobErrorMessage}
                                    onSelect={handleJobSelect}
                                />
                            </div>

                            <div className="col-md-3">
                                <label
                                    htmlFor="modal_priority"
                                    className="form-label"
                                >
                                    Prioritas
                                </label>

                                <select
                                    id="modal_priority"
                                    className="form-select"
                                    value={formData.priority}
                                    onChange={(event) =>
                                        setFormData((previous) => ({
                                            ...previous,
                                            priority: Number(
                                                event.target.value,
                                            ),
                                        }))
                                    }
                                >
                                    {PRIORITY_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="additional-task-detail-section">
                            <div className="additional-task-detail-heading">
                                <h3>Detail Task</h3>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={
                                        selectedJob === null ||
                                        getAvailableParentId() ===
                                        null
                                    }
                                    onClick={handleAddDetail}
                                >
                                    <i className="bi bi-plus-lg me-1" />
                                    Tambah Parent
                                </button>
                            </div>

                            {formData.details.length === 0 && (
                                <div className="additional-task-detail-empty">
                                    Belum ada detail task.
                                </div>
                            )}

                            {formData.details.map(
                                (detail, detailIndex) => (
                                    <div
                                        className="additional-task-detail-card"
                                        key={`detail-${detailIndex}`}
                                    >
                                        <div className="additional-task-parent-row">
                                            <select
                                                className="form-select"
                                                value={
                                                    detail.parent_id
                                                }
                                                onChange={(event) =>
                                                    handleParentChange(
                                                        detailIndex,
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                            >
                                                {selectedJob?.tasks.map(
                                                    (
                                                        jobTask,
                                                    ) => {
                                                        const isUsed =
                                                            selectedParentIds.includes(
                                                                jobTask.id,
                                                            ) &&
                                                            detail.parent_id !==
                                                            jobTask.id

                                                        return (
                                                            <option
                                                                key={
                                                                    jobTask.id
                                                                }
                                                                value={
                                                                    jobTask.id
                                                                }
                                                                disabled={
                                                                    isUsed
                                                                }
                                                            >
                                                                {
                                                                    jobTask.task_name
                                                                }
                                                            </option>
                                                        )
                                                    },
                                                )}
                                            </select>

                                            <button
                                                type="button"
                                                className="btn btn-outline-danger"
                                                onClick={() =>
                                                    handleRemoveDetail(
                                                        detailIndex,
                                                    )
                                                }
                                            >
                                                <i className="bi bi-trash3" />
                                            </button>
                                        </div>

                                        <div className="additional-task-items">
                                            {detail.tasks.map(
                                                (
                                                    item,
                                                    taskIndex,
                                                ) => (
                                                    <div
                                                        className="additional-task-item-row"
                                                        key={`item-${detailIndex}-${taskIndex}`}
                                                    >
                                                        <i className="bi bi-arrow-return-right" />

                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={
                                                                item.task_name
                                                            }
                                                            maxLength={256}
                                                            placeholder="Nama task tambahan"
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                handleTaskNameChange(
                                                                    detailIndex,
                                                                    taskIndex,
                                                                    event
                                                                        .target
                                                                        .value,
                                                                )
                                                            }
                                                        />

                                                        {task !== null && defaultType !== 'custom' && (
                                                            <select
                                                                className="form-select additional-task-status-select"
                                                                value={
                                                                    item.status
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    handleStatusChange(
                                                                        detailIndex,
                                                                        taskIndex,
                                                                        event
                                                                            .target
                                                                            .value as AdditionalTaskStatus,
                                                                    )
                                                                }
                                                            >
                                                                {statusOptions.map(
                                                                    (
                                                                        status,
                                                                    ) => (
                                                                        <option
                                                                            key={
                                                                                status.value
                                                                            }
                                                                            value={
                                                                                status.value
                                                                            }
                                                                        >
                                                                            {
                                                                                status.label
                                                                            }
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger"
                                                            onClick={() =>
                                                                handleRemoveTask(
                                                                    detailIndex,
                                                                    taskIndex,
                                                                )
                                                            }
                                                        >
                                                            <i className="bi bi-x-lg" />
                                                        </button>
                                                    </div>
                                                ),
                                            )}

                                            <button
                                                type="button"
                                                className="additional-task-add-item"
                                                onClick={() =>
                                                    handleAddTask(
                                                        detailIndex,
                                                    )
                                                }
                                            >
                                                <i className="bi bi-plus-lg" />
                                                Tambah Task
                                            </button>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>

                    <div className="additional-task-modal-footer">
                        <button
                            type="button"
                            className="btn btn-light"
                            disabled={isSubmitting}
                            onClick={onClose}
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

                            {task === null
                                ? 'Simpan'
                                : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AdditionalTaskFormModal
