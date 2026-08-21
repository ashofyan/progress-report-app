import {
    useCallback,
    useMemo,
    useState,
    type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { additionalTaskApi } from '@/features/additional-task/api/additionalTaskApi'
import ClientSelect from '@/features/additional-task/components/ClientSelect'
import JobSelect from '@/features/additional-task/components/JobSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import { useMasterJobs } from '@/features/master-job/hooks/useMasterJobs'

import '@/features/additional-task/styles/additional-task.scss'

interface AdditionalTaskItemFormData {
    task_name: string
}

interface AdditionalTaskDetailFormData {
    parent_id: number
    parent_task: string
    tasks: AdditionalTaskItemFormData[]
}

interface AdditionalTaskCreateFormData {
    client_code: string
    job_id: number | ''
    details: AdditionalTaskDetailFormData[]
}

const createInitialForm = (): AdditionalTaskCreateFormData => ({
    client_code: '',
    job_id: '',
    details: [],
})

const AdditionalTaskCreatePage = () => {
    const navigate = useNavigate()

    const [formData, setFormData] =
        useState<AdditionalTaskCreateFormData>(
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

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    const handleJobSelect = (
        job: typeof jobs[number],
    ): void => {
        setFormData((previous) => ({
            ...previous,
            job_id: job.id,
            details: job.tasks.map((task) => ({
                parent_id: task.id,
                parent_task: task.task_name,
                tasks: [
                    {
                        task_name: '',
                    },
                ],
            })),
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
                                task,
                                currentTaskIndex,
                            ) =>
                                currentTaskIndex === taskIndex
                                    ? {
                                        task_name: value,
                                    }
                                    : task,
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

        const details = formData.details
            .map((detail) => ({
                parent_id: detail.parent_id,
                tasks: detail.tasks
                    .map((task) => ({
                        task_name:
                            task.task_name.trim(),
                    }))
                    .filter(
                        (task) =>
                            task.task_name !== '',
                    ),
            }))
            .filter(
                (detail) =>
                    detail.tasks.length > 0,
            )

        if (details.length === 0) {
            setErrorMessage(
                'Minimal isi satu task tambahan pada salah satu parent.',
            )

            return
        }

        setIsSubmitting(true)

        const result =
            await additionalTaskApi.create({
                client_code:
                    formData.client_code.trim(),
                job_id: formData.job_id,
                details,
            })

        setIsSubmitting(false)

        if (!result.success) {
            setErrorMessage(result.message)

            return
        }

        navigate('/master-data/task')
    }

    return (
        <div className="additional-task-page">
            <div className="additional-task-heading">
                <h1 className="additional-task-title">
                    Tambah Task
                </h1>

                <div className="additional-task-breadcrumb">
                    <span className="active">
                        Master Data
                    </span>

                    <span>/</span>

                    <span>Task</span>

                    <span>/</span>

                    <span>Tambah</span>
                </div>
            </div>

            <section className="additional-task-form-page">
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
                        <div className="col-md-5">
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

                        <div className="col-md-7">
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
                    </div>

                    <div className="additional-task-detail-section">
                        <div className="additional-task-detail-heading">
                            <h3>Detail Task</h3>
                        </div>

                        {selectedJob === null && (
                            <div className="additional-task-detail-empty">
                                Pilih pekerjaan terlebih dahulu.
                            </div>
                        )}

                        {selectedJob !== null &&
                            formData.details.length === 0 && (
                                <div className="additional-task-detail-empty">
                                    Pekerjaan belum memiliki parent task.
                                </div>
                            )}

                        {formData.details.map(
                            (detail, detailIndex) => (
                                <div
                                    className="additional-task-detail-card"
                                    key={detail.parent_id}
                                >
                                    <div className="additional-task-parent-title">
                                        {
                                            detail.parent_task
                                        }
                                    </div>

                                    <div className="additional-task-items">
                                        {detail.tasks.map(
                                            (
                                                item,
                                                taskIndex,
                                            ) => (
                                                <div
                                                    className="additional-task-item-row"
                                                    key={`item-${detail.parent_id}-${taskIndex}`}
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

                    <div className="additional-task-form-page-footer">
                        <button
                            type="button"
                            className="btn btn-light"
                            disabled={isSubmitting}
                            onClick={() =>
                                navigate('/master-data/task')
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

export default AdditionalTaskCreatePage
