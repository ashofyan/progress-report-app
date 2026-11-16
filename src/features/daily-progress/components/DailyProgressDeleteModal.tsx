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

    const hasCompletedTask =
        progress.details?.some((detail) => detail.status === 'selesai') ?? false

    const handleDelete =
        async (): Promise<void> => {
            if (hasCompletedTask) {
                return
            }

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
        <div className="daily-progress-modal-backdrop" onClick={onClose}>
            <div
                className="daily-progress-delete-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="daily-progress-modal-header border-0 pb-0">
                    <div className="daily-progress-delete-icon-wrapper">
                        <i className="bi bi-trash3-fill" />
                    </div>

                    <button
                        type="button"
                        className="daily-progress-modal-close"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="daily-progress-modal-body pt-2 text-center">
                    <h3 className="daily-progress-delete-title mb-1.5">
                        Hapus Daily Progress?
                    </h3>

                    <p className="daily-progress-delete-subtitle text-muted mb-3">
                        Data laporan ini akan dihapus secara permanen dari sistem dan tidak dapat dipulihkan.
                    </p>

                    {hasCompletedTask && (
                        <div className="alert alert-warning text-start mb-3">
                            <i className="bi bi-exclamation-triangle-fill me-2" />
                            Daily Progress tidak dapat dihapus karena memiliki task yang sudah berstatus selesai.
                        </div>
                    )}

                    {errorMessage !== null && (
                        <div className="alert alert-danger text-start mb-3">
                            <i className="bi bi-exclamation-triangle-fill me-2" />
                            {errorMessage}
                        </div>
                    )}

                    <div className="daily-progress-delete-target-card mb-3 text-start">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="daily-progress-nomor">
                                {progress.nomor}
                            </span>
                            <span className="badge bg-secondary-subtle text-secondary border">
                                {progress.tanggal}
                            </span>
                        </div>
                        <div className="text-muted small">
                            Client: <strong>{progress.client_code}</strong>
                            {progress.no_spk && (
                                <> &bull; SPK: <strong>{progress.no_spk}</strong></>
                            )}
                        </div>
                    </div>
                </div>

                <div className="daily-progress-modal-footer bg-light border-top justify-content-end gap-2">
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
                        disabled={isDeleting || hasCompletedTask}
                    >
                        {isDeleting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-1.5" />
                                Menghapus...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-trash3 me-1.5" />
                                Hapus Laporan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DailyProgressDeleteModal
