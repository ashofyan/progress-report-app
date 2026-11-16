import type { TimelineDocument } from '@/features/timeline/types/timeline.types'

const AVATAR_PALETTE = [
    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }, // blue
    { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' }, // emerald
    { bg: '#fffbeb', color: '#d97706', border: '#fde68a' }, // amber
    { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' }, // purple
    { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' }, // pink
    { bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' }, // teal
    { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }, // red
]

export const getAvatarStyle = (seed?: string | null) => {
    if (!seed || typeof seed !== 'string') {
        return AVATAR_PALETTE[0]
    }
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % AVATAR_PALETTE.length
    return AVATAR_PALETTE[index]
}

export const getInitials = (text?: string | null): string => {
    if (!text || typeof text !== 'string') return '?'
    const parts = text.trim().split(/\s+/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return text.substring(0, 2).toUpperCase() || '?'
}

export const formatDateTime = (dateStr: string, createdAtStr?: string): string => {
    try {
        const dateTarget = createdAtStr ? new Date(createdAtStr) : new Date(dateStr)
        if (isNaN(dateTarget.getTime())) {
            return dateStr
        }

        const dateFormatted = dateTarget.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })

        const timeFormatted = dateTarget.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        })

        return `${dateFormatted}, ${timeFormatted}`
    } catch {
        return dateStr
    }
}

export const getTimelineDocumentUrl = (document: TimelineDocument): string | null => {
    if (document.url) {
        return document.url
    }
    if (!document.path) {
        return null
    }

    const storagePath = `/storage/${document.path}`
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

    if (typeof apiBaseUrl !== 'string' || apiBaseUrl === '') {
        return storagePath
    }

    try {
        const baseUrl = new URL(apiBaseUrl)
        return `${baseUrl.origin}${storagePath}`
    } catch {
        return storagePath
    }
}
