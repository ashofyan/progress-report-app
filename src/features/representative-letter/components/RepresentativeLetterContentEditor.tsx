import { type Editor, EditorContent } from '@tiptap/react'

interface RepresentativeLetterContentEditorProps {
    editor: Editor | null
}

const RepresentativeLetterContentEditor = ({
    editor,
}: RepresentativeLetterContentEditorProps) => {
    if (!editor) {
        return (
            <div className="py-4 text-center text-muted">
                <span className="spinner-border spinner-border-sm me-2" />
                Memuat editor dokumen...
            </div>
        )
    }

    return (
        <div className="representative-letter-content-editor">
            <EditorContent editor={editor} />
        </div>
    )
}

export default RepresentativeLetterContentEditor
