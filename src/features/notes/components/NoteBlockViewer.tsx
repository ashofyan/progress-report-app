import type { ReactNode } from 'react'
import type { EditorJsContent } from '@/features/notes/types/notes.types'

interface NoteBlockViewerProps {
    content?: EditorJsContent | null
    maxBlocks?: number
    showSummaryOnly?: boolean
}

export const NoteBlockViewer = ({
    content,
    maxBlocks,
    showSummaryOnly = false,
}: NoteBlockViewerProps) => {
    if (!content || !content.blocks || content.blocks.length === 0) {
        return (
            <div className="notes-block-empty text-muted fst-italic">
                Tidak ada konten catatan.
            </div>
        )
    }

    const blocksToRender = maxBlocks
        ? content.blocks.slice(0, maxBlocks)
        : content.blocks

    if (showSummaryOnly) {
        const firstParagraph = content.blocks.find(
            (b) => b.type === 'paragraph' && b.data && typeof b.data.text === 'string',
        )
        const summaryText = firstParagraph
            ? String(firstParagraph.data.text).replace(/<[^>]*>?/gm, '')
            : 'Tidak ada teks deskripsi...'

        return <p className="notes-card-excerpt">{summaryText}</p>
    }

    const renderHeader = (level: number, text: string, key: string | number): ReactNode => {
        switch (level) {
            case 1:
                return (
                    <h1
                        key={key}
                        className="notes-content-heading"
                        dangerouslySetInnerHTML={{ __html: text }}
                    />
                )
            case 2:
                return (
                    <h2
                        key={key}
                        className="notes-content-heading"
                        dangerouslySetInnerHTML={{ __html: text }}
                    />
                )
            case 3:
                return (
                    <h3
                        key={key}
                        className="notes-content-heading"
                        dangerouslySetInnerHTML={{ __html: text }}
                    />
                )
            case 4:
                return (
                    <h4
                        key={key}
                        className="notes-content-heading"
                        dangerouslySetInnerHTML={{ __html: text }}
                    />
                )
            default:
                return (
                    <h5
                        key={key}
                        className="notes-content-heading"
                        dangerouslySetInnerHTML={{ __html: text }}
                    />
                )
        }
    }

    return (
        <div className="notes-rendered-content">
            {blocksToRender.map((block, index) => {
                const data = block.data as Record<string, unknown>
                const key = block.id || index

                switch (block.type) {
                    case 'header': {
                        const level = Number(data.level) || 2
                        const text = String(data.text || '')
                        return renderHeader(level, text, key)
                    }

                    case 'paragraph': {
                        const text = String(data.text || '')
                        return (
                            <p
                                key={key}
                                className="notes-content-paragraph"
                                dangerouslySetInnerHTML={{ __html: text }}
                            />
                        )
                    }

                    case 'list': {
                        const style = data.style === 'ordered' ? 'ordered' : 'unordered'
                        const items = Array.isArray(data.items)
                            ? (data.items as Array<string | { content?: string }>)
                            : []

                        if (style === 'ordered') {
                            return (
                                <ol key={key} className="notes-content-list">
                                    {items.map((item, itemIdx) => {
                                        const itemText =
                                            typeof item === 'string'
                                                ? item
                                                : item?.content || ''
                                        return (
                                            <li
                                                key={itemIdx}
                                                dangerouslySetInnerHTML={{
                                                    __html: itemText,
                                                }}
                                            />
                                        )
                                    })}
                                </ol>
                            )
                        }

                        return (
                            <ul key={key} className="notes-content-list">
                                {items.map((item, itemIdx) => {
                                    const itemText =
                                        typeof item === 'string'
                                            ? item
                                            : item?.content || ''
                                    return (
                                        <li
                                            key={itemIdx}
                                            dangerouslySetInnerHTML={{
                                                __html: itemText,
                                            }}
                                        />
                                    )
                                })}
                            </ul>
                        )
                    }

                    case 'checklist': {
                        const items = Array.isArray(data.items)
                            ? (data.items as Array<{ text: string; checked: boolean }>)
                            : []
                        return (
                            <div key={key} className="notes-content-checklist">
                                {items.map((item, itemIdx) => (
                                    <div
                                        key={itemIdx}
                                        className={`notes-checklist-item ${
                                            item.checked ? 'checked' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="form-check-input me-2"
                                            checked={item.checked}
                                            disabled
                                            readOnly
                                        />
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: item.text,
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )
                    }

                    default: {
                        if (typeof data.text === 'string') {
                            return (
                                <p
                                    key={key}
                                    dangerouslySetInnerHTML={{
                                        __html: data.text,
                                    }}
                                />
                            )
                        }
                        return null
                    }
                }
            })}
        </div>
    )
}

export default NoteBlockViewer
