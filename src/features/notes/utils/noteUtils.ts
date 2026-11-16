import type { EditorJsContent } from '@/features/notes/types/notes.types'

/**
 * Format string tanggal menjadi format ringkas seperti '29 Sep'
 */
export const formatNoteShortDate = (dateString?: string): string => {
    if (!dateString) return '-'
    try {
        const d = new Date(dateString)
        if (isNaN(d.getTime())) return dateString
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
        })
    } catch {
        return dateString
    }
}

/**
 * Ekstraksi excerpt teks bersih dari blok-blok EditorJS tanpa tag HTML
 */
export const extractNoteExcerpt = (content?: EditorJsContent | null): string => {
    if (!content || !content.blocks || !Array.isArray(content.blocks) || content.blocks.length === 0) {
        return 'Tidak ada konten deskripsi...'
    }

    for (const b of content.blocks) {
        if (!b) continue

        // Paragraph block
        if (b.type === 'paragraph' && b.data) {
            const data = b.data as { text?: unknown }
            if (typeof data.text === 'string' && data.text.trim().length > 0) {
                return data.text.replace(/<[^>]*>?/gm, '').trim()
            }
        }

        // Header block
        if (b.type === 'header' && b.data) {
            const data = b.data as { text?: unknown }
            if (typeof data.text === 'string' && data.text.trim().length > 0) {
                return data.text.replace(/<[^>]*>?/gm, '').trim()
            }
        }

        // List block
        if (b.type === 'list' && b.data) {
            const data = b.data as { items?: unknown[] }
            if (Array.isArray(data.items) && data.items.length > 0) {
                const first = data.items[0]
                if (typeof first === 'string' && first.trim().length > 0) {
                    return first.replace(/<[^>]*>?/gm, '').trim()
                }
                if (
                    first &&
                    typeof first === 'object' &&
                    'content' in first &&
                    typeof (first as { content: unknown }).content === 'string'
                ) {
                    return ((first as { content: string }).content)
                        .replace(/<[^>]*>?/gm, '')
                        .trim()
                }
            }
        }
    }

    return 'Belum ada ringkasan catatan...'
}
