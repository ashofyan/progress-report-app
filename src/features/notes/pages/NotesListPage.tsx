import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { Link } from 'react-router-dom'

import { notesApi } from '@/features/notes/api/notesApi'
import NoteCard from '@/features/notes/components/NoteCard'
import NoteShareModal from '@/features/notes/components/NoteShareModal'
import type {
    Note,
    NotePaginationMeta,
    NoteType,
    ShareType,
} from '@/features/notes/types/notes.types'

import '@/features/notes/styles/notes.scss'

export const NotesListPage = () => {
    const [notes, setNotes] = useState<Note[]>([])
    const [pagination, setPagination] = useState<NotePaginationMeta | null>(null)
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

    // Filters
    const [typeFilter, setTypeFilter] = useState<NoteType | 'all'>('all')
    const [shareFilter, setShareFilter] = useState<ShareType | 'all'>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Share Modal state
    const [sharingNote, setSharingNote] = useState<Note | null>(null)

    // New Note Dropdown state
    const [isNewNoteOpen, setIsNewNoteOpen] = useState<boolean>(false)
    const newNoteDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (
                newNoteDropdownRef.current &&
                !newNoteDropdownRef.current.contains(event.target as Node)
            ) {
                setIsNewNoteOpen(false)
            }
        }

        if (isNewNoteOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isNewNoteOpen])

    useEffect(() => {
        let isMounted = true

        void notesApi.getAll(currentPage).then((result) => {
            if (!isMounted) return
            if (result.success && result.data) {
                setNotes(result.data.data)
                setPagination(result.data.meta)
            } else {
                setErrorMessage(result.message || 'Gagal memuat daftar catatan.')
            }
            setIsLoading(false)
        })

        return () => {
            isMounted = false
        }
    }, [currentPage, refreshTrigger])

    const handleRetry = () => {
        setIsLoading(true)
        setErrorMessage(null)
        setRefreshTrigger((prev) => prev + 1)
    }

    const filteredNotes = useMemo(() => {
        return notes.filter((note) => {
            if (typeFilter !== 'all' && note.type !== typeFilter) {
                return false
            }

            if (shareFilter !== 'all' && note.share_type !== shareFilter) {
                return false
            }

            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase()
                const titleMatch = note.title.toLowerCase().includes(q)
                const contentMatch = note.content?.blocks?.some((b) => {
                    const data = b.data as { text?: string }
                    return data.text && String(data.text).toLowerCase().includes(q)
                })

                if (!titleMatch && !contentMatch) {
                    return false
                }
            }

            return true
        })
    }, [notes, typeFilter, shareFilter, searchQuery])

    const handleNoteUpdated = (updatedNote: Note) => {
        setNotes((prev) =>
            prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)),
        )
    }

    return (
        <div className="notes-page">
            {/* Page Heading & Breadcrumb */}
            <div className="notes-heading">
                <h1 className="notes-title">Catatan & Notulen</h1>
                <div className="notes-breadcrumb">
                    <span>Tools</span>
                    <span>/</span>
                    <span className="active">Notes</span>
                </div>
            </div>

            {/* Board Container */}
            <div className="notes-board">
                {/* Board Header & Filter Controls */}
                <div className="notes-board-header">
                    {/* View Tabs */}
                    <div className="notes-filter-tabs">
                        <button
                            type="button"
                            className={`notes-tab-button ${
                                typeFilter === 'all' ? 'active' : ''
                            }`}
                            onClick={() => setTypeFilter('all')}
                        >
                            <i className="bi bi-grid" />
                            <span>Semua</span>
                        </button>
                        <button
                            type="button"
                            className={`notes-tab-button ${
                                typeFilter === 'meeting' ? 'active' : ''
                            }`}
                            onClick={() => setTypeFilter('meeting')}
                        >
                            <i className="bi bi-people" />
                            <span>Notulen Rapat</span>
                        </button>
                        <button
                            type="button"
                            className={`notes-tab-button ${
                                typeFilter === 'standard' ? 'active' : ''
                            }`}
                            onClick={() => setTypeFilter('standard')}
                        >
                            <i className="bi bi-journal-text" />
                            <span>Catatan Standar</span>
                        </button>
                    </div>

                    {/* Actions & Filters */}
                    <div className="notes-header-actions">
                        <select
                            className="form-select form-select-sm notes-filter-select"
                            value={shareFilter}
                            onChange={(e) =>
                                setShareFilter(e.target.value as ShareType | 'all')
                            }
                        >
                            <option value="all">Semua Akses</option>
                            <option value="private">Privat</option>
                            <option value="invited">Diundang</option>
                            <option value="public">Publik</option>
                        </select>

                        <div className="notes-search">
                            <i className="bi bi-search" />
                            <input
                                type="text"
                                placeholder="Cari judul atau isi catatan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div
                            className="dropdown position-relative"
                            ref={newNoteDropdownRef}
                        >
                            <button
                                type="button"
                                className="notes-primary-button dropdown-toggle"
                                onClick={() => setIsNewNoteOpen((prev) => !prev)}
                                aria-expanded={isNewNoteOpen}
                            >
                                <i className="bi bi-plus-lg" />
                                <span>Catatan Baru</span>
                            </button>
                            <ul
                                className={`dropdown-menu dropdown-menu-end shadow-sm ${isNewNoteOpen ? 'show' : ''}`}
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '100%',
                                    marginTop: '6px',
                                    zIndex: 1050,
                                }}
                            >
                                <li>
                                    <Link
                                        to="/notes/tambah?type=standard"
                                        className="dropdown-item d-flex align-items-center gap-2"
                                        onClick={() => setIsNewNoteOpen(false)}
                                    >
                                        <i className="bi bi-journal-text text-secondary" />
                                        <span>Catatan Standar</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/notes/tambah?type=meeting"
                                        className="dropdown-item d-flex align-items-center gap-2"
                                        onClick={() => setIsNewNoteOpen(false)}
                                    >
                                        <i className="bi bi-people text-danger" />
                                        <span>Notulen Rapat</span>
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="alert alert-danger d-flex align-items-center justify-content-between mb-4" role="alert">
                        <div>
                            <i className="bi bi-exclamation-triangle-fill me-2" />
                            {errorMessage}
                        </div>
                        <button
                            type="button"
                            className="notes-secondary-button"
                            onClick={handleRetry}
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="text-center py-5 my-5">
                        <div className="spinner-border" style={{ color: '#e64b38' }} role="status">
                            <span className="visually-hidden">Memuat...</span>
                        </div>
                        <div className="text-muted mt-2 small">Memuat dokumen catatan...</div>
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="text-center py-5 my-4 bg-light rounded-3 p-4 border">
                        <div className="display-6 text-muted mb-3">📋</div>
                        <h4 className="fw-semibold text-dark mb-1">Belum ada catatan</h4>
                        <p className="text-muted small mb-4">
                            {searchQuery || typeFilter !== 'all' || shareFilter !== 'all'
                                ? 'Tidak ada catatan yang cocok dengan kriteria pencarian.'
                                : 'Mulai membuat catatan baru atau notulen rapat bersama tim.'}
                        </p>
                        <div className="d-flex justify-content-center gap-2">
                            <Link
                                to="/notes/tambah?type=standard"
                                className="notes-secondary-button"
                            >
                                <i className="bi bi-journal-text" />
                                <span>Catatan Standar</span>
                            </Link>
                            <Link
                                to="/notes/tambah?type=meeting"
                                className="notes-primary-button"
                            >
                                <i className="bi bi-people" />
                                <span>Notulen Rapat</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Cards Grid */
                    <div className="notes-cards-grid">
                        {filteredNotes.map((note) => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onShareClick={(n) => setSharingNote(n)}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.last_page > 1 && (
                    <div className="d-flex align-items-center justify-content-between mt-auto pt-4 border-top">
                        <span className="small text-muted">
                            Halaman {pagination.current_page} dari {pagination.last_page} (Total {pagination.total} catatan)
                        </span>

                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="notes-secondary-button"
                                disabled={pagination.current_page <= 1 || isLoading}
                                onClick={() =>
                                    setCurrentPage((p) => Math.max(1, p - 1))
                                }
                            >
                                <i className="bi bi-chevron-left" />
                                <span>Sebelumnya</span>
                            </button>
                            <button
                                type="button"
                                className="notes-secondary-button"
                                disabled={
                                    pagination.current_page >= pagination.last_page ||
                                    isLoading
                                }
                                onClick={() =>
                                    setCurrentPage((p) =>
                                        Math.min(pagination.last_page, p + 1),
                                    )
                                }
                            >
                                <span>Selanjutnya</span>
                                <i className="bi bi-chevron-right" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Share Modal Dialog */}
            {sharingNote && (
                <NoteShareModal
                    note={sharingNote}
                    isOpen={true}
                    onClose={() => setSharingNote(null)}
                    onUpdated={handleNoteUpdated}
                />
            )}
        </div>
    )
}

export default NotesListPage
