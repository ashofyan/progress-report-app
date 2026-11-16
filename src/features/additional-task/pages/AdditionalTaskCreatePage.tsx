import {
    useCallback,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { additionalTaskApi } from '@/features/additional-task/api/additionalTaskApi'
import {
    PRIORITY_OPTIONS,
    type AdditionalTaskSpkOption,
    type AdditionalTaskType,
} from '@/features/additional-task/types/additional-task.types'
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
    als_spk_id: number | ''
    job_id: number | ''
    priority: number
    details: AdditionalTaskDetailFormData[]
}

interface AdditionalTaskCreatePageProps {
    defaultType?: AdditionalTaskType
}

const createInitialForm = (): AdditionalTaskCreateFormData => ({
    client_code: '',
    als_spk_id: '',
    job_id: '',
    priority: 3,
    details: [],
})

const getSpkLabel = (spk: AdditionalTaskSpkOption): string => {
    const description =
        spk.note ??
        spk.job?.description ??
        spk.kode_product_jasa ??
        'Tanpa deskripsi'

    return `${spk.no_spk} - ${description}`
}

const AdditionalTaskCreatePage = ({ defaultType }: AdditionalTaskCreatePageProps) => {
    const navigate = useNavigate()
    const location = useLocation()

    const resolvedType: AdditionalTaskType =
        defaultType ??
        (location.pathname.includes('custom-pekerjaan')
            ? 'custom'
            : 'tambahan')

    const isCustom = resolvedType === 'custom'
    const backUrl = isCustom
        ? '/master-data/custom-pekerjaan'
        : '/pekerjaan-tambahan'

    const [formData, setFormData] =
        useState<AdditionalTaskCreateFormData>(
            createInitialForm(),
        )

    const [spks, setSpks] = useState<AdditionalTaskSpkOption[]>([])
    const [isLoadingSpks, setIsLoadingSpks] = useState<boolean>(false)
    const [spkErrorMessage, setSpkErrorMessage] = useState<string | null>(null)

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

    const selectedSpk = useMemo(() => {
        if (formData.als_spk_id === '') {
            return null
        }
        return spks.find((spk) => spk.id === formData.als_spk_id) ?? null
    }, [spks, formData.als_spk_id])

    const selectedJob = useMemo(() => {
        if (formData.job_id !== '') {
            const foundJob = jobs.find((job) => job.id === formData.job_id)
            if (foundJob) {
                return foundJob
            }
        }

        if (selectedSpk && selectedSpk.job) {
            return selectedSpk.job
        }

        return null
    }, [jobs, formData.job_id, selectedSpk])

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    const handleClientSelect = useCallback(
        async (customerCode: string): Promise<void> => {
            setFormData((previous) => ({
                ...previous,
                client_code: customerCode,
                als_spk_id: '',
                job_id: '',
                details: [],
            }))

            if (!customerCode.trim()) {
                setSpks([])
                return
            }

            setIsLoadingSpks(true)
            setSpkErrorMessage(null)

            const result = await additionalTaskApi.getSpks(customerCode.trim())
            setIsLoadingSpks(false)

            if (result.success && result.data !== undefined) {
                setSpks(result.data)
            } else {
                setSpks([])
                setSpkErrorMessage(result.message || 'Gagal memuat SPK.')
            }
        },
        [],
    )

    const handleSpkChange = (
        event: ChangeEvent<HTMLSelectElement>,
    ): void => {
        const rawValue = event.target.value
        if (rawValue === '') {
            setFormData((previous) => ({
                ...previous,
                als_spk_id: '',
                job_id: '',
                details: [],
            }))
            return
        }

        const spkId = Number(rawValue)
        const selectedSpk = spks.find((spk) => spk.id === spkId)

        if (selectedSpk && selectedSpk.job) {
            const matchedJob =
                jobs.find(
                    (j) =>
                        j.id === selectedSpk.job?.id ||
                        j.job_code === selectedSpk.job?.job_code,
                ) ?? selectedSpk.job

            setFormData((previous) => ({
                ...previous,
                als_spk_id: spkId,
                job_id: matchedJob.id,
                details: matchedJob.tasks.map((task) => ({
                    parent_id: task.id,
                    parent_task: task.task_name,
                    tasks: [{ task_name: '' }],
                })),
            }))
        } else {
            setFormData((previous) => ({
                ...previous,
                als_spk_id: spkId,
            }))
        }
    }

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
            setErrorMessage('Client wajib dipilih.')
            return
        }

        if (formData.als_spk_id === '') {
            setErrorMessage('SPK wajib dipilih.')
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
                als_spk_id: Number(formData.als_spk_id),
                job_id: Number(formData.job_id),
                type: resolvedType,
                priority: formData.priority,
                details,
            })

        setIsSubmitting(false)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        navigate(backUrl)
    }

    return (
        <div className="additional-task-page">
            <div className="additional-task-heading">
                <h1 className="additional-task-title">
                    {isCustom
                        ? 'Tambah Custom Pekerjaan'
                        : 'Tambah Pekerjaan Tambahan'}
                </h1>

                <p className="additional-task-subtitle">
                    {isCustom
                        ? 'Buat custom pekerjaan baru yang berulang setiap periode.'
                        : 'Buat pekerjaan tambahan baru untuk SPK tertentu.'}
                </p>
            </div>

            <section className="additional-task-card">
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
                        <div className="col-md-3">
                            <label className="form-label">
                                Client
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
                                    void handleClientSelect(
                                        client.customer_code,
                                    )
                                }}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">
                                SPK
                            </label>

                            <select
                                className="form-select"
                                value={formData.als_spk_id}
                                disabled={
                                    formData.client_code.trim() === '' ||
                                    isLoadingSpks ||
                                    spks.length === 0
                                }
                                onChange={handleSpkChange}
                            >
                                <option value="">
                                    {formData.client_code.trim() === ''
                                        ? 'Pilih client terlebih dahulu'
                                        : isLoadingSpks
                                            ? 'Memuat SPK...'
                                            : spks.length === 0
                                                ? 'Tidak ada SPK untuk client ini'
                                                : 'Pilih SPK'}
                                </option>

                                {spks.map((spk) => (
                                    <option
                                        key={spk.id}
                                        value={spk.id}
                                    >
                                        {getSpkLabel(spk)}
                                    </option>
                                ))}
                            </select>

                            {spkErrorMessage !== null && (
                                <div className="text-danger small mt-1">
                                    {spkErrorMessage}
                                </div>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label
                                htmlFor="job_id"
                                className="form-label"
                            >
                                Pekerjaan
                            </label>

                            {selectedJob ? (
                                <input
                                    type="text"
                                    id="job_id"
                                    className="form-control bg-light"
                                    readOnly
                                    value={`${selectedJob.job_code} - ${selectedJob.description}`}
                                    title={`${selectedJob.job_code} - ${selectedJob.description}`}
                                />
                            ) : formData.als_spk_id !== '' && !selectedSpk?.job ? (
                                <JobSelect
                                    jobs={jobs}
                                    selectedId={formData.job_id}
                                    isLoading={isLoadingJobs}
                                    errorMessage={jobErrorMessage}
                                    onSelect={handleJobSelect}
                                />
                            ) : (
                                <input
                                    type="text"
                                    id="job_id"
                                    className="form-control bg-light"
                                    readOnly
                                    disabled
                                    placeholder="Otomatis mengikuti SPK"
                                    value=""
                                />
                            )}
                        </div>

                        <div className="col-md-3">
                            <label
                                htmlFor="priority"
                                className="form-label"
                            >
                                Prioritas
                            </label>

                            <select
                                id="priority"
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
                        </div>

                        {selectedJob === null && (
                            <div className="additional-task-detail-empty">
                                Pilih SPK terlebih dahulu untuk memuat parent task pekerjaan.
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
                                navigate(backUrl)
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
