import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import { type Editor } from '@tiptap/react'
import { useCallback, useState } from 'react'

interface DocumentEditorToolbarProps {
    editor: Editor | null
}

const fontFamilies = [
    { label: 'Default', value: '' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Calibri', value: 'Calibri, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
]

const fontSizes = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32]
const lineSpacings = ['1.0', '1.15', '1.5', '2.0']

const colors = [
    '#000000',
    '#374151',
    '#1d4ed8',
    '#047857',
    '#b45309',
    '#dc2626',
    '#7c3aed',
    '#db2777',
]

const highlights = [
    '#fef08a', // yellow
    '#bbf7d0', // green
    '#bfdbfe', // blue
    '#fbcfe8', // pink
    '#fed7aa', // orange
    'transparent',
]

const DocumentEditorToolbar = ({ editor }: DocumentEditorToolbarProps) => {
    const [currentFontSize, setCurrentFontSize] = useState<number>(14)
    const [showColorPicker, setShowColorPicker] = useState<boolean>(false)
    const [showHighlightPicker, setShowHighlightPicker] = useState<boolean>(false)

    const handleSetFontSize = useCallback(
        (size: number) => {
            if (!editor) return
            setCurrentFontSize(size)
            editor.chain().focus().setFontSize(`${size}pt`).run()
        },
        [editor],
    )

    const handleDecreaseFontSize = useCallback(() => {
        const next = Math.max(8, currentFontSize - 1)
        handleSetFontSize(next)
    }, [currentFontSize, handleSetFontSize])

    const handleIncreaseFontSize = useCallback(() => {
        const next = Math.min(72, currentFontSize + 1)
        handleSetFontSize(next)
    }, [currentFontSize, handleSetFontSize])

    const handleInsertTable = useCallback(() => {
        if (!editor) return
        editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
    }, [editor])

    const handleInsertImage = useCallback(() => {
        if (!editor) return

        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/gif'
        fileInput.onchange = async () => {
            const file = fileInput.files?.[0]
            if (file) {
                const res = await representativeLetterApi.uploadImage(file)
                if (res.success && res.data?.url) {
                    editor.chain().focus().setImage({ src: res.data.url }).run()
                } else {
                    alert(res.message || 'Gagal mengunggah gambar.')
                }
            }
        }
        fileInput.click()
    }, [editor])

    const handleSetLink = useCallback(() => {
        if (!editor) return
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('Masukkan URL Tautan:', previousUrl)

        if (url === null) return
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }, [editor])

    if (!editor) {
        return null
    }

    return (
        <div className="doc-ribbon-toolbar">
            {/* Undo / Redo */}
            <div className="doc-toolbar-group">
                <button
                    type="button"
                    className="doc-tool-btn"
                    title="Undo (Ctrl+Z)"
                    disabled={!editor.can().undo()}
                    onClick={() => editor.chain().focus().undo().run()}
                >
                    <i className="bi bi-arrow-counterclockwise" />
                </button>
                <button
                    type="button"
                    className="doc-tool-btn"
                    title="Redo (Ctrl+Y)"
                    disabled={!editor.can().redo()}
                    onClick={() => editor.chain().focus().redo().run()}
                >
                    <i className="bi bi-arrow-clockwise" />
                </button>
            </div>

            {/* Paragraph / Heading */}
            <div className="doc-toolbar-group">
                <select
                    className="doc-select-compact"
                    value={
                        editor.isActive('heading', { level: 1 })
                            ? 'h1'
                            : editor.isActive('heading', { level: 2 })
                            ? 'h2'
                            : editor.isActive('heading', { level: 3 })
                            ? 'h3'
                            : editor.isActive('blockquote')
                            ? 'quote'
                            : 'p'
                    }
                    onChange={(e) => {
                        const val = e.target.value
                        if (val === 'p') editor.chain().focus().setParagraph().run()
                        else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run()
                        else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run()
                        else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run()
                        else if (val === 'quote') editor.chain().focus().toggleBlockquote().run()
                    }}
                >
                    <option value="p">Teks (Normal)</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                    <option value="quote">Kutipan</option>
                </select>
            </div>

            {/* Font Family */}
            <div className="doc-toolbar-group">
                <select
                    className="doc-select-compact font-family-select"
                    onChange={(e) => {
                        const font = e.target.value
                        if (!font) {
                            editor.chain().focus().unsetFontFamily().run()
                        } else {
                            editor.chain().focus().setFontFamily(font).run()
                        }
                    }}
                    defaultValue=""
                >
                    <option value="" disabled hidden>Font</option>
                    {fontFamilies.map((f) => (
                        <option key={f.label} value={f.value}>
                            {f.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Font Size Counter */}
            <div className="doc-toolbar-group doc-fontsize-stepper">
                <button
                    type="button"
                    className="doc-tool-btn stepper-btn"
                    onClick={handleDecreaseFontSize}
                    title="Perkecil Ukuran Font"
                >
                    -
                </button>
                <select
                    className="doc-select-compact doc-fontsize-select"
                    value={currentFontSize}
                    onChange={(e) => handleSetFontSize(Number(e.target.value))}
                >
                    {fontSizes.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    className="doc-tool-btn stepper-btn"
                    onClick={handleIncreaseFontSize}
                    title="Perbesar Ukuran Font"
                >
                    +
                </button>
            </div>

            <div className="doc-toolbar-divider" />

            {/* Basic Formatting: Bold, Italic, Underline, Strike */}
            <div className="doc-toolbar-group">
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('bold') ? 'active' : ''}`}
                    title="Tebal (Bold)"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <strong>B</strong>
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('italic') ? 'active' : ''}`}
                    title="Miring (Italic)"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <em>I</em>
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('underline') ? 'active' : ''}`}
                    title="Garis Bawah (Underline)"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                    <u>U</u>
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('strike') ? 'active' : ''}`}
                    title="Coret (Strikethrough)"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <s>S</s>
                </button>
            </div>

            {/* Inline Code, Subscript, Superscript */}
            <div className="doc-toolbar-group">
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('code') ? 'active' : ''}`}
                    title="Inline Code"
                    onClick={() => editor.chain().focus().toggleCode().run()}
                >
                    &lt;&gt;
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('subscript') ? 'active' : ''}`}
                    title="Subscript (x₂)"
                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                >
                    x<sub>2</sub>
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('superscript') ? 'active' : ''}`}
                    title="Superscript (x²)"
                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                >
                    x<sup>2</sup>
                </button>
            </div>

            {/* Colors */}
            <div className="doc-toolbar-group position-relative">
                <button
                    type="button"
                    className="doc-tool-btn"
                    title="Warna Teks"
                    onClick={() => {
                        setShowColorPicker(!showColorPicker)
                        setShowHighlightPicker(false)
                    }}
                >
                    <span style={{ borderBottom: '2px solid #1d4ed8', fontWeight: 'bold' }}>A</span>
                    <i className="bi bi-chevron-down ms-1" style={{ fontSize: '9px' }} />
                </button>
                {showColorPicker && (
                    <div className="doc-popover-picker">
                        {colors.map((c) => (
                            <button
                                key={c}
                                type="button"
                                className="doc-color-dot"
                                style={{ backgroundColor: c }}
                                onClick={() => {
                                    editor.chain().focus().setColor(c).run()
                                    setShowColorPicker(false)
                                }}
                            />
                        ))}
                    </div>
                )}

                <button
                    type="button"
                    className="doc-tool-btn"
                    title="Warna Sorotan (Highlight)"
                    onClick={() => {
                        setShowHighlightPicker(!showHighlightPicker)
                        setShowColorPicker(false)
                    }}
                >
                    <i className="bi bi-pen" style={{ color: '#d97706' }} />
                    <i className="bi bi-chevron-down ms-1" style={{ fontSize: '9px' }} />
                </button>
                {showHighlightPicker && (
                    <div className="doc-popover-picker">
                        {highlights.map((h) => (
                            <button
                                key={h}
                                type="button"
                                className="doc-color-dot"
                                style={{
                                    backgroundColor: h === 'transparent' ? '#ffffff' : h,
                                    border: '1px solid #d1d5db',
                                }}
                                title={h === 'transparent' ? 'Hapus Sorotan' : h}
                                onClick={() => {
                                    if (h === 'transparent') {
                                        editor.chain().focus().unsetHighlight().run()
                                    } else {
                                        editor.chain().focus().toggleHighlight({ color: h }).run()
                                    }
                                    setShowHighlightPicker(false)
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Link & Clear format */}
            <div className="doc-toolbar-group">
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('link') ? 'active' : ''}`}
                    title="Sisipkan Tautan"
                    onClick={handleSetLink}
                >
                    <i className="bi bi-link-45deg" />
                </button>
                <button
                    type="button"
                    className="doc-tool-btn"
                    title="Hapus Pemformatan"
                    onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                >
                    <i className="bi bi-eraser" />
                </button>
            </div>

            <div className="doc-toolbar-divider" />

            {/* Alignments */}
            <div className="doc-toolbar-group">
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
                    title="Rata Kiri"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                >
                    <i className="bi bi-text-left" />
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
                    title="Rata Tengah"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                >
                    <i className="bi bi-text-center" />
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
                    title="Rata Kanan"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                >
                    <i className="bi bi-text-right" />
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
                    title="Rata Kiri-Kanan (Justify)"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                >
                    <i className="bi bi-justify" />
                </button>
            </div>

            {/* Line Spacing */}
            <div className="doc-toolbar-group">
                <select
                    className="doc-select-compact"
                    title="Jarak Baris (Line Spacing)"
                    defaultValue="1.5"
                    onChange={(e) => {
                        const val = e.target.value
                        editor.chain().focus().setLineHeight(val).run()
                    }}
                >
                    <option value="" disabled hidden>Spasi</option>
                    {lineSpacings.map((sp) => (
                        <option key={sp} value={sp}>
                            Spasi {sp}
                        </option>
                    ))}
                </select>
            </div>

            <div className="doc-toolbar-divider" />

            {/* Lists & Indentation */}
            <div className="doc-toolbar-group">
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('taskList') ? 'active' : ''}`}
                    title="Checklist / Task List"
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                >
                    <i className="bi bi-check2-square" />
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                    title="Daftar Bullet"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <i className="bi bi-list-ul" />
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
                    title="Daftar Bernomor"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <i className="bi bi-list-ol" />
                </button>
            </div>

            {/* Media & Table */}
            <div className="doc-toolbar-group">
                <button
                    type="button"
                    className="doc-tool-btn"
                    title="Sisipkan Gambar"
                    onClick={handleInsertImage}
                >
                    <i className="bi bi-image" />
                </button>
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('table') ? 'active' : ''}`}
                    title="Sisipkan Tabel"
                    onClick={handleInsertTable}
                >
                    <i className="bi bi-table" />
                </button>
            </div>

            {/* Extra: Quote, Horizontal Rule, AI Button */}
            <div className="doc-toolbar-group">
                <button
                    type="button"
                    className={`doc-tool-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
                    title="Kutipan"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <i className="bi bi-quote" />
                </button>
                <button
                    type="button"
                    className="doc-tool-btn"
                    title="Garis Horizontal Pemisah"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                    <i className="bi bi-dash-lg" />
                </button>
                <button
                    type="button"
                    className="doc-tool-btn doc-ai-btn"
                    title="AI Assist"
                    onClick={() => {
                        window.alert('Fitur AI Assistant siap dihubungkan dengan prompt dokumen.')
                    }}
                >
                    <i className="bi bi-stars" />
                    <span>AI</span>
                </button>
            </div>
        </div>
    )
}

export default DocumentEditorToolbar
