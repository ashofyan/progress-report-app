import { type Editor } from '@tiptap/react'

interface DocumentEditorStatusBarProps {
    editor: Editor | null
    isDirty?: boolean
    isSaving?: boolean
}

const DocumentEditorStatusBar = ({
    editor,
    isDirty = false,
    isSaving = false,
}: DocumentEditorStatusBarProps) => {
    if (!editor) {
        return null
    }

    const words = editor.storage.characterCount?.words() ?? 0
    const characters = editor.storage.characterCount?.characters() ?? 0
    const readMinutes = Math.max(1, Math.ceil(words / 200))

    return (
        <div className="doc-status-bar">
            <div className="doc-status-bar-left">
                <span>{words} kata</span>
                <span className="dot-divider">•</span>
                <span>{characters} karakter</span>
                <span className="dot-divider">•</span>
                <span>{readMinutes} mnt baca</span>
            </div>

            <div className="doc-status-bar-right">
                {isSaving ? (
                    <span className="text-primary">
                        <span className="spinner-border spinner-border-sm me-1" />
                        Menyimpan perubahan...
                    </span>
                ) : isDirty ? (
                    <span className="text-warning">
                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }} />
                        Perubahan belum disimpan
                    </span>
                ) : (
                    <span>Tekan Ctrl+S untuk menyimpan</span>
                )}
            </div>
        </div>
    )
}

export default DocumentEditorStatusBar
