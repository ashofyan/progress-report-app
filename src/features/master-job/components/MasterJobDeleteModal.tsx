import {
    useState,
} from 'react'

import type {
    MasterJob,
    MasterJobApiResult,
} from '@/features/master-job/types/master-job.types'

interface MasterJobDeleteModalProps {
    job: MasterJob | null

    onClose: () => void

    onDelete: (
        id: number,
    ) => Promise<MasterJobApiResult<null>>
}

const MasterJobDeleteModal = ({
                                  job,
                                  onClose,
                                  onDelete,
                              }: MasterJobDeleteModalProps) => {
    const [isDeleting, setIsDeleting] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    if (job === null) {
        return null
    }

    const handleDelete =
        async (): Promise<void> => {
            setIsDeleting(true)
            setErrorMessage(null)

            const result =
                await onDelete(job.id)

            setIsDeleting(false)

            if (!result.success) {
                setErrorMessage(result.message)

                return
            }

            onClose()
        }

    return (
        <div className="master-job-modal-backdrop">
            <div className="master-job-delete-modal">
                <div className="master-job-modal-header">
                    <h2>
                        Hapus Pekerjaan
                    </h2>

                    <button
                        type="button"
                        className="master-job-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="master-job-modal-body">
                    {errorMessage !== null && (
                        <div className="alert alert-danger">
                            {errorMessage}
                        </div>
                    )}

                    <p>
                        Apakah Anda yakin ingin menghapus
                        pekerjaan:
                    </p>

                    <strong>
                        {job.job_code} - {job.description}
                    </strong>

                    <div className="alert alert-warning mt-3 mb-0">
                        Semua task dan sub task yang terhubung
                        juga akan dihapus.
                    </div>
                </div>

                <div className="master-job-modal-footer">
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

export default MasterJobDeleteModal
