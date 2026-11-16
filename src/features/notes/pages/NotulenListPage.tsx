import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { notesApi } from '@/features/notes/api/notesApi'
import { useKaryawanSearch } from '@/features/notes/hooks/useKaryawanSearch'
import type {
    MeetingScope,
    Note,
    NotePaginationMeta,
} from '@/features/notes/types/notes.types'
import {
    extractNoteExcerpt,
    formatNoteShortDate,
} from '@/features/notes/utils/noteUtils'

import '@/features/notes/styles/notes.scss'

export const NotulenListPage = () => {
    const { employee } = useAuth()
    const { karyawanList } = useKaryawanSearch()

    const [notes, setNotes] = useState<Note[]>([])
    const [pagination, setPagination] = useState<NotePaginationMeta | null>(null)
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0)

    // View mode: 'grid' (kisi) or 'list' (daftar)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(( ) => {
        const saved = localStorage.getItem('notulen_view_mode')
        return saved === 'list' ? 'list' : 'grid'
    })

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode)
        localStorage.setItem('notulen_view_mode', mode)
    }

    // Search, Scope & Sort filters
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [scopeFilter, setScopeFilter] = useState<MeetingScope | 'all'>('all')
    const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated')

    useEffect(() => {
        let isMounted = true
        setIsLoading(true)

        const fetchNotes = notesApi.getMeetingNotes(currentPage)

        void fetchNotes.then((result) => {
            if (!isMounted) return
            if (result.success && result.data) {
                setNotes(result.data.data)
                setPagination(result.data.meta ?? null)
            } else {
                setErrorMessage(result.message || 'Gagal memuat daftar notulen.')
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

    // Helper untuk mendapatkan nama pemilik/pembuat catatan notulen
    const getAuthorName = useCallback(
        (note: Note): string => {
            if (note.author_employee_name) {
                return note.author_employee_name
            }
            if (
                employee?.employee_code &&
                note.author_employee_code?.toLowerCase() === employee.employee_code.toLowerCase()
            ) {
                return employee.employee_name || 'Saya'
            }
            const matched = karyawanList.find(
                (k) => k.code_employee.toLowerCase() === note.author_employee_code?.toLowerCase(),
            )
            if (matched) {
                return matched.text
            }
            return note.author_employee_code || '-'
        },
        [employee, karyawanList],
    )

    // Helper untuk menghitung jumlah peserta hadir
    const getAttendeeCount = useCallback((note: Note): number => {
        const attendanceList = note.shares?.filter((s) => s.is_attendance) ?? []
        if (attendanceList.length > 0) {
            return attendanceList.length
        }
        return note.shares?.length ?? 0
    }, [])

    // Filter & Sort notes
    const processedNotes = useMemo(() => {
        let result = notes.filter((note) => {
            if (scopeFilter !== 'all') {
                const noteScope = note.meeting_scope || 'umum'
                if (noteScope !== scopeFilter) {
                    return false
                }
            }

            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase()
                const titleMatch = (note.title || '').toLowerCase().includes(q)
                const excerpt = extractNoteExcerpt(note.content).toLowerCase()
                const reportMatch =
                    (note.report_number &&
                        note.report_number.toLowerCase().includes(q)) ||
                    (note.report_no &&
                        note.report_no.toLowerCase().includes(q))
                const author = getAuthorName(note).toLowerCase()
                const authorCodeMatch = (note.author_employee_code || '').toLowerCase().includes(q)

                if (
                    !titleMatch &&
                    !reportMatch &&
                    !excerpt.includes(q) &&
                    !author.includes(q) &&
                    !authorCodeMatch
                ) {
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
    }, [getAuthorName, notes, scopeFilter, searchQuery, sortBy])

    return (
        <div className="notes-library-view">
            {/* Header: Library Title + Tambah Notulen button */}
            <div className="notes-library-header">
                <div>
                    <h1 className="notes-library-title">Library Notulen</h1>
                    <p className="notes-library-subtitle">
                        Kelola, cari, dan temukan semua notulen rapat Anda di satu tempat.
                    </p>
                </div>

                <Link to="/notulen/tambah" className="notes-btn-header-add">
                    <i className="bi bi-plus-lg" />
                    <span>Tambah Notulen</span>
                </Link>
            </div>

            {/* Toolbar: Search + Scope tabs + Sort dropdown + View switcher */}
            <div className="notes-library-toolbar">
                <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '600px' }}>
                    <div className="notes-library-search flex-grow-1">
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            placeholder="Cari judul, nomor, penulis, atau isi notulen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Scope Selector Filter */}
                    <div className="notes-sort-dropdown" style={{ height: '40px' }}>
                        <select
                            value={scopeFilter}
                            onChange={(e) =>
                                setScopeFilter(e.target.value as MeetingScope | 'all')
                            }
                        >
                            <option value="all">Semua Rapat</option>
                            <option value="umum">Internal ALS</option>
                            <option value="client">Klien Eksternal</option>
                        </select>
                        <i className="bi bi-chevron-down" style={{ fontSize: '10px' }} />
                    </div>
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
                    <div className="text-muted mt-2 small">Memuat library notulen...</div>
                </div>
            ) : viewMode === 'grid' ? (
                /* ================= TAMPILAN KISI ================= */
                <div className="notes-library-grid">
                    {/* Dashed Add Card (Notulen Baru) */}
                    <Link to="/notulen/tambah" className="notes-card-new-dashed">
                        <div className="notes-card-new-circle">
                            <i className="bi bi-plus-lg" />
                        </div>
                        <span className="notes-card-new-title">Notulen Baru</span>
                        <span className="notes-card-new-desc">Klik untuk mulai menulis</span>
                    </Link>

                    {/* Notulen Item Cards */}
                    {processedNotes.map((note) => {
                        const excerpt = extractNoteExcerpt(note.content)
                        const reportNumber = note.report_number || note.report_no
                        const authorName = getAuthorName(note)
                        const attendeeCount = getAttendeeCount(note)

                        return (
                            <Link
                                to={`/notulen/${note.id}`}
                                key={note.id}
                                className="notes-library-card"
                            >
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <div className="notes-card-top-icon mb-0">
                                        <i className="bi bi-file-earmark-text" />
                                    </div>
                                    {reportNumber && (
                                        <span
                                            className="badge bg-light text-dark border font-monospace"
                                            style={{ fontSize: '10.5px' }}
                                        >
                                            {reportNumber}
                                        </span>
                                    )}
                                </div>
                                <h3 className="notes-card-item-title">
                                    {note.title || 'Tanpa Judul'}
                                </h3>
                                <p className="notes-card-item-excerpt">{excerpt}</p>

                                {/* Info Pemilik & Peserta Hadir */}
                                <div
                                    className="d-flex align-items-center justify-content-between gap-2 mb-2 pt-2 border-top"
                                    style={{ fontSize: '11.5px' }}
                                >
                                    <span
                                        className="text-muted d-inline-flex align-items-center text-truncate"
                                        style={{ maxWidth: '65%' }}
                                        title={`Pemilik Notulen: ${authorName}`}
                                    >
                                        <i className="bi bi-person me-1 text-muted" />
                                        <span className="text-truncate">{authorName}</span>
                                    </span>
                                    <span
                                        className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center flex-shrink-0"
                                        style={{
                                            fontSize: '10.5px',
                                            padding: '2px 7px',
                                            borderRadius: '5px',
                                            fontWeight: 500,
                                        }}
                                        title={`${attendeeCount} peserta hadir`}
                                    >
                                        <i className="bi bi-people me-1" />
                                        {attendeeCount} hadir
                                    </span>
                                </div>

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
                            {searchQuery || scopeFilter !== 'all'
                                ? 'Tidak ada notulen yang cocok dengan pencarian.'
                                : 'Belum ada notulen rapat. Klik tombol Tambah Notulen untuk memulai.'}
                        </div>
                    ) : (
                        processedNotes.map((note) => {
                            const excerpt = extractNoteExcerpt(note.content)
                            const reportNumber = note.report_number || note.report_no
                            const authorName = getAuthorName(note)
                            const attendeeCount = getAttendeeCount(note)

                            return (
                                <Link
                                    to={`/notulen/${note.id}`}
                                    key={note.id}
                                    className="notes-library-list-row"
                                >
                                    <div className="notes-list-icon">
                                        <i className="bi bi-file-earmark-text" />
                                    </div>
                                    <div className="notes-list-content">
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <h4 className="notes-list-title mb-0">
                                                {note.title || 'Tanpa Judul'}
                                            </h4>
                                            {reportNumber && (
                                                <span
                                                    className="badge bg-light text-dark border font-monospace"
                                                    style={{ fontSize: '10px' }}
                                                >
                                                    {reportNumber}
                                                </span>
                                            )}
                                        </div>
                                        <p className="notes-list-excerpt">{excerpt}</p>
                                        <div
                                            className="d-flex align-items-center gap-2 mt-1 flex-wrap"
                                            style={{ fontSize: '11.5px' }}
                                        >
                                            <span
                                                className="text-muted d-inline-flex align-items-center"
                                                title={`Pemilik Catatan: ${authorName}`}
                                            >
                                                <i className="bi bi-person me-1 text-muted" />
                                                <span className="me-1">Pemilik:</span>
                                                <span className="text-dark fw-medium">{authorName}</span>
                                            </span>
                                            <span className="text-muted">•</span>
                                            <span
                                                className="text-danger fw-medium d-inline-flex align-items-center"
                                                title={`${attendeeCount} peserta hadir`}
                                            >
                                                <i className="bi bi-people me-1" />
                                                {attendeeCount} peserta hadir
                                            </span>
                                        </div>
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
                        Halaman {pagination.current_page ?? currentPage} dari {pagination.last_page ?? 1} ({pagination.total} notulen)
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

export default NotulenListPage
