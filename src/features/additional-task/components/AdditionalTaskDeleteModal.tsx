import {
    useState,
} from 'react'

import type {
    AdditionalTask,
    AdditionalTaskApiResult,
} from '@/features/additional-task/types/additional-task.types'

interface AdditionalTaskDeleteModalProps {
    task: AdditionalTask | null

    onClose: () => void

    onDelete: (
        id: number,
    ) => Promise<AdditionalTaskApiResult<null>>
}

const AdditionalTaskDeleteModal = ({
                                       task,
                                       onClose,
                                       onDelete,
                                   }: AdditionalTaskDeleteModalProps) => {
    const [isDeleting, setIsDeleting] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    if (task === null) {
        return null
    }

    const handleDelete =
        async (): Promise<void> => {
            setIsDeleting(true)
            setErrorMessage(null)

            const result =
                await onDelete(task.id)

            setIsDeleting(false)

            if (!result.success) {
                setErrorMessage(result.message)

                return
            }

            onClose()
        }

    return (
        <div className="additional-task-modal-backdrop">
            <div className="additional-task-delete-modal">
                <div className="additional-task-modal-header">
                    <h2>Hapus Task</h2>

                    <button
                        type="button"
                        className="additional-task-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="additional-task-modal-body">
                    {errorMessage !== null && (
                        <div className="alert alert-danger">
                            {errorMessage}
                        </div>
                    )}

                    <p>
                        Apakah Anda yakin ingin menghapus
                        task tambahan:
                    </p>

                    <strong>
                        {task.nomor} - {task.client_code}
                    </strong>

                    <div className="alert alert-warning mt-3 mb-0">
                        Semua detail task tambahan akan ikut
                        dihapus.
                    </div>
                </div>

                <div className="additional-task-modal-footer">
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

export default AdditionalTaskDeleteModal
