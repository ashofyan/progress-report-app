import {
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'

import type {
    CreateMasterJobRequest,
    JobTaskPayload,
    MasterJob,
    MasterJobApiResult,
    UpdateMasterJobRequest,
} from '@/features/master-job/types/master-job.types'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useServiceProducts } from '@/features/master-job/hooks/useServiceProducts'

import ServiceSelect from '@/features/master-job/components/ServiceSelect'

interface MasterJobFormModalProps {
    isOpen: boolean
    job: MasterJob | null

    onClose: () => void

    onCreate: (
        payload: CreateMasterJobRequest,
    ) => Promise<MasterJobApiResult<MasterJob>>

    onUpdate: (
        id: number,
        payload: UpdateMasterJobRequest,
    ) => Promise<MasterJobApiResult<MasterJob>>
}

interface MasterJobFormData {
    job_code: string
    description: string
    tasks: JobTaskPayload[]
}

const createInitialForm = (): MasterJobFormData => ({
    job_code: '',
    description: '',
    tasks: [],
})

const MasterJobFormModal = ({
                                isOpen,
                                job,
                                onClose,
                                onCreate,
                                onUpdate,
                            }: MasterJobFormModalProps) => {
    const [formData, setFormData] =
        useState<MasterJobFormData>(
            createInitialForm(),
        )

    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const { employee } = useAuth()

    const {
        services,
        isLoading: isLoadingServices,
        errorMessage: serviceErrorMessage,
    } = useServiceProducts(
        employee?.asal_pt ?? null,
    )

    useEffect(() => {
        if (!isOpen) {
            return
        }

        setErrorMessage(null)

        if (job === null) {
            setFormData(createInitialForm())

            return
        }

        setFormData({
            job_code: job.job_code,
            description: job.description,

            tasks: job.tasks.map((task) => ({
                id: task.id,
                task_name: task.task_name,

                children: task.children.map(
                    (child) => ({
                        id: child.id,
                        task_name: child.task_name,
                    }),
                ),
            })),
        })
    }, [isOpen, job])

    if (!isOpen) {
        return null
    }

    const handleFieldChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        const { name, value } = event.target

        if (name === 'job_code') {
            setFormData((previous) => ({
                ...previous,
                job_code: value,
            }))

            return
        }

        if (name === 'description') {
            setFormData((previous) => ({
                ...previous,
                description: value,
            }))
        }
    }

    const handleAddTask = (): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: [
                ...previous.tasks,
                {
                    task_name: '',
                    children: [],
                },
            ],
        }))
    }

    const handleTaskChange = (
        taskIndex: number,
        value: string,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.map(
                (task, index) =>
                    index === taskIndex
                        ? {
                            ...task,
                            task_name: value,
                        }
                        : task,
            ),
        }))
    }

    const handleRemoveTask = (
        taskIndex: number,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.filter(
                (_, index) => index !== taskIndex,
            ),
        }))
    }

    const handleAddSubTask = (
        taskIndex: number,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.map(
                (task, index) =>
                    index === taskIndex
                        ? {
                            ...task,

                            children: [
                                ...task.children,
                                {
                                    task_name: '',
                                },
                            ],
                        }
                        : task,
            ),
        }))
    }

    const handleSubTaskChange = (
        taskIndex: number,
        childIndex: number,
        value: string,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.map(
                (task, currentTaskIndex) => {
                    if (
                        currentTaskIndex !== taskIndex
                    ) {
                        return task
                    }

                    return {
                        ...task,

                        children: task.children.map(
                            (child, currentChildIndex) =>
                                currentChildIndex === childIndex
                                    ? {
                                        ...child,
                                        task_name: value,
                                    }
                                    : child,
                        ),
                    }
                },
            ),
        }))
    }

    const handleRemoveSubTask = (
        taskIndex: number,
        childIndex: number,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.map(
                (task, currentTaskIndex) => {
                    if (
                        currentTaskIndex !== taskIndex
                    ) {
                        return task
                    }

                    return {
                        ...task,

                        children: task.children.filter(
                            (_, currentChildIndex) =>
                                currentChildIndex !== childIndex,
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

        if (formData.job_code.trim() === '') {
            setErrorMessage(
                'Kode pekerjaan wajib diisi.',
            )

            return
        }

        if (formData.description.trim() === '') {
            setErrorMessage(
                'Deskripsi pekerjaan wajib diisi.',
            )

            return
        }

        const hasInvalidTask =
            formData.tasks.some(
                (task) =>
                    task.task_name.trim() === '' ||
                    task.children.some(
                        (child) =>
                            child.task_name.trim() === '',
                    ),
            )

        if (hasInvalidTask) {
            setErrorMessage(
                'Task dan sub task tidak boleh kosong.',
            )

            return
        }

        setIsSubmitting(true)

        const payload = {
            job_code: formData.job_code.trim(),
            description:
                formData.description.trim(),

            tasks: formData.tasks.map(
                (task) => ({
                    ...task,
                    task_name: task.task_name.trim(),

                    children: task.children.map(
                        (child) => ({
                            ...child,
                            task_name:
                                child.task_name.trim(),
                        }),
                    ),
                }),
            ),
        }

        const result =
            job === null
                ? await onCreate(payload)
                : await onUpdate(
                    job.id,
                    payload,
                )

        setIsSubmitting(false)

        if (!result.success) {
            setErrorMessage(result.message)

            return
        }

        onClose()
    }

    return (
        <div className="master-job-modal-backdrop">
            <div className="master-job-modal">
                <div className="master-job-modal-header">
                    <h2>
                        {job === null
                            ? 'Tambah Pekerjaan'
                            : 'Edit Pekerjaan'}
                    </h2>

                    <button
                        type="button"
                        className="master-job-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="master-job-modal-body">
                        {errorMessage !== null && (
                            <div
                                className="alert alert-danger"
                                role="alert"
                            >
                                {errorMessage}
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="form-label">
                                Nama Jasa
                            </label>

                            <ServiceSelect
                                services={services}
                                selectedCode={formData.job_code}
                                isLoading={isLoadingServices}
                                errorMessage={serviceErrorMessage}
                                onSelect={(service) => {
                                    setFormData((previous) => ({
                                        ...previous,
                                        job_code: service.product_code,
                                    }))
                                }}
                            />
                        </div>

                        <div className="mb-4">
                            <label
                                htmlFor="description"
                                className="form-label"
                            >
                                Deskripsi
                            </label>

                            <input
                                id="description"
                                name="description"
                                type="text"
                                value={formData.description}
                                className="form-control"
                                maxLength={256}
                                onChange={handleFieldChange}
                            />
                        </div>

                        <div className="master-job-task-section">
                            <div className="master-job-task-heading">
                                <h3>Task</h3>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={handleAddTask}
                                >
                                    <i className="bi bi-plus-lg me-1" />

                                    Tambah Task
                                </button>
                            </div>

                            {formData.tasks.length === 0 && (
                                <div className="master-job-task-empty">
                                    Belum ada task.
                                </div>
                            )}

                            {formData.tasks.map(
                                (task, taskIndex) => (
                                    <div
                                        className="master-job-task-card"
                                        key={`task-${taskIndex}`}
                                    >
                                        <div className="master-job-task-row">
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={task.task_name}
                                                maxLength={256}
                                                placeholder="Nama task"
                                                onChange={(event) =>
                                                    handleTaskChange(
                                                        taskIndex,
                                                        event.target.value,
                                                    )
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="btn btn-outline-danger"
                                                onClick={() =>
                                                    handleRemoveTask(
                                                        taskIndex,
                                                    )
                                                }
                                            >
                                                <i className="bi bi-trash3" />
                                            </button>
                                        </div>

                                        <div className="master-job-subtasks">
                                            {task.children.map(
                                                (
                                                    child,
                                                    childIndex,
                                                ) => (
                                                    <div
                                                        className="master-job-subtask-row"
                                                        key={`sub-${taskIndex}-${childIndex}`}
                                                    >
                                                        <i className="bi bi-arrow-return-right" />

                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={
                                                                child.task_name
                                                            }
                                                            maxLength={256}
                                                            placeholder="Nama sub task"
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                handleSubTaskChange(
                                                                    taskIndex,
                                                                    childIndex,
                                                                    event
                                                                        .target
                                                                        .value,
                                                                )
                                                            }
                                                        />

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger"
                                                            onClick={() =>
                                                                handleRemoveSubTask(
                                                                    taskIndex,
                                                                    childIndex,
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
                                                className="master-job-add-subtask"
                                                onClick={() =>
                                                    handleAddSubTask(
                                                        taskIndex,
                                                    )
                                                }
                                            >
                                                <i className="bi bi-plus-lg" />

                                                Tambah Sub Task
                                            </button>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>

                    <div className="master-job-modal-footer">
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

                            {job === null
                                ? 'Simpan'
                                : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default MasterJobFormModal
