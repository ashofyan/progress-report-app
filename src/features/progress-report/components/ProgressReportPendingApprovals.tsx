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
import { getPeriodeLabel } from '@/features/daily-progress/utils/dailyProgressPeriod'
import { progressReportApi } from '@/features/progress-report/api/progressReportApi'
import type {
    ProgressReportMeta,
    ProgressReportPendingApprovalsFilters,
    ProgressReportSummary,
} from '@/features/progress-report/types/progress-report.types'

const defaultMeta: ProgressReportMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
}

interface ProgressReportPendingApprovalsProps {
    onApproved?: () => void
}

export const ProgressReportPendingApprovals = ({
    onApproved,
}: ProgressReportPendingApprovalsProps) => {
    const navigate = useNavigate()

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const [reports, setReports] = useState<ProgressReportSummary[]>([])
    const [meta, setMeta] = useState<ProgressReportMeta>(defaultMeta)
    const [clientFilter, setClientFilter] = useState<string>('')
    const [bulanFilter, setBulanFilter] = useState<number | ''>('')
    const [tahunFilter, setTahunFilter] = useState<number | ''>('')
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [approvingId, setApprovingId] = useState<number | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const filters: ProgressReportPendingApprovalsFilters = useMemo(
        () => ({
            client_code: clientFilter.trim() !== '' ? clientFilter.trim() : undefined,
            bulan: bulanFilter !== '' ? Number(bulanFilter) : undefined,
            tahun: tahunFilter !== '' ? Number(tahunFilter) : undefined,
            search: searchQuery.trim() === '' ? undefined : searchQuery.trim(),
            page: currentPage,
            per_page: 20,
        }),
        [clientFilter, bulanFilter, tahunFilter, currentPage, searchQuery],
    )

    const fetchPendingApprovals = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setErrorMessage(null)

        const result = await progressReportApi.getPendingApprovals(filters)

        if (result.success && result.data !== undefined) {
            setReports(result.data)
            setMeta(result.meta ?? defaultMeta)
            setIsLoading(false)
            return
        }

        setReports([])
        setMeta(defaultMeta)
        setErrorMessage(result.message)
        setIsLoading(false)
    }, [filters])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchPendingApprovals()
        }, 200)

        return () => window.clearTimeout(timeoutId)
    }, [fetchPendingApprovals])

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setSearchQuery(event.target.value)
        setCurrentPage(1)
    }

    const handleApprove = async (report: ProgressReportSummary): Promise<void> => {
        if (
            !window.confirm(
                `Apakah Anda yakin ingin menyetujui Progress Report ${report.nomor}?`,
            )
        ) {
            return
        }

        setApprovingId(report.id)
        const result = await progressReportApi.approve(report.id)
        setApprovingId(null)

        if (result.success) {
            setSuccessMessage(`Progress Report ${report.nomor} berhasil disetujui.`)
            setTimeout(() => setSuccessMessage(null), 4000)
            void fetchPendingApprovals()
            onApproved?.()
        } else {
            alert(result.message || 'Gagal menyetujui Progress Report.')
        }
    }

    return (
        <section className="progress-report-board">
            {/* Header Filters */}
            <div className="progress-report-board-header flex-wrap mb-3">
                <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
                    <div className="progress-report-search">
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Cari PR / SPK..."
                            onChange={handleSearchChange}
                        />
                    </div>

                    <div style={{ width: '180px' }}>
                        <ClientSelect
                            clients={clients}
                            selectedCode={clientFilter}
                            isLoading={isLoadingClients}
                            errorMessage={clientErrorMessage}
                            onSearch={(query) => {
                                void searchClients(query)
                            }}
                            onSelect={(client) => {
                                setClientFilter(client.customer_code)
                                setCurrentPage(1)
                            }}
                        />
                    </div>

                    <select
                        className="form-select form-select-sm"
                        style={{ width: '130px', height: '36px' }}
                        value={bulanFilter}
                        onChange={(e) => {
                            setBulanFilter(
                                e.target.value ? Number(e.target.value) : '',
                            )
                            setCurrentPage(1)
                        }}
                    >
                        <option value="">Semua Bulan</option>
                        <option value={1}>Januari</option>
                        <option value={2}>Februari</option>
                        <option value={3}>Maret</option>
                        <option value={4}>April</option>
                        <option value={5}>Mei</option>
                        <option value={6}>Juni</option>
                        <option value={7}>Juli</option>
                        <option value={8}>Agustus</option>
                        <option value={9}>September</option>
                        <option value={10}>Oktober</option>
                        <option value={11}>November</option>
                        <option value={12}>Desember</option>
                    </select>

                    <input
                        type="number"
                        min={2000}
                        max={2100}
                        placeholder="Tahun"
                        className="form-control form-control-sm"
                        style={{ width: '90px', height: '36px' }}
                        value={tahunFilter}
                        onChange={(e) => {
                            setTahunFilter(
                                e.target.value ? Number(e.target.value) : '',
                            )
                            setCurrentPage(1)
                        }}
                    />

                    {(clientFilter !== '' ||
                        bulanFilter !== '' ||
                        tahunFilter !== '' ||
                        searchQuery !== '') && (
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            style={{ height: '36px' }}
                            title="Reset Filter"
                            onClick={() => {
                                setClientFilter('')
                                setBulanFilter('')
                                setTahunFilter('')
                                setSearchQuery('')
                                setCurrentPage(1)
                            }}
                        >
                            <i className="bi bi-x-circle me-1" />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Success Alert */}
            {successMessage && (
                <div className="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2 py-2 px-3 mb-3">
                    <i className="bi bi-check-circle-fill text-success" />
                    <span>{successMessage}</span>
                    <button
                        type="button"
                        className="btn-close ms-auto"
                        onClick={() => setSuccessMessage(null)}
                    />
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="progress-report-loading">
                    <div className="spinner-border" />
                    <span>Memuat antrean approval...</span>
                </div>
            )}

            {/* Error */}
            {!isLoading && errorMessage !== null && (
                <div className="progress-report-error">
                    <div className="alert alert-danger" role="alert">
                        {errorMessage}
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => void fetchPendingApprovals()}
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* Empty */}
            {!isLoading && errorMessage === null && reports.length === 0 && (
                <div className="progress-report-empty">
                    <i className="bi bi-check2-circle text-success" />
                    <span>Tidak ada Progress Report yang menunggu persetujuan Anda.</span>
                </div>
            )}

            {/* Table */}
            {!isLoading && errorMessage === null && reports.length > 0 && (
                <div className="table-responsive">
                    <table className="table progress-report-table align-middle">
                        <thead>
                            <tr>
                                <th>Nomor</th>
                                <th>Tanggal</th>
                                <th>Periode</th>
                                <th>Pembuat</th>
                                <th>Client</th>
                                <th>SPK</th>
                                <th className="text-center">Task / Temuan</th>
                                <th className="text-center">Status</th>
                                <th className="text-center">Aksi Approval</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr
                                    key={report.id}
                                    className="progress-report-clickable-row"
                                    onClick={() =>
                                        navigate(`/progress-report/${report.id}`)
                                    }
                                >
                                    <td>
                                        <strong className="text-primary">
                                            {report.nomor}
                                        </strong>
                                    </td>
                                    <td>{report.tanggal}</td>
                                    <td>
                                        {getPeriodeLabel(
                                            report.bulan,
                                            report.tahun,
                                            report.tanggal,
                                        )}
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center gap-1">
                                            <i className="bi bi-person text-secondary" />
                                            <span>
                                                {report.created_by_name ||
                                                    report.created_by ||
                                                    '-'}
                                            </span>
                                            {report.created_by_level && (
                                                <span className="badge bg-light text-secondary border">
                                                    L{report.created_by_level}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{report.client_code}</td>
                                    <td>{report.spk?.no_spk ?? '-'}</td>
                                    <td className="text-center">
                                        <span className="badge bg-light text-dark border me-1">
                                            {report.total_task} Task
                                        </span>
                                        {report.total_temuan > 0 && (
                                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                                {report.total_temuan} Temuan
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                                            Menunggu Approval
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center justify-content-center gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-success btn-sm d-flex align-items-center gap-1 px-2 py-1 shadow-2xs"
                                                title="Setujui (Approve) Laporan"
                                                disabled={approvingId === report.id}
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    void handleApprove(report)
                                                }}
                                            >
                                                {approvingId === report.id ? (
                                                    <span className="spinner-border spinner-border-sm" />
                                                ) : (
                                                    <i className="bi bi-check-circle-fill" />
                                                )}
                                                <span className="small">Approve</span>
                                            </button>

                                            <button
                                                type="button"
                                                className="progress-report-action-button"
                                                title="Lihat Detail"
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    navigate(
                                                        `/progress-report/${report.id}`,
                                                    )
                                                }}
                                            >
                                                <i className="bi bi-eye" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!isLoading && errorMessage === null && reports.length > 0 && (
                <div className="progress-report-pagination">
                    <button
                        type="button"
                        className="pagination-arrow"
                        disabled={currentPage <= 1}
                        onClick={() =>
                            setCurrentPage((previous) =>
                                Math.max(1, previous - 1),
                            )
                        }
                    >
                        <i className="bi bi-caret-left-fill" />
                    </button>

                    <span className="progress-report-page-info">
                        {meta.current_page} / {meta.last_page}
                    </span>

                    <button
                        type="button"
                        className="pagination-arrow"
                        disabled={currentPage >= meta.last_page}
                        onClick={() =>
                            setCurrentPage((previous) =>
                                Math.min(meta.last_page, previous + 1),
                            )
                        }
                    >
                        <i className="bi bi-caret-right-fill" />
                    </button>
                </div>
            )}
        </section>
    )
}

export default ProgressReportPendingApprovals
