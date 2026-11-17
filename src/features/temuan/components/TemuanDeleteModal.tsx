import {
    useMemo,
    useState,
} from 'react'

import { useAuth } from '@/features/auth/hooks/useAuth'
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
    const { employee: authEmployee } = useAuth()
    const [isDeleting, setIsDeleting] =
        useState<boolean>(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const isCompleted = temuan?.status === 'selesai'
    const isCreator = useMemo(() => {
        if (!temuan) return true
        if (!authEmployee?.employee_code || !temuan.created_by) return true
        return authEmployee.employee_code === temuan.created_by
    }, [temuan, authEmployee])

    if (temuan === null) {
        return null
    }

    const handleDelete = async (): Promise<void> => {
        if (isCompleted || !isCreator) {
            return
        }

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

                    {isCompleted && (
                        <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
                            <i className="bi bi-exclamation-triangle-fill" />
                            <span>
                                Temuan ini telah berstatus <strong>Selesai</strong> dan tidak dapat dihapus.
                            </span>
                        </div>
                    )}

                    {!isCompleted && !isCreator && (
                        <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
                            <i className="bi bi-shield-lock-fill" />
                            <span>
                                Hanya pembuat temuan ini (<strong>{temuan.created_by_name ?? temuan.created_by}</strong>) yang berhak menghapus temuan ini.
                            </span>
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
                        disabled={isDeleting || isCompleted || !isCreator}
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
