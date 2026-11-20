import { useEffect, useRef, useState } from 'react'

interface WysiwygSectionEditorProps {
    label: string
    icon: string
    value: string
    onChange: (val: string) => void
    tagOptions: Array<{ label: string; tag: string }>
    placeholder?: string
    helperText?: string
}

export const WysiwygSectionEditor = ({
    label,
    icon,
    value,
    onChange,
    tagOptions,
    placeholder = 'Ketik konten template di sini...',
    helperText,
}: WysiwygSectionEditorProps) => {
    const [mode, setMode] = useState<'visual' | 'html'>('visual')
    const editorRef = useRef<HTMLDivElement>(null)
    const isInternalUpdate = useRef(false)

    // Sync external value to visual editor when switching modes or initial load
    useEffect(() => {
        if (editorRef.current && !isInternalUpdate.current) {
            if (editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value || '<p></p>'
            }
        }
        isInternalUpdate.current = false
    }, [value, mode])

    const handleInput = () => {
        if (editorRef.current) {
            isInternalUpdate.current = true
            onChange(editorRef.current.innerHTML)
        }
    }

    const execCmd = (command: string, arg: string | undefined = undefined) => {
        if (mode !== 'visual') return
        editorRef.current?.focus()
        document.execCommand(command, false, arg)
        handleInput()
    }

    const insertTag = (tag: string) => {
        if (mode === 'visual') {
            editorRef.current?.focus()
            // Try inserting via execCommand for undo history
            const success = document.execCommand('insertText', false, tag)
            if (!success && editorRef.current) {
                editorRef.current.innerHTML += tag
            }
            handleInput()
        } else {
            onChange(value + tag)
        }
    }

    return (
        <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
                <label className="form-label fw-bold text-dark d-flex align-items-center gap-1 mb-0">
                    <i className={`${icon} text-primary`} /> {label}
                </label>
                <div className="btn-group btn-group-sm" role="group">
                    <button
                        type="button"
                        className={`btn btn-sm ${mode === 'visual' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                        onClick={() => setMode('visual')}
                    >
                        <i className="bi bi-eye me-1" /> Visual (WYSIWYG)
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm ${mode === 'html' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                        onClick={() => setMode('html')}
                    >
                        <i className="bi bi-code-slash me-1" /> Kode HTML
                    </button>
                </div>
            </div>

            {mode === 'visual' ? (
                <div className="wysiwyg-editor-shell">
                    {/* Visual Toolbar */}
                    <div className="wysiwyg-toolbar">
                        <div className="btn-group btn-group-sm me-2">
                            <button
                                type="button"
                                className="btn-toolbar-tool fw-bold"
                                title="Tebal (Bold)"
                                onClick={() => execCmd('bold')}
                            >
                                B
                            </button>
                            <button
                                type="button"
                                className="btn-toolbar-tool fst-italic"
                                title="Miring (Italic)"
                                onClick={() => execCmd('italic')}
                            >
                                I
                            </button>
                            <button
                                type="button"
                                className="btn-toolbar-tool text-decoration-underline"
                                title="Garis Bawah (Underline)"
                                onClick={() => execCmd('underline')}
                            >
                                U
                            </button>
                        </div>

                        <div className="btn-group btn-group-sm me-2">
                            <button
                                type="button"
                                className="btn-toolbar-tool"
                                title="Rata Kiri"
                                onClick={() => execCmd('justifyLeft')}
                            >
                                <i className="bi bi-text-left" />
                            </button>
                            <button
                                type="button"
                                className="btn-toolbar-tool"
                                title="Rata Tengah"
                                onClick={() => execCmd('justifyCenter')}
                            >
                                <i className="bi bi-text-center" />
                            </button>
                            <button
                                type="button"
                                className="btn-toolbar-tool"
                                title="Rata Kanan"
                                onClick={() => execCmd('justifyRight')}
                            >
                                <i className="bi bi-text-right" />
                            </button>
                            <button
                                type="button"
                                className="btn-toolbar-tool"
                                title="Rata Kanan-Kiri"
                                onClick={() => execCmd('justifyFull')}
                            >
                                <i className="bi bi-justify" />
                            </button>
                        </div>

                        <div className="dropdown d-inline-block">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary dropdown-toggle"
                                style={{ fontSize: '11px', padding: '2px 8px' }}
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                <i className="bi bi-tags me-1" /> Sisipkan Variabel...
                            </button>
                            <ul className="dropdown-menu shadow-sm" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {tagOptions.map((opt) => (
                                    <li key={opt.tag}>
                                        <button
                                            type="button"
                                            className="dropdown-item small d-flex justify-content-between align-items-center"
                                            onClick={() => insertTag(opt.tag)}
                                        >
                                            <span>{opt.label}</span>
                                            <code className="text-primary ms-2" style={{ fontSize: '10px' }}>
                                                {opt.tag}
                                            </code>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* ContentEditable Visual Surface */}
                    <div
                        ref={editorRef}
                        className="wysiwyg-content-area"
                        contentEditable
                        onInput={handleInput}
                        onBlur={handleInput}
                        data-placeholder={placeholder}
                    />
                </div>
            ) : (
                <div>
                    <textarea
                        className="form-control font-monospace"
                        rows={7}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Ketik kode HTML..."
                        style={{ fontSize: '12px' }}
                    />
                </div>
            )}

            {helperText && (
                <div className="form-text small text-muted mt-1" style={{ fontSize: '11px' }}>
                    {helperText}
                </div>
            )}
        </div>
    )
}
