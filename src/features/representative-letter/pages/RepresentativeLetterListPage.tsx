import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { saveAs } from 'file-saver'

import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    RepresentativeLetterListItem,
    RepresentativeLetterMeta,
} from '@/features/representative-letter/types/representative-letter.types'
import {
    monthOptions,
} from '@/features/representative-letter/utils/documentSettings'

import '@/features/representative-letter/styles/representative-letter.scss'

const defaultMeta: RepresentativeLetterMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
}

const RepresentativeLetterListPage = () => {
    const navigate = useNavigate()

    const [letters, setLetters] = useState<RepresentativeLetterListItem[]>([])
    const [meta, setMeta] = useState<RepresentativeLetterMeta>(defaultMeta)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'final'>('all')
    const [spkId, setSpkId] = useState<string>('')
    const [bulan, setBulan] = useState<string>('')
    const [tahun, setTahun] = useState<string>('')
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const [deleteTarget, setDeleteTarget] = useState<RepresentativeLetterListItem | null>(null)
    const [isDeleting, setIsDeleting] = useState<boolean>(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [exportingId, setExportingId] = useState<number | null>(null)

    const filters = useMemo(
        () => ({
            search: searchQuery.trim() === '' ? undefined : searchQuery.trim(),
            status: statusFilter === 'all' ? undefined : statusFilter,
            als_spk_id: spkId.trim() === '' ? undefined : Number(spkId),
            bulan: bulan === '' ? undefined : Number(bulan),
            tahun: tahun.trim() === '' ? undefined : Number(tahun),
            page: currentPage,
            per_page: 20,
        }),
        [bulan, currentPage, searchQuery, spkId, statusFilter, tahun],
    )

    const fetchLetters = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setErrorMessage(null)

        const result = await representativeLetterApi.getAll(filters)

        if (result.success && result.data !== undefined) {
            setLetters(result.data)
            setMeta(result.meta ?? defaultMeta)
            setIsLoading(false)
            return
        }

        setLetters([])
        setMeta(defaultMeta)
        setErrorMessage(result.message)
        setIsLoading(false)
    }, [filters])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchLetters()
        }, 250)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [fetchLetters])

    // Client-side fallback filter for instant responsiveness
    const displayedLetters = useMemo(() => {
        return letters.filter((letter) => {
            if (statusFilter !== 'all' && letter.status !== statusFilter) {
                return false
            }

            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase()
                const noMatch = (letter.nomor || '').toLowerCase().includes(q)
                const clientMatch = (letter.client_name || '').toLowerCase().includes(q) ||
                    (letter.spk?.client_code || '').toLowerCase().includes(q)
                const spkMatch = (letter.spk?.no_spk || '').toLowerCase().includes(q)
                const jobMatch = (letter.job?.description || '').toLowerCase().includes(q) ||
                    (letter.job?.job_code || '').toLowerCase().includes(q)
                const creatorMatch = (letter.created_by_name || letter.created_by || '').toLowerCase().includes(q)

                if (!noMatch && !clientMatch && !spkMatch && !jobMatch && !creatorMatch) {
                    return false
                }
            }

            return true
        })
    }, [letters, searchQuery, statusFilter])

    // Summary counts
    const draftCount = useMemo(
        () => letters.filter((l) => l.status === 'draft').length,
        [letters],
    )
    const finalCount = useMemo(
        () => letters.filter((l) => l.status === 'final').length,
        [letters],
    )

    const handleExportPdf = async (letter: RepresentativeLetterListItem): Promise<void> => {
        setExportingId(letter.id)
        try {
            const blob = await representativeLetterApi.exportPdf(letter.id)
            const cleanNomor = (letter.nomor || 'Representative-Letter').replace(/[/\\?%*:|"<>]/g, '-')
            saveAs(blob, `${cleanNomor}.pdf`)
        } catch {
            alert('Gagal mengunduh file PDF dari server.')
        } finally {
            setExportingId(null)
        }
    }

    const handleDelete = async (): Promise<void> => {
        if (!deleteTarget) return
        setIsDeleting(true)
        setDeleteError(null)

        const result = await representativeLetterApi.delete(deleteTarget.id)
        if (result.success) {
            setDeleteTarget(null)
            setIsDeleting(false)
            void fetchLetters()
        } else {
            setIsDeleting(false)
            setDeleteError(result.message || 'Gagal menghapus Representative Letter.')
        }
    }

    const resetFilters = (): void => {
        setSearchQuery('')
        setStatusFilter('all')
        setSpkId('')
        setBulan('')
        setTahun('')
        setCurrentPage(1)
    }

    const isFiltered = Boolean(searchQuery || statusFilter !== 'all' || spkId || bulan || tahun)

    return (
        <div className="representative-letter-page-shell">
            {/* Header Area */}
            <div className="representative-letter-heading d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-file-earmark-text-fill text-primary fs-4" />
                        <h1 className="representative-letter-title fs-5 fw-bold mb-0">
                            Data Representative Letter (RL)
                        </h1>
                    </div>
                    <p className="text-muted small mb-0 mt-1">
                        Kelola, telusuri, dan generate draf surat representasi manajemen dari kumpulan Progress Report yang telah disetujui.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                        onClick={() => navigate('/representative-letter/master-layout')}
                    >
                        <i className="bi bi-layout-text-window-reverse" />
                        <span>Master Layout RL</span>
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm"
                        onClick={() => navigate('/representative-letter/create')}
                    >
                        <i className="bi bi-plus-lg" />
                        <span className="fw-semibold">Buat Representative Letter</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="rl-stats-grid">
                <div className="rl-stat-box">
                    <div className="rl-stat-icon-wrapper primary">
                        <i className="bi bi-folder2-open" />
                    </div>
                    <div className="rl-stat-content">
                        <span className="rl-stat-number">{meta.total || letters.length}</span>
                        <span className="rl-stat-label">Total Surat RL</span>
                    </div>
                </div>

                <div className="rl-stat-box">
                    <div className="rl-stat-icon-wrapper warning">
                        <i className="bi bi-pencil-square" />
                    </div>
                    <div className="rl-stat-content">
                        <span className="rl-stat-number">{draftCount}</span>
                        <span className="rl-stat-label">Draf RL (Perlu Diselesaikan)</span>
                    </div>
                </div>

                <div className="rl-stat-box">
                    <div className="rl-stat-icon-wrapper success">
                        <i className="bi bi-check-circle-fill" />
                    </div>
                    <div className="rl-stat-content">
                        <span className="rl-stat-number">{finalCount}</span>
                        <span className="rl-stat-label">Final Dokumen (Siap Unduh)</span>
                    </div>
                </div>
            </div>

            {/* Filter & Search Card */}
            <div className="rl-filter-card">
                <div className="row g-2 align-items-end">
                    {/* Search Input */}
                    <div className="col-12 col-md-4">
                        <label className="form-label text-secondary small fw-semibold mb-1">
                            Pencarian Dokumen
                        </label>
                        <div className="input-group input-group-sm">
                            <span className="input-group-text bg-light border-end-0">
                                <i className="bi bi-search text-muted" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Cari nomor RL, klien, SPK, atau pembuat..."
                                value={searchQuery}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    setSearchQuery(e.target.value)
                                    setCurrentPage(1)
                                }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        setSearchQuery('')
                                        setCurrentPage(1)
                                    }}
                                >
                                    <i className="bi bi-x" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="col-6 col-md-2">
                        <label className="form-label text-secondary small fw-semibold mb-1">
                            Status
                        </label>
                        <select
                            className="form-select form-select-sm"
                            value={statusFilter}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                setStatusFilter(e.target.value as 'all' | 'draft' | 'final')
                                setCurrentPage(1)
                            }}
                        >
                            <option value="all">Semua Status</option>
                            <option value="draft">Draf (Draft)</option>
                            <option value="final">Final</option>
                        </select>
                    </div>

                    {/* Bulan Filter */}
                    <div className="col-6 col-md-2">
                        <label className="form-label text-secondary small fw-semibold mb-1">
                            Bulan
                        </label>
                        <select
                            className="form-select form-select-sm"
                            value={bulan}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                setBulan(e.target.value)
                                setCurrentPage(1)
                            }}
                        >
                            <option value="">Semua Bulan</option>
                            {monthOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tahun Filter */}
                    <div className="col-6 col-md-2">
                        <label className="form-label text-secondary small fw-semibold mb-1">
                            Tahun
                        </label>
                        <input
                            type="number"
                            className="form-control form-control-sm"
                            placeholder="Contoh: 2026"
                            value={tahun}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setTahun(e.target.value)
                                setCurrentPage(1)
                            }}
                        />
                    </div>

                    {/* Reset Button */}
                    <div className="col-6 col-md-2">
                        <button
                            type="button"
                            className={`btn btn-sm w-100 ${isFiltered ? 'btn-outline-danger' : 'btn-outline-secondary'}`}
                            onClick={resetFilters}
                            disabled={!isFiltered}
                        >
                            <i className="bi bi-arrow-counterclockwise me-1" />
                            Reset Filter
                        </button>
                    </div>
                </div>

                {isFiltered && (
                    <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                        <span className="text-muted small" style={{ fontSize: '11.5px' }}>
                            Filter Aktif:
                        </span>
                        {searchQuery && (
                            <span className="badge bg-light text-dark border">
                                Kata Kunci: "{searchQuery}"
                            </span>
                        )}
                        {statusFilter !== 'all' && (
                            <span className="badge bg-light text-dark border">
                                Status: {statusFilter.toUpperCase()}
                            </span>
                        )}
                        {bulan && (
                            <span className="badge bg-light text-dark border">
                                Bulan: {monthOptions.find((m) => m.value === Number(bulan))?.label}
                            </span>
                        )}
                        {tahun && (
                            <span className="badge bg-light text-dark border">
                                Tahun: {tahun}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Data Section */}
            {isLoading && (
                <div className="representative-letter-state p-5 bg-white rounded border shadow-sm">
                    <div className="spinner-border text-primary" role="status" />
                    <span className="text-secondary fw-medium mt-2">Memuat data Representative Letter...</span>
                </div>
            )}

            {!isLoading && errorMessage !== null && (
                <div className="representative-letter-error p-4 bg-white rounded border shadow-sm">
                    <div className="alert alert-danger w-100 mb-3">
                        <i className="bi bi-exclamation-triangle-fill me-2" />
                        {errorMessage}
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => void fetchLetters()}
                    >
                        <i className="bi bi-arrow-clockwise me-1" />
                        Coba Lagi
                    </button>
                </div>
            )}

            {!isLoading && errorMessage === null && displayedLetters.length === 0 && (
                <div className="p-5 text-center bg-white rounded border shadow-sm my-3">
                    <div className="mb-3">
                        <i className="bi bi-file-earmark-x text-muted" style={{ fontSize: '48px' }} />
                    </div>
                    <h5 className="fw-semibold text-dark mb-1">
                        {isFiltered ? 'Tidak ada data RL yang cocok' : 'Belum Ada Representative Letter'}
                    </h5>
                    <p className="text-muted small mb-3" style={{ maxWidth: '440px', margin: '0 auto' }}>
                        {isFiltered
                            ? 'Coba sesuaikan kata kunci pencarian atau reset filter untuk menampilkan seluruh data surat representasi.'
                            : 'Mulai buat draf surat representasi manajemen pertama Anda dari Progress Report klien yang telah disetujui.'}
                    </p>
                    {isFiltered ? (
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={resetFilters}
                        >
                            <i className="bi bi-arrow-counterclockwise me-1" />
                            Reset Filter
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate('/representative-letter/create')}
                        >
                            <i className="bi bi-plus-lg me-1" />
                            Buat Representative Letter Baru
                        </button>
                    )}
                </div>
            )}

            {!isLoading && errorMessage === null && displayedLetters.length > 0 && (
                <div className="rl-table-card">
                    <div className="table-responsive">
                        <table className="table align-middle">
                            <thead>
                                <tr>
                                    <th style={{ width: '180px' }}>Nomor RL</th>
                                    <th>Klien &amp; SPK</th>
                                    <th>Jasa Pekerjaan</th>
                                    <th>Periode</th>
                                    <th className="text-center" style={{ width: '100px' }}>Task</th>
                                    <th>Dibuat Oleh</th>
                                    <th className="text-center" style={{ width: '110px' }}>Status</th>
                                    <th className="text-center" style={{ width: '130px' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedLetters.map((letter) => (
                                    <tr key={letter.id}>
                                        <td>
                                            <div
                                                className="fw-bold text-primary d-flex align-items-center gap-1 cursor-pointer"
                                                role="button"
                                                onClick={() => navigate(`/representative-letter/${letter.id}`)}
                                                title="Buka dokumen RL"
                                            >
                                                <i className="bi bi-file-earmark-text text-primary" />
                                                <span>{letter.nomor}</span>
                                            </div>
                                            {letter.nomor_surat && (
                                                <div className="text-muted small" style={{ fontSize: '11px' }}>
                                                    {letter.nomor_surat}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="fw-semibold text-dark">
                                                {letter.client_name || '-'}
                                                {letter.spk?.client_code && (
                                                    <span className="badge bg-light text-secondary border ms-1 fw-normal" style={{ fontSize: '10px' }}>
                                                        {letter.spk.client_code}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-muted small" style={{ fontSize: '11px' }}>
                                                <i className="bi bi-journal-text me-1" />
                                                {letter.spk?.no_spk || 'Tanpa SPK'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="text-dark small fw-medium">
                                                {letter.job?.description || 'Semua Jasa'}
                                            </div>
                                            {letter.job?.job_code && (
                                                <span className="badge bg-light text-muted border" style={{ fontSize: '10px' }}>
                                                    {letter.job.job_code}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '11.5px' }}>
                                                <i className="bi bi-calendar3 me-1 text-secondary" />
                                                {letter.periode?.label || '-'}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style={{ fontSize: '11px' }}>
                                                {letter.total_detail} Task
                                            </span>
                                        </td>
                                        <td>
                                            <div className="text-dark small fw-medium">
                                                {letter.created_by_name || letter.created_by || '-'}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '11px' }}>
                                                {letter.created_at ?? '-'}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {letter.status === 'final' ? (
                                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1" style={{ fontSize: '11px' }}>
                                                    <i className="bi bi-check-circle-fill me-1" />
                                                    Final
                                                </span>
                                            ) : (
                                                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1" style={{ fontSize: '11px' }}>
                                                    <i className="bi bi-pencil-fill me-1" />
                                                    Draft
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center justify-content-center gap-1">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-light border text-secondary p-1 px-2"
                                                    title="Unduh PDF (Server-side)"
                                                    disabled={exportingId === letter.id}
                                                    onClick={() => void handleExportPdf(letter)}
                                                >
                                                    {exportingId === letter.id ? (
                                                        <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }} />
                                                    ) : (
                                                        <i className="bi bi-file-earmark-pdf text-danger" />
                                                    )}
                                                </button>

                                                {letter.status === 'draft' ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-light border text-primary p-1 px-2"
                                                            title="Edit Draf RL"
                                                            onClick={() => navigate(`/representative-letter/${letter.id}`)}
                                                        >
                                                            <i className="bi bi-pencil-square" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-light border text-danger p-1 px-2"
                                                            title="Hapus Draf RL"
                                                            onClick={() => {
                                                                setDeleteError(null)
                                                                setDeleteTarget(letter)
                                                            }}
                                                        >
                                                            <i className="bi bi-trash" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-light border text-primary p-1 px-2"
                                                        title="Lihat Dokumen (Final)"
                                                        onClick={() => navigate(`/representative-letter/${letter.id}`)}
                                                    >
                                                        <i className="bi bi-eye" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="p-3 bg-light border-top d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <span className="text-muted small">
                            Menampilkan <strong>{displayedLetters.length}</strong> dari <strong>{meta.total}</strong> dokumen
                        </span>

                        <div className="d-flex align-items-center gap-1">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            >
                                <i className="bi bi-chevron-left" />
                            </button>
                            <span className="px-2 small text-secondary fw-semibold">
                                {meta.current_page} / {meta.last_page}
                            </span>
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={currentPage >= meta.last_page}
                                onClick={() => setCurrentPage((prev) => Math.min(meta.last_page, prev + 1))}
                            >
                                <i className="bi bi-chevron-right" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus */}
            {deleteTarget && (
                <div
                    className="modal fade show d-block"
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header border-bottom">
                                <h5 className="modal-title fs-6 fw-bold text-danger d-flex align-items-center gap-2">
                                    <i className="bi bi-exclamation-triangle-fill" />
                                    Konfirmasi Hapus RL
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    disabled={isDeleting}
                                    onClick={() => setDeleteTarget(null)}
                                />
                            </div>
                            <div className="modal-body p-4">
                                {deleteError && (
                                    <div className="alert alert-danger py-2 small mb-3">
                                        {deleteError}
                                    </div>
                                )}
                                <p className="mb-2">
                                    Apakah Anda yakin ingin menghapus Representative Letter{' '}
                                    <strong className="text-dark">{deleteTarget.nomor}</strong>?
                                </p>
                                <div className="p-2 rounded bg-light border text-muted small">
                                    <div><strong>Klien:</strong> {deleteTarget.client_name || deleteTarget.spk?.client_code || '-'}</div>
                                    <div><strong>SPK:</strong> {deleteTarget.spk?.no_spk || '-'}</div>
                                    <div><strong>Periode:</strong> {deleteTarget.periode?.label || '-'}</div>
                                </div>
                                <div className="text-danger small mt-2">
                                    * Tindakan ini tidak dapat dibatalkan. Snapshot draf surat akan dihapus secara permanen.
                                </div>
                            </div>
                            <div className="modal-footer border-top bg-light">
                                <button
                                    type="button"
                                    className="btn btn-light btn-sm"
                                    disabled={isDeleting}
                                    onClick={() => setDeleteTarget(null)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm px-3"
                                    disabled={isDeleting}
                                    onClick={() => void handleDelete()}
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" />
                                            Menghapus...
                                        </>
                                    ) : (
                                        'Ya, Hapus Dokumen'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RepresentativeLetterListPage

