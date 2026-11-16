import {
    useEffect,
    useId,
    useRef,
} from 'react'
import EditorJS, { type OutputData } from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Checklist from '@editorjs/checklist'

import type { EditorJsContent } from '@/features/notes/types/notes.types'

interface ListToolboxItem {
    title?: string
    icon?: string
    data?: { style?: string }
    [key: string]: unknown
}

// 1. Rename Heading to 'Judul'
const headerConstructor = Header as unknown as {
    toolbox?: { icon?: string; title?: string }
}
if (headerConstructor && headerConstructor.toolbox) {
    const originalHeaderIcon = headerConstructor.toolbox.icon
    Object.defineProperty(Header, 'toolbox', {
        get: () => ({
            icon: originalHeaderIcon,
            title: 'Judul',
        }),
        configurable: true,
    })
}

// 2. Remove duplicate Checklist from @editorjs/list, and rename
// 'Unordered List' -> 'Bullets' and 'Ordered List' -> 'Numbering'
const listConstructor = List as unknown as {
    toolbox?: ListToolboxItem[]
    prototype: {
        renderSettings?: () => Array<{ label?: string }>
    }
}

if (listConstructor && Array.isArray(listConstructor.toolbox)) {
    const modifiedToolbox = listConstructor.toolbox
        .filter((item) => item.title !== 'Checklist')
        .map((item) => {
            if (item.title === 'Unordered List') {
                return { ...item, title: 'Bullets' }
            }
            if (item.title === 'Ordered List') {
                return { ...item, title: 'Numbering' }
            }
            return item
        })
    Object.defineProperty(List, 'toolbox', {
        get: () => modifiedToolbox,
        configurable: true,
    })
}

if (listConstructor && typeof listConstructor.prototype.renderSettings === 'function') {
    const originalRenderSettings = listConstructor.prototype.renderSettings
    listConstructor.prototype.renderSettings = function () {
        const settings = originalRenderSettings.call(this)
        if (Array.isArray(settings)) {
            return settings
                .filter((item) => item.label !== 'Checklist')
                .map((item) => {
                    if (item.label === 'Unordered') {
                        return { ...item, label: 'Bullets' }
                    }
                    if (item.label === 'Ordered') {
                        return { ...item, label: 'Numbering' }
                    }
                    return item
                })
        }
        return settings
    }
}

interface EditorJsWorkspaceProps {
    data?: EditorJsContent | null
    initialData?: EditorJsContent | null
    readOnly?: boolean
    placeholder?: string
    onChange?: (data: EditorJsContent) => void
    onReady?: (editor: EditorJS) => void
    instanceRef?: React.MutableRefObject<EditorJS | null>
}

export const EditorJsWorkspace = ({
    data,
    initialData,
    readOnly = false,
    placeholder = 'Mulai menulis catatan atau notulen di sini...',
    onChange,
    onReady,
    instanceRef,
}: EditorJsWorkspaceProps) => {
    const rawId = useId()
    const containerId = `editorjs-container-${rawId.replace(/:/g, '')}`
    const internalEditorRef = useRef<EditorJS | null>(null)
    const isInitializingRef = useRef<boolean>(false)

    const effectiveData = initialData !== undefined ? initialData : data

    const onChangeRef = useRef(onChange)
    const onReadyRef = useRef(onReady)

    useEffect(() => {
        onChangeRef.current = onChange
        onReadyRef.current = onReady
    }, [onChange, onReady])

    useEffect(() => {
        let isMounted = true

        if (isInitializingRef.current || internalEditorRef.current) {
            return
        }

        isInitializingRef.current = true

        const initialOutputData: OutputData = {
            time: effectiveData?.time || Date.now(),
            blocks: effectiveData?.blocks && effectiveData.blocks.length > 0 ? (effectiveData.blocks as OutputData['blocks']) : [],
            version: effectiveData?.version || '2.31.7',
        }

        const editor = new EditorJS({
            holder: containerId,
            readOnly,
            placeholder,
            data: initialOutputData,
            minHeight: 180,
            i18n: {
                messages: {
                    toolNames: {
                        Text: 'Paragraf',
                        Heading: 'Judul',
                        'Unordered List': 'Bullets',
                        'Ordered List': 'Numbering',
                        Checklist: 'Checklist',
                    },
                    tools: {
                        list: {
                            Unordered: 'Bullets',
                            Ordered: 'Numbering',
                        },
                    },
                },
            },
            tools: {
                header: {
                    class: Header as unknown as EditorJS.ToolConstructable,
                    inlineToolbar: ['link'],
                    config: {
                        placeholder: 'Judul bagian...',
                        levels: [2, 3, 4],
                        defaultLevel: 2,
                    },
                },
                list: {
                    class: List as unknown as EditorJS.ToolConstructable,
                    inlineToolbar: true,
                    config: {
                        defaultStyle: 'unordered',
                    },
                },
                checklist: {
                    class: Checklist as unknown as EditorJS.ToolConstructable,
                    inlineToolbar: true,
                },
            },
            onReady: () => {
                if (!isMounted) return
                internalEditorRef.current = editor
                if (instanceRef) {
                    instanceRef.current = editor
                }
                if (onReadyRef.current) {
                    onReadyRef.current(editor)
                }
            },
            onChange: async () => {
                if (!isMounted || !onChangeRef.current) return
                try {
                    const output = await editor.save()
                    onChangeRef.current({
                        time: output.time,
                        blocks: output.blocks,
                        version: output.version,
                    })
                } catch (err) {
                    console.warn('Gagal membaca data dari EditorJS:', err)
                }
            },
        })

        return () => {
            isMounted = false
            if (internalEditorRef.current && typeof internalEditorRef.current.destroy === 'function') {
                try {
                    internalEditorRef.current.destroy()
                } catch {
                    // Ignore destroy errors during fast remount
                }
                internalEditorRef.current = null
                if (instanceRef) {
                    instanceRef.current = null
                }
            }
            isInitializingRef.current = false
        }
    }, [containerId, placeholder, readOnly]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className={`editorjs-workspace-wrapper ${readOnly ? 'read-only' : ''}`}>
            <div id={containerId} className="editorjs-content" />
        </div>
    )
}

export default EditorJsWorkspace
