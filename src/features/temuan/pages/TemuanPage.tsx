import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import { useAuth } from '@/features/auth/hooks/useAuth'
import SolusiCreateModal from '@/features/solusi/components/SolusiCreateModal'
import SolusiDetailModal from '@/features/solusi/components/SolusiDetailModal'
import { useSolusis } from '@/features/solusi/hooks/useSolusis'
import type { Solusi } from '@/features/solusi/types/solusi.types'
import TemuanDeleteModal from '@/features/temuan/components/TemuanDeleteModal'
import TemuanDetailModal from '@/features/temuan/components/TemuanDetailModal'
import { useTemuans } from '@/features/temuan/hooks/useTemuans'
import {
    getTemuanPriority,
    TEMUAN_PRIORITY_LABELS,
    type Temuan,
    type TemuanFilters,
    type TemuanStatus,
    type TemuanType,
} from '@/features/temuan/types/temuan.types'

import '@/features/temuan/styles/temuan.scss'

const ITEMS_PER_PAGE = 10

const statusLabels: Record<TemuanStatus, string> = {
    open: 'Open',
    pending: 'Pending',
    selesai: 'Selesai',
}

const priorityLabels = TEMUAN_PRIORITY_LABELS

const getNotesText = (temuan: Temuan): string => {
    const notes = temuan.notes
        .map((note) => note.note.trim())
        .filter((note) => note !== '')

    if (notes.length === 0) {
        return '-'
    }

    return notes.join(', ')
}

const TemuanPage = () => {
    const navigate = useNavigate()
    const { employee: authEmployee } = useAuth()

    const {
        temuans,
        isLoading: isLoadingTemuans,
        errorMessage: temuanErrorMessage,
        fetchTemuans,
        deleteTemuan,
    } = useTemuans()

    const {
        solusis,
        isLoading: isLoadingSolusis,
        fetchSolusis,
    } = useSolusis()

    const [clientCode, setClientCode] = useState<string>('')
    const [tanggal, setTanggal] = useState<string>('')
    const [status, setStatus] = useState<TemuanStatus | ''>('')
    const [typeFilter, setTypeFilter] = useState<TemuanType | ''>('')
    const [priorityFilter, setPriorityFilter] = useState<number | ''>('')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [currentPage, setCurrentPage] = useState<number>(1)

    // Modals
    const [temuanToView, setTemuanToView] = useState<Temuan | null>(null)
    const [temuanToDelete, setTemuanToDelete] = useState<Temuan | null>(null)
    const [solusiToView, setSolusiToView] = useState<Solusi | null>(null)
    const [solusiCreateTemuan, setSolusiCreateTemuan] = useState<Temuan | null>(
        null,
    )
    const [solusiCreateNoteId, setSolusiCreateNoteId] = useState<number | null>(
        null,
    )
    const [isSolusiCreateOpen, setIsSolusiCreateOpen] = useState<boolean>(false)
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const filters = useMemo<TemuanFilters>(
        () => ({
            client_code:
                clientCode.trim() === '' ? undefined : clientCode.trim(),
            tanggal: tanggal === '' ? undefined : tanggal,
            status: status === '' ? undefined : status,
            type: typeFilter === '' ? undefined : typeFilter,
            priority: priorityFilter === '' ? undefined : Number(priorityFilter),
        }),
        [clientCode, priorityFilter, status, tanggal, typeFilter],
    )

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchTemuans(filters)
            void fetchSolusis({
                client_code: filters.client_code,
            })
        }, 250)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [fetchTemuans, fetchSolusis, filters])

    // Map solusis by note ID for instant lookups
    const solusisByNoteId = useMemo(() => {
        const map = new Map<number, Solusi>()
        solusis.forEach((item) => {
            map.set(item.note.id, item)
        })
        return map
    }, [solusis])

    // Map solusis by temuan ID
    const solusisByTemuanId = useMemo(() => {
        const map = new Map<number, Solusi[]>()
        solusis.forEach((item) => {
            const list = map.get(item.temuan.id) ?? []
            list.push(item)
            map.set(item.temuan.id, list)
        })
        return map
    }, [solusis])

    const handleOpenSolusiCreate = (
        temuan: Temuan,
        noteId: number | null = null,
    ): void => {
        setSolusiCreateTemuan(temuan)
        setSolusiCreateNoteId(noteId)
        setIsSolusiCreateOpen(true)
    }

    const handleSolusiCreateSuccess = (): void => {
        setFeedbackMessage('Solusi berhasil ditambahkan!')
        void fetchTemuans(filters)
        void fetchSolusis({
            client_code: filters.client_code,
        })
        setTimeout(() => {
            setFeedbackMessage(null)
        }, 4000)
    }

    const filteredTemuans = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()

        if (query === '') {
            return temuans
        }

        return temuans.filter((temuan) => {
            const temuanSolusis = solusisByTemuanId.get(temuan.id) ?? []
            const solusisText = temuanSolusis
                .map((s) => s.solution)
                .join(' ')
                .toLowerCase()

            return (
                temuan.nomor.toLowerCase().includes(query) ||
                temuan.client_code.toLowerCase().includes(query) ||
                (temuan.spk?.no_spk ?? '').toLowerCase().includes(query) ||
                (temuan.job?.description ?? '').toLowerCase().includes(query) ||
                getNotesText(temuan).toLowerCase().includes(query) ||
                solusisText.includes(query)
            )
        })
    }, [searchQuery, temuans, solusisByTemuanId])

    const totalPages = Math.max(
        1,
        Math.ceil(filteredTemuans.length / ITEMS_PER_PAGE),
    )

    const paginatedTemuans = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return filteredTemuans.slice(start, start + ITEMS_PER_PAGE)
    }, [currentPage, filteredTemuans])

    const handleFilterChange = (): void => {
        setCurrentPage(1)
    }

    const isLoading = isLoadingTemuans || isLoadingSolusis
    const errorMessage = temuanErrorMessage

    return (
        <div className="temuan-page">
            <div className="temuan-heading">
                <h1 className="temuan-title">Temuan &amp; Solusi</h1>

                <div className="temuan-breadcrumb">
                    <span className="active">Progress</span>
                    <span>/</span>
                    <span>Temuan &amp; Solusi</span>
                </div>
            </div>

            {feedbackMessage !== null && (
                <div
                    className="alert alert-success alert-dismissible fade show"
                    role="alert"
                >
                    <i className="bi bi-check-circle-fill me-2" />
                    {feedbackMessage}
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setFeedbackMessage(null)}
                    />
                </div>
            )}

            <section className="temuan-board">
                <div className="temuan-board-header">
                    <div className="temuan-search">
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Cari temuan atau solusi..."
                            onChange={(event) => {
                                setSearchQuery(event.target.value)
                                setCurrentPage(1)
                            }}
                        />
                    </div>

                    <div className="temuan-actions">
                        <button
                            type="button"
                            className="temuan-add-button secondary"
                            title="Buka form solusi mandiri"
                            onClick={() => navigate('/solusi/tambah')}
                        >
                            <i className="bi bi-plus-circle" />
                            <span>Tambah Solusi</span>
                        </button>

                        <button
                            type="button"
                            className="temuan-add-button"
                            onClick={() => navigate('/temuan/tambah')}
                        >
                            <i className="bi bi-plus-lg" />
                            <span>Tambah Temuan</span>
                        </button>
                    </div>
                </div>

                <div className="temuan-filter-toolbar">
                    <div className="filter-client">
                        <ClientSelect
                            clients={clients}
                            selectedCode={clientCode}
                            isLoading={isLoadingClients}
                            errorMessage={clientErrorMessage}
                            onSearch={handleClientSearch}
                            onSelect={(client) => {
                                setClientCode(client.customer_code)
                                handleFilterChange()
                            }}
                        />
                    </div>

                    <input
                        type="date"
                        className="form-control filter-date"
                        value={tanggal}
                        onChange={(
                            event: ChangeEvent<HTMLInputElement>,
                        ) => {
                            setTanggal(event.target.value)
                            handleFilterChange()
                        }}
                    />

                    <select
                        className="form-select filter-select"
                        value={status}
                        onChange={(
                            event: ChangeEvent<HTMLSelectElement>,
                        ) => {
                            setStatus(
                                event.target.value as TemuanStatus | '',
                            )
                            handleFilterChange()
                        }}
                    >
                        <option value="">Semua status</option>
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="selesai">Selesai</option>
                    </select>

                    <select
                        className="form-select filter-select"
                        value={typeFilter}
                        onChange={(
                            event: ChangeEvent<HTMLSelectElement>,
                        ) => {
                            setTypeFilter(
                                event.target.value as TemuanType | '',
                            )
                            handleFilterChange()
                        }}
                    >
                        <option value="">Semua tipe</option>
                        <option value="TM">TM (Global)</option>
                        <option value="PR">PR (Progress Report)</option>
                    </select>

                    <select
                        className="form-select filter-select"
                        value={priorityFilter}
                        onChange={(
                            event: ChangeEvent<HTMLSelectElement>,
                        ) => {
                            setPriorityFilter(
                                event.target.value === ''
                                    ? ''
                                    : Number(event.target.value),
                            )
                            handleFilterChange()
                        }}
                    >
                        <option value="">Semua prioritas</option>
                        <option value="1">P1 - Sangat Rendah</option>
                        <option value="2">P2 - Rendah</option>
                        <option value="3">P3 - Sedang / Normal</option>
                        <option value="4">P4 - Tinggi</option>
                        <option value="5">P5 - Urgent</option>
                    </select>

                    <button
                        type="button"
                        className="filter-reset-btn"
                        onClick={() => {
                            setClientCode('')
                            setTanggal('')
                            setStatus('')
                            setTypeFilter('')
                            setPriorityFilter('')
                            setSearchQuery('')
                            setCurrentPage(1)
                        }}
                    >
                        <i className="bi bi-arrow-counterclockwise" />
                        Reset
                    </button>
                </div>

                {isLoading && (
                    <div className="temuan-loading">
                        <div className="spinner-border" />
                        <span>Memuat data Temuan &amp; Solusi...</span>
                    </div>
                )}

                {!isLoading && errorMessage !== null && (
                    <div className="temuan-error">
                        <div className="alert alert-danger" role="alert">
                            {errorMessage}
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => {
                                void fetchTemuans(filters)
                                void fetchSolusis({
                                    client_code: filters.client_code,
                                })
                            }}
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {!isLoading &&
                    errorMessage === null &&
                    filteredTemuans.length === 0 && (
                        <div className="temuan-empty">
                            <i className="bi bi-inbox" />
                            <span>Belum ada data temuan.</span>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    filteredTemuans.length > 0 && (
                        <div className="table-responsive">
                            <table className="table temuan-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '48px' }}>No</th>
                                        <th>Temuan</th>
                                        <th style={{ width: '115px' }}>Tanggal</th>
                                        <th>Client &amp; Pekerjaan</th>
                                        <th>Catatan &amp; File</th>
                                        <th style={{ width: '150px' }}>Status &amp; Solusi</th>
                                        <th className="text-center" style={{ width: '100px' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTemuans.map((temuan, index) => {
                                        const solvedNotesCount =
                                            temuan.notes.filter((note) =>
                                                solusisByNoteId.has(note.id),
                                            ).length
                                        const totalNotesCount =
                                            temuan.notes.length
                                        const isAllSolved =
                                            totalNotesCount > 0 &&
                                            solvedNotesCount >= totalNotesCount
                                        const displayPriority =
                                            getTemuanPriority(temuan)
                                        const isCreator =
                                            !authEmployee?.employee_code ||
                                            !temuan.created_by ||
                                            authEmployee.employee_code ===
                                                temuan.created_by
                                        const canEditOrDelete =
                                            temuan.status !== 'selesai' &&
                                            isCreator

                                        return (
                                            <tr
                                                key={temuan.id}
                                                className="temuan-clickable-row"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setTemuanToView(temuan)}
                                            >
                                                <td className="text-muted">
                                                    {(currentPage - 1) *
                                                        ITEMS_PER_PAGE +
                                                        index +
                                                        1}
                                                </td>

                                                <td>
                                                    <div className="temuan-id-cell">
                                                        <button
                                                            type="button"
                                                            className="temuan-nomor-btn"
                                                            title="Klik untuk melihat detail temuan"
                                                            onClick={() => setTemuanToView(temuan)}
                                                        >
                                                            {temuan.nomor}
                                                        </button>
                                                        <div className="temuan-meta-tags">
                                                            <span
                                                                className={`temuan-type-badge ${
                                                                    temuan.type === 'PR'
                                                                        ? 'type-pr'
                                                                        : 'type-tm'
                                                                }`}
                                                            >
                                                                {temuan.type ?? 'TM'}
                                                            </span>
                                                            {temuan.no_pr && (
                                                                <span className="temuan-pr-tag">
                                                                    {temuan.no_pr}
                                                                </span>
                                                            )}
                                                            <span
                                                                className={`temuan-priority-badge p${displayPriority}`}
                                                                title={priorityLabels[displayPriority] ?? `P${displayPriority}`}
                                                            >
                                                                P{displayPriority}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    <span className="temuan-date-text">
                                                        {temuan.tanggal}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="temuan-client-cell">
                                                        <div className="d-flex align-items-center gap-1 flex-wrap">
                                                            <span className="temuan-client-badge">
                                                                <i className="bi bi-buildings" />
                                                                {temuan.client_code}
                                                            </span>
                                                            {temuan.spk?.no_spk && (
                                                                <span
                                                                    className="temuan-spk-tag"
                                                                    title={`No SPK: ${temuan.spk.no_spk}`}
                                                                >
                                                                    <i className="bi bi-file-earmark-text me-1" />
                                                                    {temuan.spk.no_spk}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {temuan.job?.description && (
                                                            <span
                                                                className="temuan-job-subtext"
                                                                title={temuan.job.description}
                                                            >
                                                                {temuan.job.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="temuan-note-cell">
                                                        <span
                                                            className="temuan-note-preview"
                                                            title={getNotesText(temuan)}
                                                        >
                                                            {getNotesText(temuan)}
                                                        </span>
                                                        {temuan.files.length > 0 && (
                                                            <span
                                                                className="temuan-file-pill"
                                                                title={`${temuan.files.length} file lampiran`}
                                                            >
                                                                <i className="bi bi-paperclip" />
                                                                {temuan.files.length} file
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td>
                                                    <div className="temuan-status-cell">
                                                        <span
                                                            className={`temuan-status ${temuan.status}`}
                                                        >
                                                            {
                                                                statusLabels[
                                                                    temuan.status
                                                                ]
                                                            }
                                                        </span>
                                                        <span
                                                            className={`temuan-solusi-progress ${
                                                                isAllSolved
                                                                    ? 'solved'
                                                                    : solvedNotesCount > 0
                                                                    ? 'partial'
                                                                    : 'empty'
                                                            }`}
                                                            title={`${solvedNotesCount} dari ${totalNotesCount} catatan memiliki solusi`}
                                                        >
                                                            <i
                                                                className={`bi ${
                                                                    isAllSolved
                                                                        ? 'bi-check-all'
                                                                        : 'bi-check2'
                                                                }`}
                                                            />
                                                            {solvedNotesCount} / {totalNotesCount} Solusi
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                    <div className="d-flex align-items-center justify-content-center gap-1">
                                                        {temuan.status !== 'selesai' && !isAllSolved && (
                                                            <button
                                                                type="button"
                                                                className="temuan-action-button solusi"
                                                                title="Beri Solusi"
                                                                aria-label="Beri Solusi"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleOpenSolusiCreate(temuan)
                                                                }}
                                                            >
                                                                <i className="bi bi-check2-circle" />
                                                            </button>
                                                        )}
                                                        {canEditOrDelete && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="temuan-action-button edit"
                                                                    title="Edit Temuan"
                                                                    aria-label="Edit Temuan"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        navigate(`/temuan/${temuan.id}/edit`)
                                                                    }}
                                                                >
                                                                    <i className="bi bi-pencil-square" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="temuan-action-button delete"
                                                                    title="Hapus Temuan"
                                                                    aria-label="Hapus Temuan"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setTemuanToDelete(temuan)
                                                                    }}
                                                                >
                                                                    <i className="bi bi-trash3" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    filteredTemuans.length > 0 && (
                        <div className="temuan-pagination">
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={currentPage <= 1}
                                onClick={() => {
                                    setCurrentPage((previous) =>
                                        Math.max(1, previous - 1),
                                    )
                                }}
                            >
                                <i className="bi bi-caret-left-fill" />
                            </button>
                            <span className="temuan-page-info">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={currentPage >= totalPages}
                                onClick={() => {
                                    setCurrentPage((previous) =>
                                        Math.min(totalPages, previous + 1),
                                    )
                                }}
                            >
                                <i className="bi bi-caret-right-fill" />
                            </button>
                        </div>
                    )}
            </section>

            <TemuanDetailModal
                temuan={temuanToView}
                onClose={() => setTemuanToView(null)}
            />

            <TemuanDeleteModal
                temuan={temuanToDelete}
                onClose={() => setTemuanToDelete(null)}
                onDelete={deleteTemuan}
            />

            <SolusiDetailModal
                solusi={solusiToView}
                onClose={() => {
                    setSolusiToView(null)
                    // Refetch in case user deleted or uploaded files
                    void fetchSolusis({
                        client_code: filters.client_code,
                    })
                }}
            />

            <SolusiCreateModal
                isOpen={isSolusiCreateOpen}
                temuan={solusiCreateTemuan}
                initialNoteId={solusiCreateNoteId}
                solvedNoteIds={Array.from(solusisByNoteId.keys())}
                onClose={() => {
                    setIsSolusiCreateOpen(false)
                    setSolusiCreateTemuan(null)
                    setSolusiCreateNoteId(null)
                }}
                onSuccess={handleSolusiCreateSuccess}
            />
        </div>
    )
}

export default TemuanPage
