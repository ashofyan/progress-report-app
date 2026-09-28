import {
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import {
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom'

import { solusiApi } from '@/features/solusi/api/solusiApi'

import type {
    Solusi,
    SolusiFormTemuan,
    SolusiNote,
} from '@/features/solusi/types/solusi.types'

import '@/features/temuan/styles/temuan.scss'

const getTemuanLabel = (
    temuan: SolusiFormTemuan,
): string => {
    const jobDescription =
        temuan.job?.description ?? 'Tanpa pekerjaan'

    return `${temuan.nomor} - ${temuan.client_code} - ${jobDescription}`
}

const getNoteLabel = (
    note: SolusiNote,
): string => {
    const taskName =
        note.task?.task_name ?? `Note #${note.id}`

    return `${taskName} - ${note.note}`
}

const SolusiFormPage = () => {
    const navigate = useNavigate()
    const params = useParams<{ id: string }>()
    const [searchParams] = useSearchParams()

    const paramTemuanId = searchParams.get('temuan_id')
    const paramNoteId = searchParams.get('note_id')

    const solusiId =
        params.id === undefined ? null : Number(params.id)
    const isEdit =
        solusiId !== null && Number.isFinite(solusiId)

    const [formTemuans, setFormTemuans] =
        useState<SolusiFormTemuan[]>([])
    const [selectedTemuanId, setSelectedTemuanId] =
        useState<number | ''>('')
    const [selectedNoteId, setSelectedNoteId] =
        useState<number | ''>('')
    const [solution, setSolution] =
        useState<string>('')
    const [files, setFiles] =
        useState<File[]>([])
    const [currentSolusi, setCurrentSolusi] =
        useState<Solusi | null>(null)
    const [isLoading, setIsLoading] =
        useState<boolean>(true)
    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const selectedTemuan = useMemo(
        () =>
            formTemuans.find(
                (temuan) => temuan.id === selectedTemuanId,
            ) ?? null,
        [
            formTemuans,
            selectedTemuanId,
        ],
    )

    useEffect(() => {
        queueMicrotask(() => {
            const fetchInitialData =
                async (): Promise<void> => {
                    setIsLoading(true)
                    setErrorMessage(null)

                    if (isEdit && solusiId !== null) {
                        const result =
                            await solusiApi.getById(solusiId)

                        setIsLoading(false)

                        if (
                            !result.success ||
                            result.data === undefined
                        ) {
                            setCurrentSolusi(null)
                            setErrorMessage(result.message)
                            return
                        }

                        setCurrentSolusi(result.data)
                        setSolution(result.data.solution)
                        return
                    }

                    const result =
                        await solusiApi.getFormData()

                    setIsLoading(false)

                    if (
                        result.success &&
                        result.data !== undefined
                    ) {
                        setFormTemuans(result.data)

                        if (paramTemuanId !== null) {
                            const parsedTemuanId = Number(paramTemuanId)
                            const matchedTemuan = result.data.find(
                                (t) => t.id === parsedTemuanId,
                            )
                            if (matchedTemuan) {
                                setSelectedTemuanId(parsedTemuanId)
                                if (paramNoteId !== null) {
                                    const parsedNoteId = Number(paramNoteId)
                                    const matchedNote = matchedTemuan.notes.find(
                                        (n) => n.id === parsedNoteId,
                                    )
                                    if (matchedNote) {
                                        setSelectedNoteId(parsedNoteId)
                                    }
                                }
                            }
                        }
                        return
                    }

                    setFormTemuans([])
                    setErrorMessage(result.message)
                }

            void fetchInitialData()
        })
    }, [
        isEdit,
        solusiId,
        paramTemuanId,
        paramNoteId,
    ])

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

        if (solution.trim() === '') {
            setErrorMessage('Solusi wajib diisi.')
            return
        }

        setIsSubmitting(true)

        if (isEdit && solusiId !== null) {
            const result = await solusiApi.update(solusiId, {
                solution: solution.trim(),
            })

            if (!result.success) {
                setIsSubmitting(false)
                setErrorMessage(result.message)
                return
            }

            if (files.length > 0) {
                const uploadResult =
                    await solusiApi.uploadFiles(solusiId, files)

                if (!uploadResult.success) {
                    setIsSubmitting(false)
                    setErrorMessage(uploadResult.message)
                    return
                }
            }

            setIsSubmitting(false)
            navigate('/temuan')
            return
        }

        if (selectedNoteId === '') {
            setIsSubmitting(false)
            setErrorMessage('Catatan Temuan wajib dipilih.')
            return
        }

        const createResult = await solusiApi.create({
            temuan_note_id: selectedNoteId,
            solution: solution.trim(),
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
            const uploadResult = await solusiApi.uploadFiles(
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

    if (isLoading) {
        return (
            <div className="temuan-page">
                <div className="temuan-loading">
                    <div className="spinner-border" />
                    <span>Memuat Solusi...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="temuan-page">
            <div className="temuan-heading">
                <h1 className="temuan-title">
                    {isEdit ? 'Edit Solusi' : 'Tambah Solusi'}
                </h1>

                <div className="temuan-breadcrumb">
                    <span className="active">Progress</span>
                    <span>/</span>
                    <span
                        className="cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/temuan')}
                    >
                        Temuan & Solusi
                    </span>
                    <span>/</span>
                    <span>{isEdit ? 'Edit Solusi' : 'Tambah Solusi'}</span>
                </div>
            </div>

            <section className="temuan-form-page">
                <form onSubmit={handleSubmit}>
                    {errorMessage !== null && (
                        <div className="alert alert-danger">
                            {errorMessage}
                        </div>
                    )}

                    {isEdit && currentSolusi !== null && (
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <label className="form-label">
                                    Temuan
                                </label>
                                <input
                                    className="form-control"
                                    value={currentSolusi.temuan.nomor}
                                    disabled
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">
                                    Catatan
                                </label>
                                <input
                                    className="form-control"
                                    value={getNoteLabel(
                                        currentSolusi.note,
                                    )}
                                    disabled
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">
                                    Source
                                </label>
                                <input
                                    className="form-control"
                                    value={currentSolusi.source}
                                    disabled
                                />
                            </div>
                        </div>
                    )}

                    {!isEdit && (
                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <label className="form-label">
                                    Temuan
                                </label>
                                <select
                                    className="form-select"
                                    value={selectedTemuanId}
                                    onChange={(
                                        event: ChangeEvent<HTMLSelectElement>,
                                    ) => {
                                        setSelectedTemuanId(
                                            event.target.value === ''
                                                ? ''
                                                : Number(
                                                    event.target.value,
                                                ),
                                        )
                                        setSelectedNoteId('')
                                    }}
                                >
                                    <option value="">
                                        Pilih Temuan
                                    </option>
                                    {formTemuans.map((temuan) => (
                                        <option
                                            key={temuan.id}
                                            value={temuan.id}
                                        >
                                            {getTemuanLabel(temuan)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">
                                    Catatan Temuan
                                </label>
                                <select
                                    className="form-select"
                                    value={selectedNoteId}
                                    disabled={selectedTemuan === null}
                                    onChange={(
                                        event: ChangeEvent<HTMLSelectElement>,
                                    ) =>
                                        setSelectedNoteId(
                                            event.target.value === ''
                                                ? ''
                                                : Number(
                                                    event.target.value,
                                                ),
                                        )
                                    }
                                >
                                    <option value="">
                                        Pilih catatan
                                    </option>
                                    {(selectedTemuan?.notes ?? []).map(
                                        (note) => (
                                            <option
                                                key={note.id}
                                                value={note.id}
                                            >
                                                {getNoteLabel(note)}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                        </div>
                    )}

                    {!isEdit && formTemuans.length === 0 && (
                        <div className="temuan-state compact mb-3">
                            Tidak ada Temuan open yang dapat diselesaikan.
                        </div>
                    )}

                    <div className="temuan-section">
                        <h3>Solusi</h3>
                        <textarea
                            className="form-control"
                            rows={5}
                            value={solution}
                            placeholder="Isi solusi"
                            onChange={(
                                event: ChangeEvent<HTMLTextAreaElement>,
                            ) => setSolution(event.target.value)}
                        />
                    </div>

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

export default SolusiFormPage
