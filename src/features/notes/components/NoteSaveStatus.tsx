import React from 'react'

import type { AutosaveStatus } from '@/features/notes/hooks/useAutosave'

export interface NoteSaveStatusProps {
    state: AutosaveStatus
    lastSavedAt?: Date | null
    isDraft?: boolean
    errorMessage?: string | null
    onRetry?: () => void
    className?: string
}

const formatSaveTime = (date?: Date | null): string => {
    if (!date) return ''
    try {
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${hours}:${minutes}:${seconds}`
    } catch {
        return ''
    }
}

export const NoteSaveStatus: React.FC<NoteSaveStatusProps> = ({
    state,
    lastSavedAt,
    isDraft = false,
    errorMessage,
    onRetry,
    className = '',
}) => {
    const timeLabel = formatSaveTime(lastSavedAt)

    if (state === 'idle') {
        return null
    }

    if (state === 'saving') {
        return (
            <span
                className={`notes-save-status saving ${className}`}
                title="Menyimpan perubahan ke server..."
            >
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Menyimpan...</span>
            </span>
        )
    }

    if (state === 'unsaved') {
        return (
            <span
                className={`notes-save-status unsaved ${className}`}
                title="Ada perubahan belum tersimpan. Akan tersimpan otomatis saat berhenti mengetik..."
            >
                <i className="bi bi-clock-history" />
                <span>Belum disimpan</span>
            </span>
        )
    }

    if (state === 'failed') {
        return (
            <span
                className={`notes-save-status failed ${className}`}
                title={errorMessage || 'Gagal menyimpan otomatis.'}
            >
                <i className="bi bi-exclamation-circle-fill" />
                <span>Gagal simpan</span>
                {onRetry && (
                    <button
                        type="button"
                        className="notes-save-status-retry"
                        onClick={onRetry}
                        title="Klik untuk mencoba simpan kembali"
                    >
                        Coba lagi
                    </button>
                )}
            </span>
        )
    }

    // Default: 'saved'
    return (
        <span
            className={`notes-save-status saved ${className}`}
            title={lastSavedAt ? `Tersimpan pada ${timeLabel}` : 'Semua perubahan tersimpan'}
        >
            <i className="bi bi-cloud-check-fill" />
            <span>
                {isDraft ? 'Draft tersimpan' : 'Tersimpan'}
                {timeLabel ? ` ${timeLabel}` : ''}
            </span>
        </span>
    )
}

export default NoteSaveStatus
