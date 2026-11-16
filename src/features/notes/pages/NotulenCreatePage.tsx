import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type EditorJS from '@editorjs/editorjs'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import type { MarketingClient } from '@/features/additional-task/types/client.types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { notesApi } from '@/features/notes/api/notesApi'
import EditorJsWorkspace from '@/features/notes/components/EditorJsWorkspace'
import MeetingAttendeesInput, {
    type MeetingAttendeeItem,
} from '@/features/notes/components/MeetingAttendeesInput'
import NoteSaveStatus from '@/features/notes/components/NoteSaveStatus'
import { useAutosave } from '@/features/notes/hooks/useAutosave'
import type {
    EditorJsContent,
    MeetingScope,
} from '@/features/notes/types/notes.types'

import '@/features/notes/styles/notes.scss'

const DRAFT_STORAGE_KEY = 'als_notulen_create_draft'

interface NotulenDraftData {
    title: string
    meetingScope: MeetingScope
    clientId: number | null
    selectedClient: MarketingClient | null
    attendeeCodes: string[]
    attendees: MeetingAttendeeItem[]
    content: EditorJsContent
    savedAt: string
}

export const NotulenCreatePage = () => {
    const navigate = useNavigate()
    const { employee } = useAuth()

    // Form fields
    const [title, setTitle] = useState<string>('')
    const [meetingScope, setMeetingScope] = useState<MeetingScope>('umum')
    const [selectedClient, setSelectedClient] = useState<MarketingClient | null>(null)
    const [clientId, setClientId] = useState<number | null>(null)
    const [attendeeCodes, setAttendeeCodes] = useState<string[]>([])
    const [attendees, setAttendees] = useState<MeetingAttendeeItem[]>([])

    // Marketing clients hook for ClientSelect
    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    // Editor content & ref
    const editorInstanceRef = useRef<EditorJS | null>(null)
    const [editorContent, setEditorContent] = useState<EditorJsContent>(() => ({
        time: Date.now(),
        blocks: [],
    }))

    const titleRef = useRef<string>('')
    const meetingScopeRef = useRef<MeetingScope>('umum')
    const clientIdRef = useRef<number | null>(null)
    const selectedClientRef = useRef<MarketingClient | null>(null)
    const attendeeCodesRef = useRef<string[]>([])
    const attendeesRef = useRef<MeetingAttendeeItem[]>([])
    const editorContentRef = useRef<EditorJsContent | null>(null)
    const isReadyForAutosaveRef = useRef<boolean>(false)

    useEffect(() => {
        titleRef.current = title
    }, [title])

    useEffect(() => {
        meetingScopeRef.current = meetingScope
    }, [meetingScope])

    useEffect(() => {
        clientIdRef.current = clientId
    }, [clientId])

    useEffect(() => {
        selectedClientRef.current = selectedClient
    }, [selectedClient])

    useEffect(() => {
        attendeeCodesRef.current = attendeeCodes
    }, [attendeeCodes])

    useEffect(() => {
        attendeesRef.current = attendees
    }, [attendees])

    useEffect(() => {
        editorContentRef.current = editorContent
    }, [editorContent])

    // Draft recovery state
    const [savedDraft, setSavedDraft] = useState<NotulenDraftData | null>(null)

    // Check for existing draft on mount
    useEffect(() => {
        try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
            if (rawDraft) {
                const parsed = JSON.parse(rawDraft) as NotulenDraftData
                if (
                    parsed &&
                    (parsed.title ||
                        parsed.attendeeCodes?.length > 0 ||
                        (parsed.content?.blocks && parsed.content.blocks.length > 0))
                ) {
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
        setMeetingScope(savedDraft.meetingScope || 'umum')
        meetingScopeRef.current = savedDraft.meetingScope || 'umum'
        setClientId(savedDraft.clientId || null)
        clientIdRef.current = savedDraft.clientId || null
        setSelectedClient(savedDraft.selectedClient || null)
        selectedClientRef.current = savedDraft.selectedClient || null
        setAttendeeCodes(savedDraft.attendeeCodes || [])
        attendeeCodesRef.current = savedDraft.attendeeCodes || []
        setAttendees(savedDraft.attendees || [])
        attendeesRef.current = savedDraft.attendees || []

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
        const hasAttendees = attendeeCodesRef.current.length > 0
        const hasBlocks = Boolean(currentContent?.blocks && currentContent.blocks.length > 0)

        // Only save draft if user has entered data
        if (!hasTitle && !hasAttendees && !hasBlocks) {
            return false
        }

        try {
            const draftPayload: NotulenDraftData = {
                title: currentTitle,
                meetingScope: meetingScopeRef.current,
                clientId: clientIdRef.current,
                selectedClient: selectedClientRef.current,
                attendeeCodes: attendeeCodesRef.current,
                attendees: attendeesRef.current,
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

    const handleAttendeesChange = (codes: string[]) => {
        setAttendeeCodes(codes)
        attendeeCodesRef.current = codes
        if (isReadyForAutosaveRef.current) {
            notifyChange()
        }
    }

    const handleAttendeeItemsChange = (items: MeetingAttendeeItem[]) => {
        setAttendees(items)
        attendeesRef.current = items
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
            setErrorMessage('Judul notulen rapat wajib diisi.')
            return
        }

        if (meetingScope === 'client' && (!clientId || clientId <= 0)) {
            setErrorMessage('Pilih klien terlebih dahulu untuk notulen rapat klien eksternal.')
            return
        }

        if (attendeeCodes.length === 0) {
            setErrorMessage('Peserta rapat wajib diisi minimal 1 orang.')
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
            setErrorMessage('Isi konten notulen rapat tidak boleh kosong.')
            return
        }

        setIsSubmitting(true)

        const result = await notesApi.createMeeting({
            meeting_scope: meetingScope,
            client_id: meetingScope === 'client' ? clientId : null,
            title: title.trim(),
            author_employee_name: employee?.employee_name,
            attendees: attendees.length > 0 ? attendees : undefined,
            attendee_codes: attendeeCodes,
            content: finalContent,
        })

        setIsSubmitting(false)

        if (result.success && result.data) {
            localStorage.removeItem(DRAFT_STORAGE_KEY)
            navigate(`/notulen/${result.data.id}`)
        } else {
            setErrorMessage(result.message)
        }
    }

    return (
        <div className="notes-page">
            {/* Page Heading & Breadcrumb */}
            <div className="notes-heading">
                <h1 className="notes-title">Buat Notulen Rapat</h1>
                <div className="notes-breadcrumb">
                    <span>Tools</span>
                    <span>/</span>
                    <Link to="/notulen">Notulen</Link>
                    <span>/</span>
                    <span className="active">Tambah</span>
                </div>
            </div>

            {/* Main Form Board */}
            <div className="notes-board">
                {/* Form Action Header */}
                <div className="notes-form-header">
                    <Link to="/notulen" className="notes-secondary-button">
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
                                    <span>Simpan Notulen</span>
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
                                Ditemukan draf notulen rapat yang belum disimpan dari sesi sebelumnya (
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
                    {/* Judul Notulen Rapat */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold text-dark">
                            Judul Notulen Rapat <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Contoh: Notulen Rapat Koordinasi Mingguan Proyek..."
                            value={title}
                            onChange={handleTitleChange}
                            autoFocus
                        />
                    </div>

                    {/* Properties */}
                    <div className="row g-3">
                        {/* Meeting Scope */}
                        <div className="col-12 col-md-6">
                            <label className="form-label fw-semibold text-dark small">
                                <i className="bi bi-diagram-3 me-1 text-muted" />
                                Lingkup Rapat
                            </label>
                            <div className="notes-filter-tabs w-100">
                                <button
                                    type="button"
                                    className={`notes-tab-button flex-fill justify-content-center ${
                                        meetingScope === 'umum' ? 'active' : ''
                                    }`}
                                    onClick={() => {
                                        setMeetingScope('umum')
                                        setSelectedClient(null)
                                        setClientId(null)
                                        notifyChange()
                                    }}
                                >
                                    <i className="bi bi-building-check" />
                                    <span>Internal ALS</span>
                                </button>
                                <button
                                    type="button"
                                    className={`notes-tab-button flex-fill justify-content-center ${
                                        meetingScope === 'client' ? 'active' : ''
                                    }`}
                                    onClick={() => {
                                        setMeetingScope('client')
                                        notifyChange()
                                    }}
                                >
                                    <i className="bi bi-briefcase" />
                                    <span>Klien Eksternal</span>
                                </button>
                            </div>
                        </div>

                        {/* Client Selector */}
                        {meetingScope === 'client' && (
                            <div className="col-12 col-md-6">
                                <label className="form-label fw-semibold text-dark small">
                                    <i className="bi bi-buildings me-1 text-muted" />
                                    Pilih Klien <span className="text-danger">*</span>
                                </label>
                                <ClientSelect
                                    clients={clients}
                                    selectedCode={selectedClient?.customer_code ?? ''}
                                    isLoading={isLoadingClients}
                                    errorMessage={clientErrorMessage}
                                    onSearch={handleClientSearch}
                                    onSelect={(client) => {
                                        setSelectedClient(client)
                                        setClientId(client.id)
                                        notifyChange()
                                    }}
                                />
                            </div>
                        )}

                        {/* Peserta Rapat */}
                        <div className="col-12">
                            <label className="form-label fw-semibold text-dark small">
                                <i className="bi bi-person-check me-1 text-muted" />
                                Peserta Rapat Hadir <span className="text-danger">*</span>
                            </label>
                            <MeetingAttendeesInput
                                value={attendeeCodes}
                                attendees={attendees}
                                onChange={handleAttendeesChange}
                                onAttendeesChange={handleAttendeeItemsChange}
                            />
                            <div className="text-muted mt-1" style={{ fontSize: '11.5px' }}>
                                Peserta yang ditambahkan otomatis memiliki hak akses membaca (Read-Only) notulen ini.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Editor Section (Notion Frameless Canvas) */}
                <div className="pt-3 border-top mt-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="form-label fw-semibold text-dark mb-0">
                            Isi Notulen Rapat
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

export default NotulenCreatePage
