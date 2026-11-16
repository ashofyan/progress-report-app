import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type EditorJS from '@editorjs/editorjs'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { notesApi } from '@/features/notes/api/notesApi'
import EditorJsWorkspace from '@/features/notes/components/EditorJsWorkspace'
import NoteSaveStatus from '@/features/notes/components/NoteSaveStatus'
import { useAutosave } from '@/features/notes/hooks/useAutosave'
import type { EditorJsContent } from '@/features/notes/types/notes.types'

import '@/features/notes/styles/notes.scss'

const DRAFT_STORAGE_KEY = 'als_notes_create_draft'

interface NoteDraftData {
    title: string
    content: EditorJsContent
    savedAt: string
}

export const NoteCreatePage = () => {
    const navigate = useNavigate()
    const { employee } = useAuth()

    // Form fields
    const [title, setTitle] = useState<string>('')

    // Editor content & ref
    const editorInstanceRef = useRef<EditorJS | null>(null)
    const [editorContent, setEditorContent] = useState<EditorJsContent>(() => ({
        time: Date.now(),
        blocks: [],
    }))

    const titleRef = useRef<string>('')
    const editorContentRef = useRef<EditorJsContent | null>(null)
    const isReadyForAutosaveRef = useRef<boolean>(false)

    useEffect(() => {
        titleRef.current = title
    }, [title])

    useEffect(() => {
        editorContentRef.current = editorContent
    }, [editorContent])

    // Draft recovery state
    const [savedDraft, setSavedDraft] = useState<NoteDraftData | null>(null)

    // Check for existing draft on mount
    useEffect(() => {
        try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
            if (rawDraft) {
                const parsed = JSON.parse(rawDraft) as NoteDraftData
                if (parsed && (parsed.title || (parsed.content?.blocks && parsed.content.blocks.length > 0))) {
                    setSavedDraft(parsed)
                }
            }
        } catch {
            // Ignore parse errors
        }

        const timer = setTimeout(() => {
            isReadyForAutosaveRef.current = true
        }, 500)

        return () => {
            clearTimeout(timer)
        }
    }, [])

    const handleRestoreDraft = () => {
        if (!savedDraft) return
        setTitle(savedDraft.title || '')
        titleRef.current = savedDraft.title || ''
        if (savedDraft.content) {
            setEditorContent(savedDraft.content)
            editorContentRef.current = savedDraft.content
        }
        setSavedDraft(null)
    }

    const handleDiscardDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        setSavedDraft(null)
    }

    // Submission & validation state
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Autosave draft handler (debounced + throttled)
    const executeSaveDraft = useCallback(async (): Promise<boolean> => {
        const currentTitle = titleRef.current.trim()

        let currentContent = editorContentRef.current
        if (editorInstanceRef.current && typeof editorInstanceRef.current.save === 'function') {
            try {
                const saved = await editorInstanceRef.current.save()
                currentContent = {
                    time: saved.time,
                    blocks: saved.blocks,
                    version: saved.version,
                }
                editorContentRef.current = currentContent
            } catch (err) {
                console.warn('Gagal membaca konten untuk draft:', err)
            }
        }

        const hasTitle = Boolean(currentTitle)
        const hasBlocks = Boolean(currentContent?.blocks && currentContent.blocks.length > 0)

        // Only save draft if user has actually typed something
        if (!hasTitle && !hasBlocks) {
            return false
        }

        try {
            const draftPayload: NoteDraftData = {
                title: currentTitle,
                content: currentContent || { time: Date.now(), blocks: [] },
                savedAt: new Date().toISOString(),
            }
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload))
            return true
        } catch {
            return false
        }
    }, [])

    const {
        saveState,
        lastSavedAt,
        errorMessage: autosaveErrorMessage,
        notifyChange,
    } = useAutosave(executeSaveDraft, {
        debounceMs: 1500,
        throttleMs: 5000,
        enabled: true,
    })

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setTitle(val)
        titleRef.current = val
        if (isReadyForAutosaveRef.current) {
            notifyChange()
        }
    }

    const handleContentChange = (newContent: EditorJsContent) => {
        setEditorContent(newContent)
        editorContentRef.current = newContent
        if (isReadyForAutosaveRef.current) {
            notifyChange()
        }
    }

    const handleSubmit = async (e?: FormEvent) => {
        if (e) {
            e.preventDefault()
        }
        setErrorMessage(null)

        if (!title.trim()) {
            setErrorMessage('Judul catatan wajib diisi.')
            return
        }

        // Extract latest data from editor instance if available
        let finalContent = editorContent
        if (editorInstanceRef.current && typeof editorInstanceRef.current.save === 'function') {
            try {
                const saved = await editorInstanceRef.current.save()
                finalContent = {
                    time: saved.time,
                    blocks: saved.blocks,
                    version: saved.version,
                }
            } catch (err) {
                console.warn('Gagal membaca konten dari editor:', err)
            }
        }

        if (!finalContent.blocks || finalContent.blocks.length === 0) {
            setErrorMessage('Isi konten catatan tidak boleh kosong.')
            return
        }

        setIsSubmitting(true)

        const result = await notesApi.createStandard({
            title: title.trim(),
            content: finalContent,
            author_employee_name: employee?.employee_name,
        })

        setIsSubmitting(false)

        if (result.success && result.data) {
            localStorage.removeItem(DRAFT_STORAGE_KEY)
            navigate(`/notes/${result.data.id}`)
        } else {
            setErrorMessage(result.message)
        }
    }

    return (
        <div className="notes-page">
            {/* Page Heading & Breadcrumb */}
            <div className="notes-heading">
                <h1 className="notes-title">Buat Catatan Baru</h1>
                <div className="notes-breadcrumb">
                    <span>Tools</span>
                    <span>/</span>
                    <Link to="/notes">Notes</Link>
                    <span>/</span>
                    <span className="active">Tambah</span>
                </div>
            </div>

            {/* Main Form Board */}
            <div className="notes-board">
                {/* Form Action Header */}
                <div className="notes-form-header">
                    <Link to="/notes" className="notes-secondary-button">
                        <i className="bi bi-arrow-left" />
                        <span>Kembali</span>
                    </Link>

                    <div className="d-flex align-items-center gap-2">
                        <NoteSaveStatus
                            state={saveState}
                            lastSavedAt={lastSavedAt}
                            isDraft={true}
                            errorMessage={autosaveErrorMessage}
                        />

                        <button
                            type="button"
                            className="notes-primary-button"
                            onClick={() => void handleSubmit()}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" />
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check2" />
                                    <span>Simpan Catatan</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Draft Recovery Alert */}
                {savedDraft && (
                    <div className="notes-draft-alert">
                        <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-info-circle-fill text-success" />
                            <span>
                                Ditemukan draf catatan yang belum disimpan dari sesi sebelumnya (
                                {savedDraft.savedAt ? new Date(savedDraft.savedAt).toLocaleTimeString('id-ID') : 'baru saja'}
                                ).
                            </span>
                        </div>
                        <div className="notes-draft-alert-actions">
                            <button
                                type="button"
                                className="btn btn-sm btn-success"
                                onClick={handleRestoreDraft}
                            >
                                <i className="bi bi-arrow-counterclockwise me-1" />
                                Pulihkan Draf
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={handleDiscardDraft}
                            >
                                Buang
                            </button>
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2" />
                        <div className="flex-grow-1">{errorMessage}</div>
                        <button
                            type="button"
                            className="btn-close ms-2"
                            onClick={() => setErrorMessage(null)}
                        />
                    </div>
                )}

                {/* Form Controls Card */}
                <div className="notes-form-card mb-4">
                    {/* Title Input */}
                    <div className="mb-0">
                        <label className="form-label fw-semibold text-dark">
                            Judul Catatan <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Contoh: Rencana Strategis Pengembangan Sistem..."
                            value={title}
                            onChange={handleTitleChange}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Editor Section (Notion Frameless Canvas) */}
                <div className="pt-3 border-top mt-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="form-label fw-semibold text-dark mb-0">
                            Isi Catatan
                        </label>
                        <span className="text-muted small">
                            Ketik <kbd style={{ padding: '2px 5px', fontSize: '11px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb', borderRadius: '4px' }}>/</kbd> untuk menu perintah
                        </span>
                    </div>
                    <EditorJsWorkspace
                        data={editorContent}
                        placeholder="Ketik '/' untuk perintah atau mulai menulis..."
                        instanceRef={editorInstanceRef}
                        onChange={handleContentChange}
                    />
                </div>
            </div>
        </div>
    )
}

export default NoteCreatePage
