import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import type EditorJS from '@editorjs/editorjs'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { notesApi } from '@/features/notes/api/notesApi'
import EditorJsWorkspace from '@/features/notes/components/EditorJsWorkspace'
import NoteSaveStatus from '@/features/notes/components/NoteSaveStatus'
import NoteShareModal from '@/features/notes/components/NoteShareModal'
import { useAutosave } from '@/features/notes/hooks/useAutosave'
import { useKaryawanSearch } from '@/features/notes/hooks/useKaryawanSearch'
import type { EditorJsContent, Note } from '@/features/notes/types/notes.types'

import '@/features/notes/styles/notes.scss'

const formatDate = (dateString?: string): string => {
    if (!dateString) return '-'
    try {
        const d = new Date(dateString)
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return dateString
    }
}

export const NoteDetailPage = () => {
    const { id } = useParams<{ id: string }>()
    const noteId = Number(id)

    const { employee } = useAuth()
    const { karyawanList } = useKaryawanSearch()

    const [note, setNote] = useState<Note | null>(null)
    const [title, setTitle] = useState<string>('')
    const [editorContent, setEditorContent] = useState<EditorJsContent | null>(null)
    const editorInstanceRef = useRef<EditorJS | null>(null)

    const titleRef = useRef<string>('')
    const editorContentRef = useRef<EditorJsContent | null>(null)
    const isReadyForAutosaveRef = useRef<boolean>(false)

    useEffect(() => {
        titleRef.current = title
    }, [title])

    useEffect(() => {
        editorContentRef.current = editorContent
    }, [editorContent])

    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Share modal state
    const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false)

    // Permissions check
    const isAuthor =
        note !== null && employee?.employee_code !== undefined
            ? note.author_employee_code === employee.employee_code
            : false

    const hasEditPermission =
        note !== null && employee?.employee_code !== undefined && note.shares
            ? note.shares.some(
                  (s) =>
                      s.employee_code === employee.employee_code &&
                      s.permission === 'edit',
              )
            : false

    const canEdit = isAuthor || hasEditPermission

    // Core save function utilized by both autosave (debounced+throttled) and manual save
    const executeSaveNote = useCallback(async (): Promise<boolean> => {
        if (!note) return false

        const currentTitle = titleRef.current.trim()
        if (!currentTitle) {
            // Keep status unsaved without throwing error during typing
            return false
        }

        let finalContent = editorContentRef.current
        if (editorInstanceRef.current && typeof editorInstanceRef.current.save === 'function') {
            try {
                const saved = await editorInstanceRef.current.save()
                finalContent = {
                    time: saved.time,
                    blocks: saved.blocks,
                    version: saved.version,
                }
                editorContentRef.current = finalContent
            } catch (err) {
                console.warn('Gagal membaca konten dari editor:', err)
            }
        }

        if (!finalContent || !finalContent.blocks || finalContent.blocks.length === 0) {
            return false
        }

        const result = await notesApi.updateStandard(note.id, {
            title: currentTitle,
            content: finalContent,
        })

        if (result.success && result.data) {
            setNote(result.data)
            return true
        }

        throw new Error(result.message || 'Gagal menyimpan catatan.')
    }, [note])

    // Debounced & Throttled Autosave hook
    const {
        saveState,
        lastSavedAt,
        errorMessage: autosaveErrorMessage,
        notifyChange,
        triggerSaveNow,
    } = useAutosave(executeSaveNote, {
        debounceMs: 1500,
        throttleMs: 5000,
        enabled: canEdit && !isLoading,
    })

    useEffect(() => {
        if (!noteId || isNaN(noteId)) {
            return
        }

        let isMounted = true

        void notesApi.getStandardById(noteId).then((result) => {
            if (!isMounted) return
            if (result.success && result.data) {
                setNote(result.data)
                setTitle(result.data.title)
                titleRef.current = result.data.title
                setEditorContent(result.data.content)
                editorContentRef.current = result.data.content
                // Give EditorJS a moment to initialize before enabling autosave tracking
                setTimeout(() => {
                    if (isMounted) {
                        isReadyForAutosaveRef.current = true
                    }
                }, 400)
            } else {
                setErrorMessage(result.message || 'Catatan tidak ditemukan.')
            }
            setIsLoading(false)
        })

        return () => {
            isMounted = false
            isReadyForAutosaveRef.current = false
        }
    }, [noteId])

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setTitle(val)
        titleRef.current = val
        if (isReadyForAutosaveRef.current && canEdit) {
            notifyChange()
        }
    }

    const handleContentChange = (newContent: EditorJsContent) => {
        setEditorContent(newContent)
        editorContentRef.current = newContent
        if (isReadyForAutosaveRef.current && canEdit) {
            notifyChange()
        }
    }

    const handleManualSave = async (e?: FormEvent) => {
        if (e) {
            e.preventDefault()
        }
        if (!canEdit || !note) return

        setErrorMessage(null)
        setSuccessMessage(null)

        if (!title.trim()) {
            setErrorMessage('Judul catatan wajib diisi.')
            return
        }

        const success = await triggerSaveNow()
        if (success) {
            setSuccessMessage('Perubahan berhasil disimpan.')
            setTimeout(() => setSuccessMessage(null), 3000)
        } else if (autosaveErrorMessage) {
            setErrorMessage(autosaveErrorMessage)
        }
    }

    if (isLoading) {
        return (
            <div className="notion-workspace">
                <div className="text-center py-5 my-5">
                    <div className="spinner-border" style={{ color: '#e64b38' }} role="status">
                        <span className="visually-hidden">Memuat...</span>
                    </div>
                    <div className="text-muted mt-2 small">Memuat dokumen catatan...</div>
                </div>
            </div>
        )
    }

    if (!note) {
        return (
            <div className="notion-workspace">
                <div className="notion-canvas">
                    <div className="alert alert-danger my-4">
                        <i className="bi bi-exclamation-octagon-fill me-2" />
                        {errorMessage || 'Catatan tidak ditemukan.'}
                    </div>
                    <Link to="/notes" className="btn-notion-secondary">
                        <i className="bi bi-arrow-left" />
                        Kembali ke Notes
                    </Link>
                </div>
            </div>
        )
    }

    const matchedAuthor = karyawanList.find(
        (k) => k.code_employee.toLowerCase() === note.author_employee_code.toLowerCase(),
    )
    const authorDisplayLabel = isAuthor
        ? 'Saya'
        : matchedAuthor
        ? `${matchedAuthor.text} (${note.author_employee_code})`
        : note.author_employee_code

    return (
        <div className="notes-page">
            {/* Page Heading & Breadcrumb */}
            <div className="notes-heading">
                <h1 className="notes-title">
                    {title.trim() ? title : 'Detail Catatan'}
                </h1>
                <div className="notes-breadcrumb">
                    <span>Tools</span>
                    <span>/</span>
                    <Link to="/notes">Notes</Link>
                    <span>/</span>
                    <span className="active">Detail</span>
                </div>
            </div>

            {/* Board Container */}
            <div className="notes-board">
                {/* Form Action Header */}
                <div className="notes-form-header">
                    <Link to="/notes" className="notes-secondary-button">
                        <i className="bi bi-arrow-left" />
                        <span>Kembali</span>
                    </Link>

                    <div className="d-flex align-items-center gap-2">
                        {/* Autosave Status Indicator */}
                        {canEdit && (
                            <NoteSaveStatus
                                state={saveState}
                                lastSavedAt={lastSavedAt}
                                errorMessage={autosaveErrorMessage}
                                onRetry={() => void triggerSaveNow()}
                            />
                        )}

                        {/* Share Button (Author only) */}
                        {isAuthor && (
                            <button
                                type="button"
                                className="notes-secondary-button"
                                onClick={() => setIsShareModalOpen(true)}
                            >
                                <i className="bi bi-share text-danger" />
                                <span>Bagikan</span>
                            </button>
                        )}

                        {/* Save Button (If user has edit permission) */}
                        {canEdit ? (
                            <button
                                type="button"
                                className="notes-primary-button"
                                onClick={() => void handleManualSave()}
                                disabled={saveState === 'saving'}
                            >
                                {saveState === 'saving' ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check2" />
                                        <span>Simpan Sekarang</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <span className="badge bg-secondary-subtle text-secondary-emphasis px-3 py-2 rounded-pill">
                                <i className="bi bi-lock me-1" />
                                Hanya Baca
                            </span>
                        )}
                    </div>
                </div>

                {/* Feedback Alerts */}
                {errorMessage && (
                    <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2" />
                        <div className="flex-grow-1">{errorMessage}</div>
                        <button
                            type="button"
                            className="btn-close ms-2"
                            onClick={() => setErrorMessage(null)}
                        />
                    </div>
                )}

                {successMessage && (
                    <div className="alert alert-success d-flex align-items-center mb-3" role="alert">
                        <i className="bi bi-check-circle-fill me-2" />
                        <div className="flex-grow-1">{successMessage}</div>
                        <button
                            type="button"
                            className="btn-close ms-2"
                            onClick={() => setSuccessMessage(null)}
                        />
                    </div>
                )}

                {/* Properties & Metadata Card */}
                <div className="notes-form-card mb-4">
                    {/* Title */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold text-dark small mb-1">
                            Judul Catatan
                        </label>
                        {canEdit ? (
                            <input
                                type="text"
                                className="form-control fw-semibold"
                                value={title}
                                onChange={handleTitleChange}
                                placeholder="Judul Catatan..."
                            />
                        ) : (
                            <h3 className="fw-bold text-dark mb-0 fs-5">{title}</h3>
                        )}
                    </div>

                    {/* Meta info pills */}
                    <div className="d-flex flex-wrap align-items-center gap-2 pt-2 border-top">
                        <span className="notes-tag tag-standard">
                            📝 Catatan Standar
                        </span>

                        <span className="notes-tag tag-standard">
                            <i className="bi bi-person me-1" />
                            {authorDisplayLabel}
                        </span>

                        <span
                            className={`notes-tag ${
                                note.share_type === 'public'
                                    ? 'tag-public'
                                    : note.share_type === 'invited'
                                    ? 'tag-invited'
                                    : 'tag-private'
                            }`}
                        >
                            {note.share_type === 'public' && '🌐 Publik (Semua Karyawan)'}
                            {note.share_type === 'invited' && '✉️ Diundang (Spesifik)'}
                            {note.share_type === 'private' && '🔒 Privat (Hanya Saya)'}
                        </span>

                        <span className="text-muted small ms-auto">
                            <i className="bi bi-clock-history me-1" />
                            Diperbarui: {formatDate(note.updated_at)}
                        </span>
                    </div>

                    {/* Shares / Members Pill List */}
                    {note.shares && note.shares.length > 0 && (
                        <div className="pt-3 mt-3 border-top">
                            <div className="small fw-semibold text-dark mb-2">
                                <i className="bi bi-people me-1 text-muted" />
                                Akses Anggota ({note.shares.length})
                            </div>
                            <div className="d-flex flex-wrap gap-1 align-items-center">
                                {note.shares.map((share) => {
                                    const matched = karyawanList.find(
                                        (k) =>
                                            k.code_employee.toLowerCase() ===
                                            share.employee_code.toLowerCase(),
                                    )
                                    const displayName = matched
                                        ? matched.text
                                        : share.employee_code

                                    return (
                                        <span
                                            key={share.id}
                                            className="notes-tag tag-standard d-inline-flex align-items-center gap-1"
                                            title={`Akses: ${share.permission.toUpperCase()}`}
                                        >
                                            <i className="bi bi-person text-muted" />
                                            <span>{displayName}</span>
                                            {matched && (
                                                <span
                                                    className="text-muted"
                                                    style={{ fontSize: '10.5px' }}
                                                >
                                                    ({share.employee_code})
                                                </span>
                                            )}
                                            <span
                                                className="text-muted"
                                                style={{ fontSize: '10px' }}
                                            >
                                                [{share.permission}]
                                            </span>
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* EditorJS Section (Notion Frameless Canvas) */}
                <div className="pt-3 border-top mt-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="form-label fw-semibold text-dark mb-0">
                            Isi Catatan
                        </label>
                        {canEdit && (
                            <span className="text-muted small">
                                Ketik <kbd style={{ padding: '2px 5px', fontSize: '11px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb', borderRadius: '4px' }}>/</kbd> untuk menu perintah
                            </span>
                        )}
                    </div>
                    <EditorJsWorkspace
                        data={editorContent}
                        readOnly={!canEdit}
                        placeholder="Ketik '/' untuk perintah atau mulai menulis..."
                        instanceRef={editorInstanceRef}
                        onChange={handleContentChange}
                    />
                </div>
            </div>

            {/* Share Modal Dialog */}
            {isShareModalOpen && (
                <NoteShareModal
                    note={note}
                    isOpen={true}
                    onClose={() => setIsShareModalOpen(false)}
                    onUpdated={(updatedNote) => {
                        setNote(updatedNote)
                        setEditorContent(updatedNote.content)
                    }}
                />
            )}
        </div>
    )
}

export default NoteDetailPage
