import {
    useEffect,
    useState,
} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type {
    DailyProgress,
} from '@/features/daily-progress/types/daily-progress.types'
import { getPeriodeLabel } from '@/features/daily-progress/utils/dailyProgressPeriod'

const getProgressReportsList = (
    progress: DailyProgress,
): Array<{ id?: number; nomor: string }> => {
    const list: Array<{ id?: number; nomor: string }> = []
    const seen = new Set<string>()

    const addPr = (id?: number, nomor?: string | null) => {
        if (!nomor) return
        const key = `${id ?? ''}-${nomor}`
        if (!seen.has(key)) {
            seen.add(key)
            list.push({ id, nomor })
        }
    }

    // 1. From progress.progress_reports array (new backend response)
    if (Array.isArray(progress.progress_reports)) {
        for (const pr of progress.progress_reports) {
            if (pr && pr.nomor) addPr(pr.id, pr.nomor)
        }
    }

    // 2. From progress.progress_report object
    if (progress.progress_report && progress.progress_report.nomor) {
        addPr(progress.progress_report.id, progress.progress_report.nomor)
    }

    // 3. From scalar fields
    if (progress.nomor_progress_report) {
        addPr(progress.progress_report_id ?? undefined, progress.nomor_progress_report)
    }
    if (progress.progress_report_nomor) {
        addPr(progress.progress_report_id ?? undefined, progress.progress_report_nomor)
    }

    // 4. From details
    for (const d of progress.details ?? []) {
        if (Array.isArray(d.progress_reports)) {
            for (const pr of d.progress_reports) {
                if (pr && pr.nomor) addPr(pr.id, pr.nomor)
            }
        }
        const anyD = (d as unknown) as Record<string, unknown>
        if (Array.isArray(anyD.progress_reports)) {
            for (const pr of anyD.progress_reports as Array<{ id?: number; nomor?: string }>) {
                if (pr && pr.nomor) addPr(pr.id, pr.nomor)
            }
        }
        if (anyD.progress_report && typeof anyD.progress_report === 'object') {
            const pr = anyD.progress_report as { id?: number; nomor?: string }
            if (pr.nomor) addPr(pr.id, pr.nomor)
        }
        if (anyD.last_progress_report && typeof anyD.last_progress_report === 'object') {
            const lpr = anyD.last_progress_report as { progress_report_id?: number; nomor?: string }
            if (lpr.nomor) addPr(lpr.progress_report_id, lpr.nomor)
        }
    }

    // 5. From findings
    for (const f of progress.findings ?? []) {
        if (f.nomor_pr) {
            addPr(f.progress_report_id, f.nomor_pr)
        }
    }

    return list
}

interface DailyProgressTableProps {
    progresses: DailyProgress[]
    onView: (progress: DailyProgress) => void
    onEdit: (progress: DailyProgress) => void
    onEditForm?: (progress: DailyProgress) => void
    onDelete: (progress: DailyProgress) => void
}

const DailyProgressTable = ({
                                progresses,
                                onView,
                                onEdit,
                                onEditForm,
                                onDelete,
                            }: DailyProgressTableProps) => {
    const navigate = useNavigate()
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setOpenMenuId(null)
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenMenuId(null)
            }
        }

        if (openMenuId !== null) {
            document.addEventListener('click', handleClickOutside)
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('click', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [openMenuId])

    if (progresses.length === 0) {
        return (
            <div className="daily-progress-empty">
                <div className="daily-progress-empty-icon">
                    <i className="bi bi-inbox" />
                </div>

                <div className="daily-progress-empty-text">
                    <strong>Belum ada daily progress</strong>
                    <span>
                        Mulai catat progress pekerjaan operasional harian Anda
                    </span>
                </div>

                <button
                    type="button"
                    className="btn btn-primary btn-sm mt-2"
                    onClick={() => navigate('/daily-progress/tambah')}
                >
                    <i className="bi bi-plus-lg me-1" />
                    Tambah Daily Progress
                </button>
            </div>
        )
    }

    return (
        <div className="daily-progress-table-container">
            <table className="table daily-progress-table align-middle">
                <thead>
                <tr>
                    <th className="th-nomor">Nomor</th>
                    <th className="th-tanggal">Tanggal</th>
                    <th className="th-periode">Periode</th>
                    <th className="th-client">Client</th>
                    <th className="th-spk">No SPK</th>
                    <th className="th-pr">No. Progress Report</th>
                    <th className="th-aksi text-center">Aksi</th>
                </tr>
                </thead>

                <tbody>
                {progresses.map((progress, index) => {
                    const isDropup =
                        progresses.length >= 3 &&
                        index >= progresses.length - 2
                    const prList = getProgressReportsList(progress)

                    return (
                        <tr
                            key={progress.id}
                            className={`daily-progress-clickable-row ${
                                openMenuId === progress.id ? 'menu-open' : ''
                            }`}
                            onClick={() => onView(progress)}
                        >
                            <td>
                                <div className="daily-progress-nomor-wrapper">
                                    <span className="daily-progress-nomor">
                                        {progress.nomor}
                                    </span>
                                </div>
                            </td>

                            <td>
                                <span className="daily-progress-date">
                                    {progress.tanggal}
                                </span>
                            </td>

                            <td>
                                <span className="daily-progress-badge periode">
                                    {getPeriodeLabel(
                                        progress.bulan,
                                        progress.tahun,
                                        progress.tanggal,
                                    )}
                                </span>
                            </td>

                            <td>
                                <span className="daily-progress-badge client">
                                    <i className="bi bi-buildings me-1" />
                                    {progress.client_name
                                        ? `${progress.client_name} (${progress.client_code})`
                                        : progress.client_code}
                                </span>
                            </td>

                            <td>
                                {progress.no_spk ? (
                                    <span className="daily-progress-badge spk">
                                        {progress.no_spk}
                                    </span>
                                ) : (
                                    <span className="text-muted small">-</span>
                                )}
                            </td>

                            <td>
                                {prList.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-1 align-items-center">
                                        {prList.map((pr) => (
                                            <Link
                                                key={`${pr.id ?? pr.nomor}`}
                                                to={pr.id ? `/progress-report/${pr.id}` : `/progress-report`}
                                                className="daily-progress-badge pr"
                                                onClick={(event) => event.stopPropagation()}
                                                title={`Buka detail Progress Report ${pr.nomor}`}
                                            >
                                                <i className="bi bi-journal-check me-1" />
                                                <span>{pr.nomor}</span>
                                                <i className="bi bi-box-arrow-up-right ms-1 text-primary-emphasis" style={{ fontSize: '9.5px' }} />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-muted small">-</span>
                                )}
                            </td>

                            <td className="text-center">
                                <div
                                    className={`daily-progress-action-dropdown ${
                                        openMenuId === progress.id ? 'open' : ''
                                    }`}
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        className={`daily-progress-action-trigger ${
                                            openMenuId === progress.id
                                                ? 'active'
                                                : ''
                                        }`}
                                        title="Pilihan Aksi"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            setOpenMenuId((prev) =>
                                                prev === progress.id
                                                    ? null
                                                    : progress.id,
                                            )
                                        }}
                                    >
                                        <i className="bi bi-three-dots-vertical" />
                                    </button>

                                    {openMenuId === progress.id && (
                                        <div
                                            className={`daily-progress-action-menu ${
                                                isDropup ? 'dropup' : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                className="daily-progress-action-item"
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    setOpenMenuId(null)
                                                    onView(progress)
                                                }}
                                            >
                                                <i className="bi bi-eye text-primary" />
                                                <span>Lihat Detail</span>
                                            </button>

                                            {progress.is_used_in_progress_report ? (
                                                <div className="px-3 py-2 text-muted small d-flex align-items-center gap-2 border-top">
                                                    <i className="bi bi-lock-fill text-secondary" />
                                                    <span style={{ fontSize: '11.5px' }}>
                                                        Terkunci di Progress Report
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="daily-progress-action-item"
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            setOpenMenuId(null)
                                                            onEdit(progress)
                                                        }}
                                                    >
                                                        <i className="bi bi-arrow-repeat text-warning" />
                                                        <span>Update Status &amp; Catatan</span>
                                                    </button>

                                                    {onEditForm !== undefined && (
                                                        <button
                                                            type="button"
                                                            className="daily-progress-action-item"
                                                            onClick={(event) => {
                                                                event.stopPropagation()
                                                                setOpenMenuId(null)
                                                                onEditForm(progress)
                                                            }}
                                                        >
                                                            <i className="bi bi-pencil text-info" />
                                                            <span>Edit</span>
                                                        </button>
                                                    )}

                                                    <div className="daily-progress-action-divider" />

                                                    <button
                                                        type="button"
                                                        className="daily-progress-action-item danger"
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            setOpenMenuId(null)
                                                            onDelete(progress)
                                                        }}
                                                    >
                                                        <i className="bi bi-trash3 text-danger" />
                                                        <span>Hapus Laporan</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
        </div>
    )
}

export default DailyProgressTable
