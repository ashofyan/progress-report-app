import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { FontFamily } from '@tiptap/extension-font-family'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { CharacterCount } from '@tiptap/extension-character-count'
import { useEffect, useRef } from 'react'

import {
    FontSize,
    LineHeight,
    ResizableImage,
} from '@/features/representative-letter/components/editor/tiptapExtensions'
import DocumentEditorToolbar from '@/features/representative-letter/components/editor/DocumentEditorToolbar'
import DocumentEditorStatusBar from '@/features/representative-letter/components/editor/DocumentEditorStatusBar'
import RepresentativeLetterDocumentPage from '@/features/representative-letter/components/RepresentativeLetterDocumentPage'
import RepresentativeLetterDocumentSettings from '@/features/representative-letter/components/RepresentativeLetterDocumentSettings'
import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    RepresentativeLetter,
    RepresentativeLetterDocumentSettings as DocumentSettings,
} from '@/features/representative-letter/types/representative-letter.types'

interface RepresentativeLetterDocumentWorkspaceProps {
    letter: RepresentativeLetter
    content: string
    settings: DocumentSettings
    onContentChange: (value: string) => void
    onSettingsChange: (settings: DocumentSettings) => void
    isDirty?: boolean
    isSaving?: boolean
}

const RepresentativeLetterDocumentWorkspace = ({
    letter,
    content,
    settings,
    onContentChange,
    onSettingsChange,
    isDirty = false,
    isSaving = false,
}: RepresentativeLetterDocumentWorkspaceProps) => {
    const isFirstLoadRef = useRef(true)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            FontFamily,
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            Subscript,
            Superscript,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            ResizableImage,
            CharacterCount,
            FontSize,
            LineHeight,
        ],
        content: content || '<p></p>',
        editable: letter.status === 'draft',
        editorProps: {
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || [])
                for (const item of items) {
                    if (item.type.indexOf('image') === 0) {
                        const file = item.getAsFile()
                        if (file) {
                            event.preventDefault()
                            representativeLetterApi.uploadImage(file).then((res) => {
                                if (res.success && res.data?.url && view.state.schema.nodes.image) {
                                    view.dispatch(
                                        view.state.tr.replaceSelectionWith(
                                            view.state.schema.nodes.image.create({
                                                src: res.data.url,
                                            })
                                        )
                                    )
                                }
                            })
                            return true
                        }
                    }
                }
                return false
            },
            handleDrop: (view, event) => {
                const files = Array.from(event.dataTransfer?.files || [])
                for (const file of files) {
                    if (file.type.indexOf('image') === 0) {
                        event.preventDefault()
                        representativeLetterApi.uploadImage(file).then((res) => {
                            if (res.success && res.data?.url && view.state.schema.nodes.image) {
                                view.dispatch(
                                    view.state.tr.replaceSelectionWith(
                                        view.state.schema.nodes.image.create({
                                            src: res.data.url,
                                        })
                                    )
                                )
                            }
                        })
                        return true
                    }
                }
                return false
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            onContentChange(currentEditor.getHTML())
        },
    })

    useEffect(() => {
        if (!editor) return

        if (isFirstLoadRef.current && content) {
            editor.commands.setContent(content, { emitUpdate: false })
            isFirstLoadRef.current = false
        }
        editor.setEditable(letter.status === 'draft')
    }, [content, editor, letter.status])

    return (
        <div className="doc-editor-container">
            {/* Ribbon Toolbar fixed at the top */}
            <DocumentEditorToolbar editor={editor} />

            {/* Document body and layout settings */}
            <div className="representative-letter-workspace">
                <div className="representative-letter-paper-scroll">
                    {letter.header === null && settings.header.enabled && (
                        <div className="representative-letter-warning">
                            Representative Letter ini belum memiliki header kop surat.
                        </div>
                    )}

                    <RepresentativeLetterDocumentPage
                        header={letter.header}
                        editor={editor}
                        settings={settings}
                    />
                </div>

                <RepresentativeLetterDocumentSettings
                    settings={settings}
                    onChange={onSettingsChange}
                />
            </div>

            {/* Bottom status bar */}
            <DocumentEditorStatusBar
                editor={editor}
                isDirty={isDirty}
                isSaving={isSaving}
            />
        </div>
    )
}

export default RepresentativeLetterDocumentWorkspace
