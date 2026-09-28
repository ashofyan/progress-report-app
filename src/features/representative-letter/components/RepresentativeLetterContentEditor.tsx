import {
    type ClipboardEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'

interface RepresentativeLetterContentEditorProps {
    value: string
    onChange: (value: string) => void
}

type EditorCommand =
    | 'bold'
    | 'italic'
    | 'underline'
    | 'justifyLeft'
    | 'justifyCenter'
    | 'justifyRight'
    | 'justifyFull'
    | 'insertUnorderedList'
    | 'insertOrderedList'
    | 'outdent'
    | 'indent'
    | 'undo'
    | 'redo'

const toolbarGroups: Array<
    Array<{
        command: EditorCommand
        icon: string
        label: string
    }>
> = [
    [
        { command: 'undo', icon: 'bi-arrow-counterclockwise', label: 'Undo' },
        { command: 'redo', icon: 'bi-arrow-clockwise', label: 'Redo' },
    ],
    [
        { command: 'bold', icon: 'bi-type-bold', label: 'Bold' },
        { command: 'italic', icon: 'bi-type-italic', label: 'Italic' },
        { command: 'underline', icon: 'bi-type-underline', label: 'Underline' },
    ],
    [
        { command: 'justifyLeft', icon: 'bi-text-left', label: 'Align left' },
        { command: 'justifyCenter', icon: 'bi-text-center', label: 'Align center' },
        { command: 'justifyRight', icon: 'bi-text-right', label: 'Align right' },
        { command: 'justifyFull', icon: 'bi-justify', label: 'Justify' },
    ],
    [
        { command: 'insertUnorderedList', icon: 'bi-list-ul', label: 'Bullet list' },
        { command: 'insertOrderedList', icon: 'bi-list-ol', label: 'Numbered list' },
    ],
    [
        { command: 'outdent', icon: 'bi-text-indent-left', label: 'Outdent' },
        { command: 'indent', icon: 'bi-text-indent-right', label: 'Indent' },
    ],
]

const headingOptions = [
    { value: 'P', label: 'Normal' },
    { value: 'H2', label: 'Judul' },
    { value: 'H3', label: 'Subjudul' },
    { value: 'BLOCKQUOTE', label: 'Kutipan' },
]

const RepresentativeLetterContentEditor = ({
                                               value,
                                               onChange,
                                           }: RepresentativeLetterContentEditorProps) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const [activeBlock, setActiveBlock] = useState('P')

    useEffect(() => {
        const editor = editorRef.current

        if (editor !== null && editor.innerHTML !== value) {
            editor.innerHTML = value || '<p><br></p>'
        }
    }, [value])

    const emitChange = useCallback(() => {
        const editor = editorRef.current

        if (editor === null) return

        onChange(editor.innerHTML)
    }, [onChange])

    const focusEditor = useCallback(() => {
        editorRef.current?.focus()
    }, [])

    const runCommand = useCallback((command: EditorCommand, commandValue?: string) => {
        focusEditor()
        document.execCommand(command, false, commandValue)
        emitChange()
    }, [emitChange, focusEditor])

    const changeBlock = useCallback((block: string) => {
        focusEditor()
        document.execCommand('formatBlock', false, block)
        setActiveBlock(block)
        emitChange()
    }, [emitChange, focusEditor])

    const updateActiveBlock = useCallback(() => {
        const selection = window.getSelection()
        const editor = editorRef.current

        if (selection === null || editor === null || selection.rangeCount === 0) return

        let node: Node | null = selection.anchorNode

        if (node?.nodeType === Node.TEXT_NODE) {
            node = node.parentElement
        }

        const element = node instanceof Element
            ? node.closest('h2, h3, blockquote, p, div')
            : null

        if (element === null || !editor.contains(element)) return

        const tagName = element.tagName === 'DIV' ? 'P' : element.tagName

        setActiveBlock(tagName)
    }, [])

    const handlePaste = useCallback((event: ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault()

        const html = event.clipboardData.getData('text/html')
        const text = event.clipboardData.getData('text/plain')

        if (html !== '') {
            document.execCommand('insertHTML', false, html)
        } else if (text !== '') {
            document.execCommand('insertText', false, text)
        }

        emitChange()
    }, [emitChange])

    return (
        <div className="representative-letter-content-editor">
            <div
                className="representative-letter-format-toolbar"
                aria-label="Format representative letter"
            >
                <select
                    className="form-select form-select-sm representative-letter-block-select"
                    value={activeBlock}
                    onChange={(event) => changeBlock(event.target.value)}
                    aria-label="Text style"
                >
                    {headingOptions.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>

                {toolbarGroups.map((group, groupIndex) => (
                    <div
                        className="representative-letter-format-group"
                        key={groupIndex}
                    >
                        {group.map((item) => (
                            <button
                                type="button"
                                className="representative-letter-format-button"
                                key={item.command}
                                title={item.label}
                                aria-label={item.label}
                                onClick={() => runCommand(item.command)}
                            >
                                <i className={`bi ${item.icon}`} />
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            <div
                ref={editorRef}
                className="representative-letter-editable"
                contentEditable
                suppressContentEditableWarning
                onInput={emitChange}
                onKeyUp={updateActiveBlock}
                onMouseUp={updateActiveBlock}
                onFocus={updateActiveBlock}
                onPaste={handlePaste}
            />
        </div>
    )
}

export default RepresentativeLetterContentEditor
