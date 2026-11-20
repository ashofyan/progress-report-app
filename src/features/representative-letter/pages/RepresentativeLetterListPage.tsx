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

    const [letters, setLetters] =
        useState<RepresentativeLetterListItem[]>([])
    const [meta, setMeta] =
        useState<RepresentativeLetterMeta>(defaultMeta)
    const [spkId, setSpkId] = useState<string>('')
    const [bulan, setBulan] = useState<string>('')
    const [tahun, setTahun] = useState<string>('')
    const [currentPage, setCurrentPage] =
        useState<number>(1)
    const [isLoading, setIsLoading] =
        useState<boolean>(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const [deleteTarget, setDeleteTarget] =
        useState<RepresentativeLetterListItem | null>(null)
    const [isDeleting, setIsDeleting] =
        useState<boolean>(false)
    const [deleteError, setDeleteError] =
        useState<string | null>(null)
    const [exportingId, setExportingId] =
        useState<number | null>(null)

    const filters = useMemo(
        () => ({
            als_spk_id:
                spkId.trim() === ''
                    ? undefined
                    : Number(spkId),
            bulan:
                bulan === '' ? undefined : Number(bulan),
            tahun:
                tahun.trim() === ''
                    ? undefined
                    : Number(tahun),
            page: currentPage,
            per_page: 20,
        }),
        [
            bulan,
            currentPage,
            spkId,
            tahun,
        ],
    )

    const fetchLetters = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setErrorMessage(null)

        const result =
            await representativeLetterApi.getAll(filters)

        if (
            result.success &&
            result.data !== undefined
        ) {
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

    const resetPage = (): void => {
        setCurrentPage(1)
    }

    return (
        <div className="representative-letter-page-shell">
            <div className="representative-letter-heading">
                <div>
                    <h1 className="representative-letter-title">
                        Data Representative Letter (RL)
                    </h1>
                    <p className="representative-letter-subtitle">
                        Kelola dan generate draf surat representasi manajemen
                        dari kumpulan Progress Report yang telah disetujui.
                    </p>
                </div>
            </div>

            <section className="representative-letter-card">
                <div className="representative-letter-filter-row">
                    <div className="row g-2 align-items-end flex-grow-1">
                        <div className="col-12 col-md-3">
                            <label className="form-label text-muted small mb-1">
                                SPK ID
                            </label>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="Filter SPK ID..."
                                value={spkId}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    setSpkId(e.target.value)
                                    resetPage()
                                }}
                            />
                        </div>

                        <div className="col-6 col-md-3">
                            <label className="form-label text-muted small mb-1">
                                Periode Bulan
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={bulan}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                    setBulan(e.target.value)
                                    resetPage()
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

                        <div className="col-6 col-md-3">
                            <label className="form-label text-muted small mb-1">
                                Periode Tahun
                            </label>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="Contoh: 2026"
                                value={tahun}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    setTahun(e.target.value)
                                    resetPage()
                                }}
                            />
                        </div>

                        <div className="col-12 col-md-3">
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm w-100"
                                onClick={() => {
                                    setSpkId('')
                                    setBulan('')
                                    setTahun('')
                                    resetPage()
                                }}
                            >
                                <i className="bi bi-arrow-counterclockwise me-1" />
                                Reset Filter
                            </button>
                        </div>
                    </div>

                    <div className="representative-letter-actions">
                        <button
                            type="button"
                            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                            onClick={() =>
                                navigate('/representative-letter/create')
                            }
                        >
                            <i className="bi bi-plus-lg" />
                            <span>Buat Representative Letter</span>
                        </button>
                    </div>
                </div>

                {isLoading && (
                    <div className="representative-letter-state">
                        <div className="spinner-border" />
                        <span>Memuat data...</span>
                    </div>
                )}

                {!isLoading &&
                    errorMessage !== null && (
                        <div className="representative-letter-error">
                            <div className="alert alert-danger">
                                {errorMessage}
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => void fetchLetters()}
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    letters.length === 0 && (
                        <div className="representative-letter-state">
                            <i className="bi bi-inbox" />
                            <span>
                                Belum ada Representative Letter.
                            </span>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    letters.length > 0 && (
                        <div className="table-responsive">
                            <table className="table representative-letter-table">
                                <thead>
                                <tr>
                                    <th>Nomor RL</th>
                                    <th>No SPK</th>
                                    <th>Client</th>
                                    <th>Pekerjaan</th>
                                    <th>Periode</th>
                                    <th>Total Detail</th>
                                    <th>Dibuat Oleh</th>
                                    <th>Status</th>
                                    <th>Tanggal Dibuat</th>
                                    <th className="text-center">
                                        Action
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {letters.map((letter) => (
                                    <tr key={letter.id}>
                                        <td>
                                            <strong>
                                                {letter.nomor}
                                            </strong>
                                        </td>
                                        <td>
                                            {letter.spk?.no_spk || '-'}
                                        </td>
                                        <td>
                                            {letter.client_name
                                                ? `${letter.client_name}${letter.spk?.client_code ? ` (${letter.spk.client_code})` : ''}`
                                                : (letter.spk?.client_code || '-')}
                                        </td>
                                        <td>
                                            {
                                                letter.job
                                                    .description
                                            }
                                        </td>
                                        <td>
                                            {
                                                letter.periode
                                                    .label
                                            }
                                        </td>
                                        <td>
                                            {letter.total_detail}
                                        </td>
                                        <td>
                                            {letter.created_by_name || letter.created_by}
                                        </td>
                                        <td>
                                            {letter.status === 'final' ? (
                                                <span className="badge bg-success">
                                                    Final
                                                </span>
                                            ) : (
                                                <span className="badge bg-warning text-dark">
                                                    Draft
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {letter.created_at ?? '-'}
                                        </td>
                                        <td>
                                            <div className="representative-letter-row-actions">
                                                <button
                                                    type="button"
                                                    className="representative-letter-action-button text-secondary"
                                                    title="Unduh PDF (Server-side)"
                                                    disabled={exportingId === letter.id}
                                                    onClick={() => void handleExportPdf(letter)}
                                                >
                                                    {exportingId === letter.id ? (
                                                        <span className="spinner-border spinner-border-sm" />
                                                    ) : (
                                                        <i className="bi bi-file-pdf" />
                                                    )}
                                                </button>
                                                {letter.status === 'draft' ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="representative-letter-action-button"
                                                            title="Edit Draf RL"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/representative-letter/${letter.id}`,
                                                                )
                                                            }
                                                        >
                                                            <i className="bi bi-pencil-square" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="representative-letter-action-button text-danger"
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
                                                        className="representative-letter-action-button text-primary"
                                                        title="Lihat Dokumen (Final)"
                                                        onClick={() =>
                                                            navigate(
                                                                `/representative-letter/${letter.id}`,
                                                            )
                                                        }
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
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    letters.length > 0 && (
                        <div className="representative-letter-pagination">
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    setCurrentPage((previous) =>
                                        Math.max(
                                            1,
                                            previous - 1,
                                        ),
                                    )
                                }
                            >
                                <i className="bi bi-caret-left-fill" />
                            </button>
                            <span className="representative-letter-page-info">
                                {meta.current_page} /{' '}
                                {meta.last_page}
                            </span>
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={
                                    currentPage >= meta.last_page
                                }
                                onClick={() =>
                                    setCurrentPage((previous) =>
                                        Math.min(
                                            meta.last_page,
                                            previous + 1,
                                        ),
                                    )
                                }
                            >
                                <i className="bi bi-caret-right-fill" />
                            </button>
                        </div>
                    )}
            </section>

            {deleteTarget && (
                <div
                    className="modal fade show d-block"
                    tabIndex={-1}
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Konfirmasi Hapus RL
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    disabled={isDeleting}
                                    onClick={() => setDeleteTarget(null)}
                                />
                            </div>
                            <div className="modal-body">
                                {deleteError && (
                                    <div className="alert alert-danger py-2">
                                        {deleteError}
                                    </div>
                                )}
                                <p>
                                    Apakah Anda yakin ingin menghapus Representative Letter{' '}
                                    <strong>{deleteTarget.nomor}</strong>?
                                </p>
                                <div className="text-muted small">
                                    Client: {deleteTarget.client_name || deleteTarget.spk?.client_code || '-'} | SPK: {deleteTarget.spk?.no_spk || '-'}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={isDeleting}
                                    onClick={() => setDeleteTarget(null)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    disabled={isDeleting}
                                    onClick={() => void handleDelete()}
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" />
                                            Menghapus...
                                        </>
                                    ) : (
                                        'Ya, Hapus'
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
