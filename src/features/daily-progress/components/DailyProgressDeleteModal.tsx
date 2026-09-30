import {
    useState,
} from 'react'

import type {
    DailyProgress,
    DailyProgressApiResult,
} from '@/features/daily-progress/types/daily-progress.types'

interface DailyProgressDeleteModalProps {
    progress: DailyProgress | null
    onClose: () => void
    onDelete: (
        id: number,
    ) => Promise<DailyProgressApiResult<null>>
    onSuccess?: () => void
}

const DailyProgressDeleteModal = ({
                                      progress,
                                      onClose,
                                      onDelete,
                                      onSuccess,
                                  }: DailyProgressDeleteModalProps) => {
    const [isDeleting, setIsDeleting] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    if (progress === null) {
        return null
    }

    const handleDelete =
        async (): Promise<void> => {
            setIsDeleting(true)
            setErrorMessage(null)

            const result =
                await onDelete(progress.id)

            setIsDeleting(false)

            if (!result.success) {
                setErrorMessage(result.message)

                return
            }

            if (onSuccess !== undefined) {
                onSuccess()
            }

            onClose()
        }

    return (
        <div className="daily-progress-modal-backdrop">
            <div className="daily-progress-delete-modal">
                <div className="daily-progress-modal-header">
                    <h2>Hapus Daily Progress</h2>

                    <button
                        type="button"
                        className="daily-progress-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="daily-progress-modal-body">
                    {errorMessage !== null && (
                        <div className="alert alert-danger">
                            {errorMessage}
                        </div>
                    )}

                    <p>
                        Apakah Anda yakin ingin menghapus
                        daily progress{' '}
                        <strong>{progress.nomor}</strong>?
                    </p>

                    <p className="text-muted small mb-0">
                        Tindakan ini tidak dapat dibatalkan.
                    </p>
                </div>

                <div className="daily-progress-modal-footer">
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Batal
                    </button>

                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting
                            ? 'Menghapus...'
                            : 'Hapus'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DailyProgressDeleteModal
