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

interface EditorJsWorkspaceProps {
    data?: EditorJsContent | null
    readOnly?: boolean
    placeholder?: string
    onChange?: (data: EditorJsContent) => void
    onReady?: (editor: EditorJS) => void
    instanceRef?: React.MutableRefObject<EditorJS | null>
}

export const EditorJsWorkspace = ({
    data,
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
            time: data?.time || Date.now(),
            blocks: data?.blocks && data.blocks.length > 0 ? (data.blocks as OutputData['blocks']) : [],
            version: data?.version || '2.31.7',
        }

        const editor = new EditorJS({
            holder: containerId,
            readOnly,
            placeholder,
            data: initialOutputData,
            tools: {
                header: {
                    class: Header,
                    inlineToolbar: ['link', 'bold', 'italic'],
                    config: {
                        placeholder: 'Heading',
                        levels: [1, 2, 3, 4],
                        defaultLevel: 2,
                    },
                },
                list: {
                    class: List,
                    inlineToolbar: true,
                },
                checklist: {
                    class: Checklist,
                    inlineToolbar: true,
                },
            },
            onReady: () => {
                if (!isMounted) return
                if (onReadyRef.current) {
                    onReadyRef.current(editor)
                }
            },
            onChange: async () => {
                if (!isMounted || !onChangeRef.current) return
                try {
                    const savedData = await editor.save()
                    onChangeRef.current({
                        time: savedData.time,
                        blocks: savedData.blocks,
                        version: savedData.version,
                    })
                } catch (e) {
                    console.error('Gagal menyimpan perubahan EditorJS:', e)
                }
            },
        })

        internalEditorRef.current = editor
        if (instanceRef) {
            instanceRef.current = editor
        }
        isInitializingRef.current = false

        return () => {
            isMounted = false
            if (internalEditorRef.current && typeof internalEditorRef.current.destroy === 'function') {
                const current = internalEditorRef.current
                internalEditorRef.current = null
                if (instanceRef) {
                    instanceRef.current = null
                }
                current.isReady
                    .then(() => {
                        current.destroy()
                    })
                    .catch((err) => {
                        console.warn('Gagal menghancurkan instance EditorJS:', err)
                    })
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId, readOnly, placeholder])

    return (
        <div className={`notes-editor-workspace ${readOnly ? 'read-only' : ''}`}>
            <div id={containerId} className="notes-editor-container" />
        </div>
    )
}

export default EditorJsWorkspace
