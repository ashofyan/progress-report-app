import { useState, type ChangeEvent, type KeyboardEvent } from 'react'

interface DocumentEditorTopBarProps {
    title: string
    onTitleChange: (newTitle: string) => void
    onSave: () => void
    isSaving: boolean
    isDirty: boolean
    isReadOnly?: boolean
    isExportingPdf?: boolean
    onExportPdf: () => void
    onPresentationMode: () => void
    onShare?: () => void
    onDelete?: () => void
}

const DocumentEditorTopBar = ({
    title,
    onTitleChange,
    onSave,
    isSaving,
    isDirty,
    isReadOnly = false,
    isExportingPdf = false,
    onExportPdf,
    onPresentationMode,
    onShare,
    onDelete,
}: DocumentEditorTopBarProps) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [titleInput, setTitleInput] = useState(title)
    const [isPinned, setIsPinned] = useState(false)

    const handleTitleBlur = () => {
        setIsEditingTitle(false)
        if (titleInput.trim() !== '') {
            onTitleChange(titleInput.trim())
        } else {
            setTitleInput(title)
        }
    }

    const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur()
        } else if (e.key === 'Escape') {
            setTitleInput(title)
            setIsEditingTitle(false)
        }
    }

    return (
        <div className="doc-top-bar">
            <div className="doc-top-bar-left">
                <span className="doc-icon-badge" title="Dokumen">
                    <i className="bi bi-file-earmark-text" />
                </span>

                {isReadOnly && (
                    <span className="badge bg-secondary me-2" title="Dokumen ini sudah difinalisasi">
                        Final (Read-Only)
                    </span>
                )}
                {isEditingTitle && !isReadOnly ? (
                    <input
                        type="text"
                        className="doc-title-input"
                        value={titleInput}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setTitleInput(e.target.value)
                        }
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        autoFocus
                    />
                ) : (
                    <h1
                        className="doc-title-display"
                        onClick={() => {
                            setTitleInput(title)
                            setIsEditingTitle(true)
                        }}
                        title="Klik untuk mengubah judul"
                    >
                        {title || 'Untitled note'}
                    </h1>
                )}
            </div>

            <div className="doc-top-bar-actions">
                <button
                    type="button"
                    className="doc-action-btn"
                    onClick={onShare}
                    title="Bagikan Dokumen"
                >
                    <i className="bi bi-share" />
                    <span>Bagikan</span>
                </button>

                

                <button
                    type="button"
                    className="doc-action-btn doc-btn-outline-primary"
                    onClick={onPresentationMode}
                    title="Mode Presentasi"
                >
                    <i className="bi bi-display" />
                    <span>Presentasi</span>
                </button>

                <button
                    type="button"
                    className="doc-action-btn"
                    onClick={onExportPdf}
                    disabled={isExportingPdf}
                    title="Export ke PDF (Server-side)"
                >
                    {isExportingPdf ? (
                        <span className="spinner-border spinner-border-sm" />
                    ) : (
                        <i className="bi bi-file-pdf" />
                    )}
                    <span>{isExportingPdf ? 'Mengunduh...' : 'PDF'}</span>
                </button>



                <button
                    type="button"
                    className={`doc-action-btn ${isPinned ? 'active text-primary' : ''}`}
                    onClick={() => setIsPinned(!isPinned)}
                    title={isPinned ? 'Lepas Pin' : 'Pin Dokumen'}
                >
                    <i className={`bi ${isPinned ? 'bi-pin-fill' : 'bi-pin'}`} />
                    <span>Pin</span>
                </button>

                {onDelete && (
                    <button
                        type="button"
                        className="doc-action-btn text-danger"
                        onClick={onDelete}
                        title="Hapus Dokumen"
                    >
                        <i className="bi bi-trash" />
                        <span>Hapus</span>
                    </button>
                )}

                {!isReadOnly && (
                    <button
                        type="button"
                        className="doc-action-btn doc-btn-primary"
                        disabled={isSaving || !isDirty}
                        onClick={onSave}
                        title="Simpan Dokumen (Ctrl+S)"
                    >
                        {isSaving ? (
                            <span className="spinner-border spinner-border-sm" />
                        ) : (
                            <i className="bi bi-check2" />
                        )}
                        <span>Simpan</span>
                    </button>
                )}
            </div>
        </div>
    )
}

export default DocumentEditorTopBar
