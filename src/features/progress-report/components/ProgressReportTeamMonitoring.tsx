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
import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import type { DailyProgressFormSpk } from '@/features/daily-progress/types/daily-progress.types'
import { progressReportApi } from '@/features/progress-report/api/progressReportApi'
import type {
    ProgressReportTeamData,
    ProgressReportTeamFilters,
} from '@/features/progress-report/types/progress-report.types'

const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
]

type DateFilterMode = 'all' | 'single' | 'range' | 'month'

export const ProgressReportTeamMonitoring = () => {
    const navigate = useNavigate()

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const [clientCode, setClientCode] = useState<string>('')
    const [spks, setSpks] = useState<DailyProgressFormSpk[]>([])
    const [selectedSpkId, setSelectedSpkId] = useState<number | ''>('')
    const [isLoadingSpks, setIsLoadingSpks] = useState<boolean>(false)

    // Additional filters
    const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all')
    const [tanggal, setTanggal] = useState<string>('')
    const [tanggalAwal, setTanggalAwal] = useState<string>('')
    const [tanggalAkhir, setTanggalAkhir] = useState<string>('')
    const [bulan, setBulan] = useState<number | ''>('')
    const [tahun, setTahun] = useState<number | ''>(new Date().getFullYear())
    const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Data state
    const [teamData, setTeamData] = useState<ProgressReportTeamData | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Fetch SPKs when client changes
    useEffect(() => {
        if (!clientCode || clientCode.trim() === '') {
            setSpks([])
            setSelectedSpkId('')
            setTeamData(null)
            return
        }

        const fetchSpks = async () => {
            setIsLoadingSpks(true)
            const result = await dailyProgressApi.getFormData({
                client_code: clientCode,
            })
            setIsLoadingSpks(false)

            if (result.success && result.data?.spks) {
                setSpks(result.data.spks)
                if (result.data.spks.length === 1) {
                    setSelectedSpkId(result.data.spks[0].spk_id)
                } else {
                    setSelectedSpkId('')
                }
            } else {
                setSpks([])
                setSelectedSpkId('')
            }
        }

        void fetchSpks()
    }, [clientCode])

    // Query filters
    const queryFilters = useMemo((): ProgressReportTeamFilters | null => {
        if (!clientCode || selectedSpkId === '') {
            return null
        }

        const filters: ProgressReportTeamFilters = {
            client_code: clientCode.trim(),
            als_spk_id: Number(selectedSpkId),
        }

        if (searchQuery.trim() !== '') {
            filters.search = searchQuery.trim()
        }

        if (selectedEmployeeCode !== '') {
            filters.employee_code = selectedEmployeeCode
        }

        if (dateFilterMode === 'single' && tanggal) {
            filters.tanggal = tanggal
        } else if (dateFilterMode === 'range') {
            if (tanggalAwal) filters.tanggal_awal = tanggalAwal
            if (tanggalAkhir) filters.tanggal_akhir = tanggalAkhir
        } else if (dateFilterMode === 'month') {
            if (bulan !== '') filters.bulan = Number(bulan)
            if (tahun !== '') filters.tahun = Number(tahun)
        }

        return filters
    }, [
        clientCode,
        selectedSpkId,
        searchQuery,
        selectedEmployeeCode,
        dateFilterMode,
        tanggal,
        tanggalAwal,
        tanggalAkhir,
        bulan,
        tahun,
    ])

    const fetchTeamData = useCallback(async (): Promise<void> => {
        if (!queryFilters) {
            setTeamData(null)
            return
        }

        setIsLoading(true)
        setErrorMessage(null)

        const result = await progressReportApi.getTeam(queryFilters)
        setIsLoading(false)

        if (result.success && result.data) {
            setTeamData(result.data)
        } else {
            setTeamData(null)
            setErrorMessage(result.message || 'Gagal memuat data monitoring tim.')
        }
    }, [queryFilters])

    useEffect(() => {
        if (!queryFilters) return

        const timeoutId = window.setTimeout(() => {
            void fetchTeamData()
        }, 200)

        return () => window.clearTimeout(timeoutId)
    }, [fetchTeamData, queryFilters])

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setSearchQuery(event.target.value)
    }

    const availableTeams = teamData?.spk?.teams ?? []

    return (
        <div className="progress-report-team-monitoring">
            {/* Header Filter Section */}
            <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '10px' }}>
                <div className="card-body p-3">
                    <div className="row g-3 align-items-end">
                        {/* Client Selector */}
                        <div className="col-md-4 col-sm-6">
                            <label className="form-label small fw-semibold text-secondary mb-1">
                                Client <span className="text-danger">*</span>
                            </label>
                            <ClientSelect
                                clients={clients}
                                selectedCode={clientCode}
                                isLoading={isLoadingClients}
                                errorMessage={clientErrorMessage}
                                onSearch={(query) => {
                                    void searchClients(query)
                                }}
                                onSelect={(client) => {
                                    setClientCode(client.customer_code)
                                    setSelectedEmployeeCode('')
                                }}
                            />
                        </div>

                        {/* SPK Selector */}
                        <div className="col-md-5 col-sm-6">
                            <label className="form-label small fw-semibold text-secondary mb-1">
                                SPK <span className="text-danger">*</span>
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedSpkId}
                                disabled={!clientCode || isLoadingSpks || spks.length === 0}
                                onChange={(e) => {
                                    setSelectedSpkId(
                                        e.target.value ? Number(e.target.value) : '',
                                    )
                                    setSelectedEmployeeCode('')
                                }}
                            >
                                <option value="">
                                    {isLoadingSpks
                                        ? 'Memuat SPK...'
                                        : spks.length === 0
                                          ? '-- Tidak ada SPK --'
                                          : '-- Pilih SPK --'}
                                </option>
                                {spks.map((spk) => (
                                    <option key={spk.spk_id} value={spk.spk_id}>
                                        {spk.no_spk} - {spk.note ?? spk.job?.description ?? 'Tanpa deskripsi'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Anggota Tim Filter */}
                        <div className="col-md-3 col-sm-12">
                            <label className="form-label small fw-semibold text-secondary mb-1">
                                Anggota Tim
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedEmployeeCode}
                                disabled={selectedSpkId === ''}
                                onChange={(e) => setSelectedEmployeeCode(e.target.value)}
                            >
                                <option value="">Semua Anggota Tim</option>
                                {availableTeams.map((member) => (
                                    <option
                                        key={member.kode_employee}
                                        value={member.kode_employee}
                                    >
                                        {member.name_employee} (Level {member.tingkat})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Secondary Filters Bar */}
                    {selectedSpkId !== '' && (
                        <div className="row g-3 align-items-end mt-1 pt-2 border-top">
                            {/* Filter Mode */}
                            <div className="col-md-3 col-sm-6">
                                <label className="form-label small text-muted mb-1" style={{ fontSize: '11.5px' }}>
                                    Filter Waktu
                                </label>
                                <select
                                    className="form-select form-select-sm"
                                    value={dateFilterMode}
                                    onChange={(e) =>
                                        setDateFilterMode(
                                            e.target.value as DateFilterMode,
                                        )
                                    }
                                >
                                    <option value="all">Semua Waktu</option>
                                    <option value="single">Tanggal Spesifik</option>
                                    <option value="range">Rentang Tanggal</option>
                                    <option value="month">Bulan &amp; Tahun</option>
                                </select>
                            </div>

                            {/* Date Inputs based on mode */}
                            {dateFilterMode === 'single' && (
                                <div className="col-md-3 col-sm-6">
                                    <label className="form-label small text-muted mb-1" style={{ fontSize: '11.5px' }}>
                                        Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={tanggal}
                                        onChange={(e) => setTanggal(e.target.value)}
                                    />
                                </div>
                            )}

                            {dateFilterMode === 'range' && (
                                <>
                                    <div className="col-md-3 col-sm-6">
                                        <label className="form-label small text-muted mb-1" style={{ fontSize: '11.5px' }}>
                                            Tanggal Awal
                                        </label>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            value={tanggalAwal}
                                            onChange={(e) => setTanggalAwal(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-3 col-sm-6">
                                        <label className="form-label small text-muted mb-1" style={{ fontSize: '11.5px' }}>
                                            Tanggal Akhir
                                        </label>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            value={tanggalAkhir}
                                            onChange={(e) => setTanggalAkhir(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            {dateFilterMode === 'month' && (
                                <>
                                    <div className="col-md-2 col-sm-6">
                                        <label className="form-label small text-muted mb-1" style={{ fontSize: '11.5px' }}>
                                            Bulan
                                        </label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={bulan}
                                            onChange={(e) =>
                                                setBulan(
                                                    e.target.value
                                                        ? Number(e.target.value)
                                                        : '',
                                                )
                                            }
                                        >
                                            <option value="">Semua Bulan</option>
                                            {monthOptions.map((m) => (
                                                <option key={m.value} value={m.value}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-2 col-sm-6">
                                        <label className="form-label small text-muted mb-1" style={{ fontSize: '11.5px' }}>
                                            Tahun
                                        </label>
                                        <input
                                            type="number"
                                            min={2000}
                                            max={2100}
                                            className="form-control form-control-sm"
                                            value={tahun}
                                            onChange={(e) =>
                                                setTahun(
                                                    e.target.value
                                                        ? Number(e.target.value)
                                                        : '',
                                                )
                                            }
                                        />
                                    </div>
                                </>
                            )}

                            {/* Search Box */}
                            <div className="col-md-3 col-sm-12 ms-auto">
                                <label className="form-label small text-muted mb-1" style={{ fontSize: '11.5px' }}>
                                    Pencarian
                                </label>
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text bg-white">
                                        <i className="bi bi-search text-muted" />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Cari nomor PR / SPK..."
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Prompt to select Client and SPK */}
            {(!clientCode || selectedSpkId === '') && (
                <div className="card shadow-sm border-0 text-center py-5">
                    <div className="card-body">
                        <i className="bi bi-people fs-1 text-primary opacity-50 d-block mb-3" />
                        <h5 className="text-secondary fw-semibold">
                            Monitoring Progress Report Team (Read-Only)
                        </h5>
                        <p className="text-muted small mb-0" style={{ maxWidth: '480px', margin: '0 auto' }}>
                            Pilih <strong>Client</strong> dan <strong>SPK</strong> di atas untuk melihat serta memonitor Progress Report dari seluruh anggota tim yang terdaftar pada SPK bersangkutan.
                        </p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {selectedSpkId !== '' && isLoading && (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" />
                    <div className="text-muted small mt-2">Memuat data monitoring tim...</div>
                </div>
            )}

            {/* Error State */}
            {selectedSpkId !== '' && !isLoading && errorMessage && (
                <div className="alert alert-danger my-3" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    {errorMessage}
                </div>
            )}

            {/* Content when data loaded */}
            {selectedSpkId !== '' && !isLoading && teamData && (
                <>
                    {/* SPK & Team Meta Bar */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 p-3 bg-light rounded border">
                        <div>
                            <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-primary">
                                    {teamData.spk.no_spk}
                                </span>
                                <span className="fw-semibold text-dark">
                                    {teamData.spk.job?.description ?? 'Pekerjaan SPK'}
                                </span>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                            <span className="small text-muted me-1">Tim SPK:</span>
                            {teamData.spk.teams.map((member) => (
                                <span
                                    key={member.kode_employee}
                                    className="badge bg-white text-secondary border shadow-2xs"
                                    title={`Employee Code: ${member.kode_employee}`}
                                >
                                    <i className="bi bi-person me-1" />
                                    {member.name_employee}
                                    <span className="ms-1 text-muted">(L{member.tingkat})</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="row g-2 mb-3">
                        <div className="col-md-2 col-sm-4 col-6">
                            <div className="p-2 px-3 bg-white border rounded shadow-2xs">
                                <span className="text-muted d-block small" style={{ fontSize: '11px' }}>
                                    Total PR
                                </span>
                                <strong className="fs-5 text-dark">
                                    {teamData.summary.total_progress_report}
                                </strong>
                            </div>
                        </div>
                        <div className="col-md-2 col-sm-4 col-6">
                            <div className="p-2 px-3 bg-white border rounded shadow-2xs">
                                <span className="text-muted d-block small" style={{ fontSize: '11px' }}>
                                    Total Task
                                </span>
                                <strong className="fs-5 text-success">
                                    {teamData.summary.total_task}
                                </strong>
                            </div>
                        </div>
                        <div className="col-md-2 col-sm-4 col-6">
                            <div className="p-2 px-3 bg-white border rounded shadow-2xs">
                                <span className="text-muted d-block small" style={{ fontSize: '11px' }}>
                                    Total Temuan
                                </span>
                                <strong className="fs-5 text-danger">
                                    {teamData.summary.total_temuan}
                                </strong>
                            </div>
                        </div>
                        <div className="col-md-2 col-sm-4 col-6">
                            <div className="p-2 px-3 bg-white border rounded shadow-2xs">
                                <span className="text-muted d-block small" style={{ fontSize: '11px' }}>
                                    Total Catatan
                                </span>
                                <strong className="fs-5 text-info">
                                    {teamData.summary.total_catatan}
                                </strong>
                            </div>
                        </div>
                        <div className="col-md-2 col-sm-4 col-6">
                            <div className="p-2 px-3 bg-white border rounded shadow-2xs">
                                <span className="text-muted d-block small" style={{ fontSize: '11px' }}>
                                    Total Dokumen
                                </span>
                                <strong className="fs-5 text-warning">
                                    {teamData.summary.total_dokumen}
                                </strong>
                            </div>
                        </div>
                        <div className="col-md-2 col-sm-4 col-6">
                            <div className="p-2 px-3 bg-white border rounded shadow-2xs">
                                <span className="text-muted d-block small" style={{ fontSize: '11px' }}>
                                    Total Anggota
                                </span>
                                <strong className="fs-5 text-secondary">
                                    {teamData.summary.total_employee}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* Table of Team Progress Reports */}
                    {teamData.items.length === 0 ? (
                        <div className="card border shadow-sm text-center py-5">
                            <div className="card-body">
                                <i className="bi bi-inbox fs-2 text-muted opacity-50 d-block mb-2" />
                                <span className="text-muted small">
                                    Tidak ada data Progress Report pada filter ini.
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="table-responsive bg-white rounded border shadow-2xs">
                            <table className="table table-hover align-middle mb-0 progress-report-table">
                                <thead className="table-light">
                                    <tr>
                                        <th>Nomor PR</th>
                                        <th>Tanggal</th>
                                        <th>Pembuat</th>
                                        <th>SPK</th>
                                        <th className="text-center">Task</th>
                                        <th className="text-center">Temuan</th>
                                        <th className="text-center">Catatan</th>
                                        <th className="text-center">Dokumen</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamData.items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="progress-report-clickable-row"
                                            onClick={() =>
                                                navigate(
                                                    `/progress-report/${item.id}`,
                                                )
                                            }
                                        >
                                            <td>
                                                <strong className="text-primary">
                                                    {item.nomor}
                                                </strong>
                                            </td>
                                            <td>{item.tanggal}</td>
                                            <td>
                                                <div className="d-flex align-items-center gap-1">
                                                    <i className="bi bi-person text-secondary" />
                                                    <span className="fw-medium text-dark">
                                                        {item.created_by_name ||
                                                            item.created_by}
                                                    </span>
                                                    <span className="badge bg-light text-secondary border">
                                                        L{item.created_by_level}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border">
                                                    {item.no_spk}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-success-subtle text-success border border-success-subtle">
                                                    {item.details_count}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                                    {item.findings_count}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-info-subtle text-info border border-info-subtle">
                                                    {item.notes_count}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                                                    {item.documents_count}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary"
                                                    title="Lihat Detail (Read-Only)"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigate(
                                                            `/progress-report/${item.id}`,
                                                        )
                                                    }}
                                                >
                                                    <i className="bi bi-eye" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default ProgressReportTeamMonitoring
