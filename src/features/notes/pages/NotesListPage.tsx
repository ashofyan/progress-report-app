import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import { Link } from 'react-router-dom'

import { notesApi } from '@/features/notes/api/notesApi'
import type {
    Note,
    NotePaginationMeta,
} from '@/features/notes/types/notes.types'
import {
    extractNoteExcerpt,
    formatNoteShortDate,
} from '@/features/notes/utils/noteUtils'

import '@/features/notes/styles/notes.scss'

export const NotesListPage = () => {
    const [notes, setNotes] = useState<Note[]>([])
    const [pagination, setPagination] = useState<NotePaginationMeta | null>(null)
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

    // View mode: 'grid' (kisi) or 'list' (daftar)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const saved = localStorage.getItem('notes_view_mode')
        return saved === 'list' ? 'list' : 'grid'
    })

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode)
        localStorage.setItem('notes_view_mode', mode)
    }

    // Search & Sort filters
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated')

    useEffect(() => {
        let isMounted = true
        setIsLoading(true)

        const fetchNotes = notesApi.getStandardNotes(currentPage)

        void fetchNotes.then((result) => {
            if (!isMounted) return
            if (result.success && result.data) {
                setNotes(result.data.data)
                setPagination(result.data.meta ?? null)
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

    // Filter & Sort notes
    const processedNotes = useMemo(() => {
        let result = notes.filter((note) => {
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase()
                const titleMatch = (note.title || '').toLowerCase().includes(q)
                const excerpt = extractNoteExcerpt(note.content).toLowerCase()
                if (!titleMatch && !excerpt.includes(q)) {
                    return false
                }
            }
            return true
        })

        result = [...result].sort((a, b) => {
            if (sortBy === 'title') {
                return (a.title || '').localeCompare(b.title || '')
            }
            if (sortBy === 'created') {
                const timeA = new Date(a.created_at || '').getTime()
                const timeB = new Date(b.created_at || '').getTime()
                return timeB - timeA
            }
            // default: 'updated'
            const timeA = new Date(a.updated_at || a.created_at || '').getTime()
            const timeB = new Date(b.updated_at || b.created_at || '').getTime()
            return timeB - timeA
        })

        return result
    }, [notes, searchQuery, sortBy])

    return (
        <div className="notes-library-view">
            {/* Header: Library Title + Tambah Notes button */}
            <div className="notes-library-header">
                <div>
                    <h1 className="notes-library-title">Library Catatan</h1>
                    <p className="notes-library-subtitle">
                        Kelola, cari, dan temukan semua ide dan catatan Anda di satu tempat.
                    </p>
                </div>

                <Link to="/notes/tambah" className="notes-btn-header-add">
                    <i className="bi bi-plus-lg" />
                    <span>Tambah Notes</span>
                </Link>
            </div>

            {/* Toolbar: Search + Sort dropdown + View switcher */}
            <div className="notes-library-toolbar">
                <div className="notes-library-search">
                    <i className="bi bi-search" />
                    <input
                        type="text"
                        placeholder="Cari judul atau isi catatan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="notes-library-controls">
                    {/* Sort Dropdown */}
                    <div className="notes-sort-dropdown">
                        <i className="bi bi-filter-left" />
                        <select
                            value={sortBy}
                            onChange={(e) =>
                                setSortBy(e.target.value as 'updated' | 'created' | 'title')
                            }
                        >
                            <option value="updated">Terakhir Diubah</option>
                            <option value="created">Terbaru Dibuat</option>
                            <option value="title">Judul (A-Z)</option>
                        </select>
                        <i className="bi bi-chevron-down" style={{ fontSize: '10px' }} />
                    </div>

                    {/* View Switcher Toggle (Kisi vs Daftar) */}
                    <div className="notes-view-switcher">
                        <button
                            type="button"
                            className={`notes-view-switcher-btn ${
                                viewMode === 'grid' ? 'active' : ''
                            }`}
                            onClick={() => handleViewModeChange('grid')}
                            title="Tampilan Kisi"
                        >
                            <i className="bi bi-grid-fill" />
                        </button>
                        <button
                            type="button"
                            className={`notes-view-switcher-btn ${
                                viewMode === 'list' ? 'active' : ''
                            }`}
                            onClick={() => handleViewModeChange('list')}
                            title="Tampilan Daftar"
                        >
                            <i className="bi bi-list-ul" />
                        </button>
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
                        className="btn btn-sm btn-outline-danger"
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
                    <div className="text-muted mt-2 small">Memuat library catatan...</div>
                </div>
            ) : viewMode === 'grid' ? (
                /* ================= TAMPILAN KISI ================= */
                <div className="notes-library-grid">
                    {/* Dashed Add Card (Catatan Baru) */}
                    <Link to="/notes/tambah" className="notes-card-new-dashed">
                        <div className="notes-card-new-circle">
                            <i className="bi bi-plus-lg" />
                        </div>
                        <span className="notes-card-new-title">Catatan Baru</span>
                        <span className="notes-card-new-desc">Klik untuk mulai menulis</span>
                    </Link>

                    {/* Notes Item Cards */}
                    {processedNotes.map((note) => {
                        const excerpt = extractNoteExcerpt(note.content)
                        return (
                            <Link
                                to={`/notes/${note.id}`}
                                key={note.id}
                                className="notes-library-card"
                            >
                                <div className="notes-card-top-icon">
                                    <i className="bi bi-file-earmark-text" />
                                </div>
                                <h3 className="notes-card-item-title">
                                    {note.title || 'Tanpa Judul'}
                                </h3>
                                <p className="notes-card-item-excerpt">{excerpt}</p>
                                <div className="notes-card-item-footer">
                                    <span className="notes-card-item-date">
                                        <i className="bi bi-calendar3" />
                                        {formatNoteShortDate(note.updated_at || note.created_at)}
                                    </span>
                                    <i className="bi bi-chevron-right notes-card-item-arrow" />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            ) : (
                /* ================= TAMPILAN DAFTAR ================= */
                <div className="notes-library-list-container">
                    {processedNotes.length === 0 ? (
                        <div className="text-center py-5 text-muted small">
                            {searchQuery
                                ? 'Tidak ada catatan yang cocok dengan pencarian.'
                                : 'Belum ada catatan. Klik tombol Tambah Notes untuk memulai.'}
                        </div>
                    ) : (
                        processedNotes.map((note) => {
                            const excerpt = extractNoteExcerpt(note.content)
                            return (
                                <Link
                                    to={`/notes/${note.id}`}
                                    key={note.id}
                                    className="notes-library-list-row"
                                >
                                    <div className="notes-list-icon">
                                        <i className="bi bi-file-earmark-text" />
                                    </div>
                                    <div className="notes-list-content">
                                        <h4 className="notes-list-title">
                                            {note.title || 'Tanpa Judul'}
                                        </h4>
                                        <p className="notes-list-excerpt">{excerpt}</p>
                                    </div>
                                    <div className="notes-list-meta">
                                        <span className="notes-list-date">
                                            {formatNoteShortDate(note.updated_at || note.created_at)}
                                        </span>
                                        <i className="bi bi-chevron-right notes-list-arrow" />
                                    </div>
                                </Link>
                            )
                        })
                    )}
                </div>
            )}

            {/* Pagination jika lebih dari 1 halaman */}
            {pagination && (pagination.last_page ?? 1) > 1 && (
                <div className="d-flex align-items-center justify-content-between pt-4 mt-3">
                    <span className="small text-muted">
                        Halaman {pagination.current_page ?? currentPage} dari {pagination.last_page ?? 1} ({pagination.total} catatan)
                    </span>

                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="notes-pagination-btn"
                            disabled={(pagination.current_page ?? currentPage) <= 1 || isLoading}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                            <i className="bi bi-chevron-left" />
                            <span>Sebelumnya</span>
                        </button>
                        <button
                            type="button"
                            className="notes-pagination-btn"
                            disabled={
                                (pagination.current_page ?? currentPage) >= (pagination.last_page ?? 1) ||
                                isLoading
                            }
                            onClick={() =>
                                setCurrentPage((p) =>
                                    Math.min(pagination.last_page ?? 1, p + 1),
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
    )
}

export default NotesListPage
