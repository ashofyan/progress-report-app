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
    DailyProgressFormJobTask,
    DailyProgressFormSpk,
} from '@/features/daily-progress/types/daily-progress.types'
import { temuanApi } from '@/features/temuan/api/temuanApi'

import '@/features/temuan/styles/temuan.scss'

interface TemuanNoteForm {
    id?: number
    als_job_task_id: number | ''
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

const getParentTasks = (
    spk: DailyProgressFormSpk | null,
): DailyProgressFormJobTask[] => {
    return spk?.job?.tasks ?? []
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
    const [clientCode, setClientCode] =
        useState<string>('')
    const [spks, setSpks] =
        useState<DailyProgressFormSpk[]>([])
    const [selectedSpkId, setSelectedSpkId] =
        useState<number | ''>('')
    const [notes, setNotes] =
        useState<TemuanNoteForm[]>([
            {
                als_job_task_id: '',
                note: '',
            },
        ])
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

    const parentTasks = useMemo(
        () => getParentTasks(selectedSpk),
        [selectedSpk],
    )

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
                setClientCode(result.data.client_code)
                setSelectedSpkId(result.data.spk?.id ?? '')
                setNotes(
                    result.data.notes.length === 0
                        ? [
                            {
                                als_job_task_id: '',
                                note: '',
                            },
                        ]
                        : result.data.notes.map((note) => ({
                            id: note.id,
                            als_job_task_id:
                                note.als_job_task_id,
                            note: note.note,
                        })),
                )
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

    const handleAddNote = (): void => {
        setNotes((previous) => [
            ...previous,
            {
                als_job_task_id: '',
                note: '',
            },
        ])
    }

    const handleRemoveNote = (
        noteIndex: number,
    ): void => {
        setNotes((previous) =>
            previous.length === 1
                ? [
                    {
                        als_job_task_id: '',
                        note: '',
                    },
                ]
                : previous.filter(
                    (_, index) => index !== noteIndex,
                ),
        )
    }

    const handleNoteTaskChange = (
        noteIndex: number,
        value: string,
    ): void => {
        setNotes((previous) =>
            previous.map((note, index) =>
                index === noteIndex
                    ? {
                        ...note,
                        als_job_task_id:
                            value === ''
                                ? ''
                                : Number(value),
                    }
                    : note,
            ),
        )
    }

    const handleNoteTextChange = (
        noteIndex: number,
        value: string,
    ): void => {
        setNotes((previous) =>
            previous.map((note, index) =>
                index === noteIndex
                    ? {
                        ...note,
                        note: value,
                    }
                    : note,
            ),
        )
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

        const submittedNotes = notes
            .map((note) => ({
                id: note.id,
                als_job_task_id: note.als_job_task_id,
                note: note.note.trim(),
            }))
            .filter(
                (note) =>
                    note.als_job_task_id !== '' &&
                    note.note !== '',
            )

        if (submittedNotes.length === 0) {
            setErrorMessage(
                'Minimal satu catatan Temuan wajib diisi.',
            )
            return
        }

        const duplicatedTask = submittedNotes.some(
            (note, index) =>
                submittedNotes.findIndex(
                    (item) =>
                        item.als_job_task_id ===
                        note.als_job_task_id,
                ) !== index,
        )

        if (duplicatedTask) {
            setErrorMessage(
                'Task Temuan tidak boleh duplikat.',
            )
            return
        }

        setIsSubmitting(true)

        if (isEdit && temuanId !== null) {
            const result = await temuanApi.update(temuanId, {
                tanggal,
                notes: submittedNotes.map((note) => ({
                    id: note.id,
                    als_job_task_id:
                        note.als_job_task_id as number,
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
            notes: submittedNotes.map((note) => ({
                als_job_task_id:
                    note.als_job_task_id as number,
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

                        <div className="col-md-4">
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
                                    setNotes([
                                        {
                                            als_job_task_id: '',
                                            note: '',
                                        },
                                    ])
                                }}
                            />
                        </div>

                        <div className="col-md-5">
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
                                    setNotes([
                                        {
                                            als_job_task_id: '',
                                            note: '',
                                        },
                                    ])
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

                    <div className="temuan-section">
                        <div className="temuan-section-heading">
                            <h3>Catatan Temuan</h3>
                            <button
                                type="button"
                                className="temuan-add-note"
                                onClick={handleAddNote}
                            >
                                <i className="bi bi-plus-lg" />
                                Tambah Catatan
                            </button>
                        </div>

                        {parentTasks.length === 0 && (
                            <div className="temuan-state compact">
                                Pilih SPK dengan master pekerjaan terlebih dahulu.
                            </div>
                        )}

                        {notes.map((note, index) => (
                            <div
                                className="temuan-note-form-row"
                                key={`note-${index}`}
                            >
                                <select
                                    className="form-select"
                                    value={note.als_job_task_id}
                                    onChange={(
                                        event: ChangeEvent<HTMLSelectElement>,
                                    ) =>
                                        handleNoteTaskChange(
                                            index,
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Pilih parent task
                                    </option>
                                    {parentTasks.map((task) => (
                                        <option
                                            key={task.id}
                                            value={task.id}
                                        >
                                            {task.task_name}
                                        </option>
                                    ))}
                                </select>

                                <textarea
                                    className="form-control"
                                    value={note.note}
                                    rows={2}
                                    placeholder="Isi temuan"
                                    onChange={(
                                        event: ChangeEvent<HTMLTextAreaElement>,
                                    ) =>
                                        handleNoteTextChange(
                                            index,
                                            event.target.value,
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() =>
                                        handleRemoveNote(index)
                                    }
                                >
                                    <i className="bi bi-x-lg" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {!isEdit && (
                        <div className="temuan-section">
                            <h3>File</h3>
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
