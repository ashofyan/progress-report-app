import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import {
    useNavigate,
    useParams,
} from 'react-router-dom'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import type {
    DailyProgressFormSpk,
} from '@/features/daily-progress/types/daily-progress.types'
import { temuanApi } from '@/features/temuan/api/temuanApi'

import '@/features/temuan/styles/temuan.scss'

interface TaskNoteEntry {
    id?: number
    note: string
}

const getToday = (): string => {
    return new Date().toISOString().slice(0, 10)
}

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

const TemuanFormPage = () => {
    const navigate = useNavigate()
    const params = useParams<{ id: string }>()
    const temuanId =
        params.id === undefined ? null : Number(params.id)
    const isEdit =
        temuanId !== null && Number.isFinite(temuanId)

    const [tanggal, setTanggal] =
        useState<string>(getToday())
    const [priority, setPriority] =
        useState<number>(3)
    const [clientCode, setClientCode] =
        useState<string>('')
    const [spks, setSpks] =
        useState<DailyProgressFormSpk[]>([])
    const [selectedSpkId, setSelectedSpkId] =
        useState<number | ''>('')
    const [taskNotes, setTaskNotes] =
        useState<Record<string, TaskNoteEntry[]>>({})
    const [files, setFiles] =
        useState<File[]>([])
    const [isLoadingTemuan, setIsLoadingTemuan] =
        useState<boolean>(isEdit)
    const [isLoadingSpks, setIsLoadingSpks] =
        useState<boolean>(false)
    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)
    const [spkErrorMessage, setSpkErrorMessage] =
        useState<string | null>(null)

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const selectedSpk = useMemo(
        () =>
            spks.find((spk) => spk.spk_id === selectedSpkId) ??
            null,
        [
            selectedSpkId,
            spks,
        ],
    )

    const selectedJob = selectedSpk?.job ?? null

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    useEffect(() => {
        if (!isEdit || temuanId === null) {
            return
        }

        queueMicrotask(() => {
            const fetchTemuan = async (): Promise<void> => {
                setIsLoadingTemuan(true)
                setErrorMessage(null)

                const result = await temuanApi.getById(temuanId)

                setIsLoadingTemuan(false)

                if (
                    !result.success ||
                    result.data === undefined
                ) {
                    setErrorMessage(result.message)
                    return
                }

                setTanggal(result.data.tanggal)
                setPriority(result.data.priority ?? 3)
                setClientCode(result.data.client_code)
                setSelectedSpkId(result.data.spk?.id ?? '')

                const initialNotes: Record<string, TaskNoteEntry[]> = {}
                result.data.notes.forEach((note) => {
                    const key = String(note.als_job_task_id)

                    if (!initialNotes[key]) {
                        initialNotes[key] = []
                    }
                    initialNotes[key].push({
                        id: note.id,
                        note: note.note ?? '',
                    })
                })
                setTaskNotes(initialNotes)
            }

            void fetchTemuan()
        })
    }, [
        isEdit,
        temuanId,
    ])

    useEffect(() => {
        if (clientCode.trim() === '') {
            queueMicrotask(() => {
                setSpks([])
                if (!isEdit) {
                    setSelectedSpkId('')
                    setTaskNotes({})
                }
            })
            return
        }

        queueMicrotask(() => {
            const fetchSpks = async (): Promise<void> => {
                setIsLoadingSpks(true)
                setSpkErrorMessage(null)

                const result =
                    await dailyProgressApi.getFormData({
                        client_code: clientCode.trim(),
                    })

                setIsLoadingSpks(false)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setSpks(result.data.spks)
                    return
                }

                setSpks([])
                setSpkErrorMessage(result.message)
            }

            void fetchSpks()
        })
    }, [
        clientCode,
        isEdit,
    ])

    const handleAddNoteForTask = (key: string): void => {
        setTaskNotes((previous) => ({
            ...previous,
            [key]: [...(previous[key] ?? []), { note: '' }],
        }))
    }

    const handleNoteChange = (
        key: string,
        index: number,
        value: string,
    ): void => {
        setTaskNotes((previous) => ({
            ...previous,
            [key]: (previous[key] ?? []).map((entry, idx) =>
                idx === index ? { ...entry, note: value } : entry,
            ),
        }))
    }

    const handleRemoveNoteForTask = (
        key: string,
        index: number,
    ): void => {
        setTaskNotes((previous) => {
            const list = (previous[key] ?? []).filter(
                (_, idx) => idx !== index,
            )
            const updated = { ...previous }
            if (list.length === 0) {
                delete updated[key]
            } else {
                updated[key] = list
            }
            return updated
        })
    }

    const handleFilesChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        setFiles(Array.from(event.target.files ?? []))
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
            setErrorMessage('Client wajib dipilih.')
            return
        }

        if (!isEdit && selectedSpk === null) {
            setErrorMessage('SPK wajib dipilih.')
            return
        }

        const submittedNotes: Array<{
            id?: number
            als_job_task_id: number
            note: string
        }> = []

        Object.entries(taskNotes).forEach(([key, noteList]) => {
            const taskId = Number(key)
            if (!Number.isFinite(taskId) || taskId <= 0) {
                return
            }

            noteList.forEach((item) => {
                const trimmed = item.note.trim()
                if (trimmed === '') {
                    return
                }

                submittedNotes.push({
                    id: item.id,
                    als_job_task_id: taskId,
                    note: trimmed,
                })
            })
        })

        if (submittedNotes.length === 0) {
            setErrorMessage(
                'Minimal satu catatan Temuan pada task pekerjaan wajib diisi.',
            )
            return
        }

        setIsSubmitting(true)

        if (isEdit && temuanId !== null) {
            const result = await temuanApi.update(temuanId, {
                tanggal,
                priority,
                notes: submittedNotes.map((note) => ({
                    id: note.id,
                    als_job_task_id: note.als_job_task_id,
                    note: note.note,
                })),
            })

            setIsSubmitting(false)

            if (!result.success) {
                setErrorMessage(result.message)
                return
            }

            navigate('/temuan')
            return
        }

        if (selectedSpk === null) {
            setIsSubmitting(false)
            setErrorMessage('SPK wajib dipilih.')
            return
        }

        const createResult = await temuanApi.create({
            tanggal,
            client_code: clientCode.trim(),
            als_spk_id: selectedSpk.spk_id,
            priority,
            type: 'TM',
            notes: submittedNotes.map((note) => ({
                als_job_task_id: note.als_job_task_id,
                note: note.note,
            })),
        })

        if (
            !createResult.success ||
            createResult.data === undefined
        ) {
            setIsSubmitting(false)
            setErrorMessage(createResult.message)
            return
        }

        if (files.length > 0) {
            const uploadResult = await temuanApi.uploadFiles(
                createResult.data.id,
                files,
            )

            if (!uploadResult.success) {
                setIsSubmitting(false)
                setErrorMessage(uploadResult.message)
                return
            }
        }

        setIsSubmitting(false)
        navigate('/temuan')
    }

    const renderedTaskKeys = useMemo(() => {
        const keys = new Set<string>()
        selectedJob?.tasks?.forEach((task) => {
            keys.add(String(task.id))
        })
        return keys
    }, [selectedJob?.tasks])

    const unmappedNotes = useMemo(() => {
        return Object.entries(taskNotes).filter(
            ([key, list]) => !renderedTaskKeys.has(key) && list.length > 0,
        )
    }, [taskNotes, renderedTaskKeys])

    const renderTaskRow = (key: string, taskName: string) => {
        const notesList = taskNotes[key] ?? []

        return (
            <div className="temuan-task-row" key={key}>
                <div className="temuan-task-header">
                    <span className="temuan-task-name">{taskName}</span>
                    <button
                        type="button"
                        className="temuan-task-add-btn"
                        onClick={() => handleAddNoteForTask(key)}
                    >
                        <i className="bi bi-plus-circle" />
                        <span>Tambah</span>
                    </button>
                </div>

                {notesList.map((entry, index) => (
                    <div className="temuan-task-note-box" key={index}>
                        <textarea
                            className="temuan-task-note-textarea"
                            placeholder="Tulis Note..."
                            rows={2}
                            value={entry.note}
                            onChange={(e) =>
                                handleNoteChange(key, index, e.target.value)
                            }
                        />
                        <button
                            type="button"
                            className="temuan-task-note-delete-btn"
                            onClick={() => handleRemoveNoteForTask(key, index)}
                            title="Hapus Catatan"
                        >
                            <i className="bi bi-trash" />
                        </button>
                    </div>
                ))}
            </div>
        )
    }

    if (isLoadingTemuan) {
        return (
            <div className="temuan-page">
                <div className="temuan-loading">
                    <div className="spinner-border" />
                    <span>Memuat Temuan...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="temuan-page">
            <div className="temuan-heading">
                <h1 className="temuan-title">
                    {isEdit ? 'Edit Temuan' : 'Tambah Temuan'}
                </h1>

                <div className="temuan-breadcrumb">
                    <span className="active">Progress</span>
                    <span>/</span>
                    <span>Temuan</span>
                    <span>/</span>
                    <span>{isEdit ? 'Edit' : 'Tambah'}</span>
                </div>
            </div>

            <section className="temuan-form-page">
                <form onSubmit={handleSubmit}>
                    {errorMessage !== null && (
                        <div className="alert alert-danger">
                            {errorMessage}
                        </div>
                    )}

                    <div className="row g-3 mb-4">
                        <div className="col-md-3">
                            <label className="form-label">
                                Tanggal
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={tanggal}
                                onChange={(
                                    event: ChangeEvent<HTMLInputElement>,
                                ) =>
                                    setTanggal(event.target.value)
                                }
                            />
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">
                                Prioritas
                            </label>
                            <select
                                className="form-select"
                                value={priority}
                                onChange={(
                                    event: ChangeEvent<HTMLSelectElement>,
                                ) =>
                                    setPriority(Number(event.target.value))
                                }
                            >
                                <option value={1}>1 - Sangat Rendah</option>
                                <option value={2}>2 - Rendah</option>
                                <option value={3}>3 - Sedang / Normal</option>
                                <option value={4}>4 - Tinggi</option>
                                <option value={5}>5 - Kritis / Urgent</option>
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">
                                Client
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
                                    setTaskNotes({})
                                }}
                            />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">
                                SPK
                            </label>
                            <select
                                className="form-select"
                                value={selectedSpkId}
                                disabled={
                                    isEdit ||
                                    isLoadingSpks ||
                                    spks.length === 0
                                }
                                onChange={(
                                    event: ChangeEvent<HTMLSelectElement>,
                                ) => {
                                    setSelectedSpkId(
                                        event.target.value === ''
                                            ? ''
                                            : Number(
                                                event.target.value,
                                            ),
                                    )
                                    setTaskNotes({})
                                }}
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
                    </div>

                    {isLoadingSpks && (
                        <div className="temuan-state compact mb-3">
                            Memuat SPK...
                        </div>
                    )}

                    {!isLoadingSpks &&
                        spkErrorMessage !== null && (
                            <div className="temuan-state error compact mb-3">
                                {spkErrorMessage}
                            </div>
                        )}

                    {selectedSpk === null && (
                        <div className="daily-progress-task-empty mb-4">
                            Pilih SPK terlebih dahulu untuk menampilkan daftar pekerjaan.
                        </div>
                    )}

                    {selectedSpk !== null && (
                        <div className="temuan-task-section mb-4">
                            <div className="daily-progress-panel-heading">
                                <div className="daily-progress-panel-icon info">
                                    <i className="bi bi-list-check" />
                                </div>
                                <div>
                                    <h2>Master Task</h2>
                                    <p>Pekerjaan utama dari SPK. Tambahkan catatan temuan pada task pekerjaan terkait.</p>
                                </div>
                            </div>

                            {selectedJob === null && (
                                <div className="daily-progress-task-empty">
                                    SPK terpilih belum memiliki daftar pekerjaan.
                                </div>
                            )}

                            {selectedJob !== null &&
                                selectedJob.tasks.length === 0 && (
                                    <div className="daily-progress-task-empty">
                                        Tidak ada header task.
                                    </div>
                                )}

                            {selectedJob !== null &&
                                selectedJob.tasks.map((parent) => (
                                    <div
                                        className="temuan-task-group"
                                        key={parent.id}
                                    >
                                        {renderTaskRow(
                                            String(parent.id),
                                            parent.task_name,
                                        )}
                                    </div>
                                ))}
                        </div>
                    )}

                    {unmappedNotes.length > 0 && (
                        <div className="temuan-task-section mb-4">
                            <div className="daily-progress-panel-heading">
                                <div className="daily-progress-panel-icon warning">
                                    <i className="bi bi-sticky" />
                                </div>
                                <div>
                                    <h2>Catatan Temuan Lainnya</h2>
                                    <p>Catatan yang telah tersimpan pada pekerjaan sebelumnya</p>
                                </div>
                            </div>
                            <div className="temuan-task-group">
                                {unmappedNotes.map(([key]) =>
                                    renderTaskRow(
                                        key,
                                        `Task #${key}`,
                                    ),
                                )}
                            </div>
                        </div>
                    )}

                    {!isEdit && (
                        <div className="temuan-task-section mb-4">
                            <div className="daily-progress-panel-heading">
                                <div className="daily-progress-panel-icon info">
                                    <i className="bi bi-paperclip" />
                                </div>
                                <div>
                                    <h2>Lampiran File / Bukti Temuan</h2>
                                    <p>Upload file foto atau dokumen pendukung (opsional)</p>
                                </div>
                            </div>
                            <input
                                type="file"
                                className="form-control"
                                multiple
                                accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx"
                                onChange={handleFilesChange}
                            />
                        </div>
                    )}

                    <div className="temuan-form-footer">
                        <button
                            type="button"
                            className="btn btn-light"
                            disabled={isSubmitting}
                            onClick={() => navigate('/temuan')}
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

export default TemuanFormPage
