import {
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'

import { solusiApi } from '@/features/solusi/api/solusiApi'
import type { Temuan, TemuanNote } from '@/features/temuan/types/temuan.types'

interface SolusiCreateModalProps {
    isOpen: boolean
    temuan: Temuan | null
    initialNoteId?: number | null
    solvedNoteIds?: number[]
    onClose: () => void
    onSuccess: () => void
}

const getNoteLabel = (note: TemuanNote, isSolved: boolean): string => {
    const taskName =
        note.task?.task_name ?? `Task #${note.als_job_task_id}`
    const solvedSuffix = isSolved ? ' (Sudah ada solusi)' : ''
    return `${taskName} - ${note.note}${solvedSuffix}`
}

const SolusiCreateModal = ({
    isOpen,
    temuan,
    initialNoteId = null,
    solvedNoteIds = [],
    onClose,
    onSuccess,
}: SolusiCreateModalProps) => {
    const [selectedNoteId, setSelectedNoteId] = useState<number | ''>('')
    const [solution, setSolution] = useState<string>('')
    const [files, setFiles] = useState<File[]>([])
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen || temuan === null) {
            setSelectedNoteId('')
            setSolution('')
            setFiles([])
            setErrorMessage(null)
            setIsSubmitting(false)
            return
        }

        if (initialNoteId !== null && initialNoteId !== undefined) {
            setSelectedNoteId(initialNoteId)
        } else {
            // Find first unsolved note if available
            const firstUnsolved = temuan.notes.find(
                (note) => !solvedNoteIds.includes(note.id),
            )
            if (firstUnsolved !== undefined) {
                setSelectedNoteId(firstUnsolved.id)
            } else if (temuan.notes.length > 0) {
                setSelectedNoteId(temuan.notes[0].id)
            } else {
                setSelectedNoteId('')
            }
        }
        setSolution('')
        setFiles([])
        setErrorMessage(null)
        setIsSubmitting(false)
    }, [isOpen, temuan, initialNoteId, solvedNoteIds])

    if (!isOpen || temuan === null) {
        return null
    }

    const handleFilesChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setFiles(Array.from(event.target.files ?? []))
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (selectedNoteId === '') {
            setErrorMessage('Catatan Temuan wajib dipilih.')
            return
        }

        if (solution.trim() === '') {
            setErrorMessage('Solusi wajib diisi.')
            return
        }

        setIsSubmitting(true)

        const createResult = await solusiApi.create({
            temuan_note_id: selectedNoteId,
            solution: solution.trim(),
        })

        if (!createResult.success || createResult.data === undefined) {
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
        onSuccess()
        onClose()
    }

    return (
        <div className="temuan-modal-backdrop">
            <div className="temuan-modal">
                <div className="temuan-modal-header">
                    <h2>Tambah Solusi</h2>
                    <button
                        type="button"
                        className="temuan-modal-close"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="temuan-modal-body">
                        {errorMessage !== null && (
                            <div className="alert alert-danger" role="alert">
                                {errorMessage}
                            </div>
                        )}

                        <div className="row g-3 mb-3">
                            <div className="col-md-3">
                                <label className="form-label">Nomor Temuan</label>
                                <input
                                    className="form-control"
                                    value={temuan.nomor}
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Tanggal</label>
                                <input
                                    className="form-control"
                                    value={temuan.tanggal}
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Client</label>
                                <input
                                    className="form-control"
                                    value={temuan.client_code}
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">SPK</label>
                                <input
                                    className="form-control"
                                    value={temuan.spk?.no_spk ?? '-'}
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Catatan Temuan yang Diselesaikan <span className="text-danger">*</span>
                            </label>
                            <select
                                className="form-select"
                                value={selectedNoteId}
                                onChange={(e) =>
                                    setSelectedNoteId(
                                        e.target.value === ''
                                            ? ''
                                            : Number(e.target.value),
                                    )
                                }
                            >
                                <option value="">Pilih Catatan Temuan</option>
                                {temuan.notes.map((note) => {
                                    const isSolved = solvedNoteIds.includes(note.id)
                                    return (
                                        <option key={note.id} value={note.id}>
                                            {getNoteLabel(note, isSolved)}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Solusi <span className="text-danger">*</span>
                            </label>
                            <textarea
                                className="form-control"
                                rows={4}
                                value={solution}
                                placeholder="Jelaskan solusi atau tindakan perbaikan..."
                                onChange={(e) => setSolution(e.target.value)}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Lampiran File (Opsional)</label>
                            <input
                                type="file"
                                className="form-control"
                                multiple
                                accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx"
                                onChange={handleFilesChange}
                            />
                            <div className="form-text">
                                Format didukung: Gambar, PDF, Excel, Word.
                            </div>
                        </div>
                    </div>

                    <div className="temuan-modal-footer">
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
                            Simpan Solusi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SolusiCreateModal
