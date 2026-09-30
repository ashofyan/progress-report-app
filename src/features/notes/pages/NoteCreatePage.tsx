import {
    useCallback,
    useRef,
    useState,
    type FormEvent,
} from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type EditorJS from '@editorjs/editorjs'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import type { MarketingClient } from '@/features/additional-task/types/client.types'
import { notesApi } from '@/features/notes/api/notesApi'
import EditorJsWorkspace from '@/features/notes/components/EditorJsWorkspace'
import MeetingAttendeesInput from '@/features/notes/components/MeetingAttendeesInput'
import type {
    EditorJsContent,
    MeetingScope,
    NoteType,
} from '@/features/notes/types/notes.types'

import '@/features/notes/styles/notes.scss'

export const NoteCreatePage = () => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const initialType = searchParams.get('type') === 'meeting' ? 'meeting' : 'standard'
    const [noteType, setNoteType] = useState<NoteType>(initialType)

    // Form fields
    const [title, setTitle] = useState<string>('')
    const [meetingScope, setMeetingScope] = useState<MeetingScope>('umum')
    const [selectedClient, setSelectedClient] = useState<MarketingClient | null>(null)
    const [clientId, setClientId] = useState<number | null>(null)
    const [attendeeCodes, setAttendeeCodes] = useState<string[]>([])

    // Marketing clients hook for ClientSelect (identical to daily progress)
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

    // Submission & validation state
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const handleTypeChange = (type: NoteType) => {
        setNoteType(type)
        setSearchParams({ type })
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
            setErrorMessage('Isi konten catatan atau notulen tidak boleh kosong.')
            return
        }

        setIsSubmitting(true)

        if (noteType === 'standard') {
            const result = await notesApi.createStandard({
                title: title.trim(),
                content: finalContent,
            })

            setIsSubmitting(false)

            if (result.success && result.data) {
                navigate(`/notes/${result.data.id}`)
            } else {
                setErrorMessage(result.message)
            }
        } else {
            // Meeting note validations
            if (meetingScope === 'client' && (!clientId || clientId <= 0)) {
                setIsSubmitting(false)
                setErrorMessage('Pilih klien terlebih dahulu untuk notulen rapat klien eksternal.')
                return
            }

            if (attendeeCodes.length === 0) {
                setIsSubmitting(false)
                setErrorMessage('Peserta rapat wajib diisi minimal 1 orang (Employee Code).')
                return
            }

            const result = await notesApi.createMeeting({
                meeting_scope: meetingScope,
                client_id: meetingScope === 'client' ? clientId : null,
                title: title.trim(),
                attendee_codes: attendeeCodes,
                content: finalContent,
            })

            setIsSubmitting(false)

            if (result.success && result.data) {
                navigate(`/notes/${result.data.id}`)
            } else {
                setErrorMessage(result.message)
            }
        }
    }

    return (
        <div className="notes-page">
            {/* Page Heading & Breadcrumb */}
            <div className="notes-heading">
                <h1 className="notes-title">
                    {noteType === 'meeting' ? 'Buat Notulen Rapat' : 'Buat Catatan Baru'}
                </h1>
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
                                <span>Simpan {noteType === 'meeting' ? 'Notulen' : 'Catatan'}</span>
                            </>
                        )}
                    </button>
                </div>

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
                    <div className="mb-3">
                        <label className="form-label fw-semibold text-dark">
                            Judul {noteType === 'meeting' ? 'Notulen Rapat' : 'Catatan'} <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder={
                                noteType === 'meeting'
                                    ? 'Contoh: Notulen Rapat Mingguan Tim IT...'
                                    : 'Contoh: Rencana Strategis Q3...'
                            }
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Properties */}
                    <div className="row g-3">
                        {/* Tipe Catatan */}
                        <div className="col-12 col-md-6">
                            <label className="form-label fw-semibold text-dark small">
                                <i className="bi bi-tag me-1 text-muted" />
                                Tipe Catatan
                            </label>
                            <div className="notes-filter-tabs w-100">
                                <button
                                    type="button"
                                    className={`notes-tab-button flex-fill justify-content-center ${
                                        noteType === 'standard' ? 'active' : ''
                                    }`}
                                    onClick={() => handleTypeChange('standard')}
                                >
                                    <i className="bi bi-journal-text" />
                                    <span>Catatan Standar</span>
                                </button>
                                <button
                                    type="button"
                                    className={`notes-tab-button flex-fill justify-content-center ${
                                        noteType === 'meeting' ? 'active' : ''
                                    }`}
                                    onClick={() => handleTypeChange('meeting')}
                                >
                                    <i className="bi bi-people" />
                                    <span>Notulen Rapat</span>
                                </button>
                            </div>
                        </div>

                        {/* Meeting Scope */}
                        {noteType === 'meeting' && (
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
                                        onClick={() => setMeetingScope('client')}
                                    >
                                        <i className="bi bi-briefcase" />
                                        <span>Klien Eksternal</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Client Selector */}
                        {noteType === 'meeting' && meetingScope === 'client' && (
                            <div className="col-12">
                                <label className="form-label fw-semibold text-dark small">
                                    <i className="bi bi-buildings me-1 text-muted" />
                                    Pilih Klien
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
                                    }}
                                />
                            </div>
                        )}

                        {/* Peserta Rapat */}
                        {noteType === 'meeting' && (
                            <div className="col-12">
                                <label className="form-label fw-semibold text-dark small">
                                    <i className="bi bi-person-check me-1 text-muted" />
                                    Peserta Rapat Hadir
                                </label>
                                <MeetingAttendeesInput
                                    value={attendeeCodes}
                                    onChange={setAttendeeCodes}
                                />
                                <div className="text-muted mt-1" style={{ fontSize: '11.5px' }}>
                                    Peserta yang ditambahkan otomatis memiliki hak akses membaca (Read-Only).
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Editor Section (Notion Frameless Canvas) */}
                <div className="pt-3 border-top mt-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <label className="form-label fw-semibold text-dark mb-0">
                            Isi {noteType === 'meeting' ? 'Notulen Rapat' : 'Catatan'}
                        </label>
                        <span className="text-muted small">
                            Ketik <kbd style={{ padding: '2px 5px', fontSize: '11px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb', borderRadius: '4px' }}>/</kbd> untuk menu perintah
                        </span>
                    </div>
                    <EditorJsWorkspace
                        data={editorContent}
                        placeholder="Ketik '/' untuk perintah atau mulai menulis..."
                        instanceRef={editorInstanceRef}
                        onChange={setEditorContent}
                    />
                </div>
            </div>
        </div>
    )
}

export default NoteCreatePage
