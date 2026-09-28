import {
    useState,
} from 'react'

import type {
    Temuan,
    TemuanApiResult,
} from '@/features/temuan/types/temuan.types'

interface TemuanDeleteModalProps {
    temuan: Temuan | null
    onClose: () => void
    onDelete: (
        id: number,
    ) => Promise<TemuanApiResult<null>>
}

const TemuanDeleteModal = ({
                               temuan,
                               onClose,
                               onDelete,
                           }: TemuanDeleteModalProps) => {
    const [isDeleting, setIsDeleting] =
        useState<boolean>(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    if (temuan === null) {
        return null
    }

    const handleDelete = async (): Promise<void> => {
        setIsDeleting(true)
        setErrorMessage(null)

        const result = await onDelete(temuan.id)

        setIsDeleting(false)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        onClose()
    }

    return (
        <div className="temuan-modal-backdrop">
            <div className="temuan-delete-modal">
                <div className="temuan-modal-header">
                    <h2>Hapus Temuan</h2>

                    <button
                        type="button"
                        className="temuan-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="temuan-modal-body">
                    {errorMessage !== null && (
                        <div className="alert alert-danger">
                            {errorMessage}
                        </div>
                    )}

                    <p>Apakah Anda yakin ingin menghapus temuan:</p>
                    <strong>{temuan.nomor}</strong>
                </div>

                <div className="temuan-modal-footer">
                    <button
                        type="button"
                        className="btn btn-light"
                        disabled={isDeleting}
                        onClick={onClose}
                    >
                        Batal
                    </button>

                    <button
                        type="button"
                        className="btn btn-danger"
                        disabled={isDeleting}
                        onClick={() => void handleDelete()}
                    >
                        {isDeleting && (
                            <span className="spinner-border spinner-border-sm me-2" />
                        )}
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TemuanDeleteModal
