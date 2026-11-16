import {
    useEffect,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type {
    DailyProgress,
} from '@/features/daily-progress/types/daily-progress.types'
import { getPeriodeLabel } from '@/features/daily-progress/utils/dailyProgressPeriod'

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
                    <th className="th-aksi text-center">Aksi</th>
                </tr>
                </thead>

                <tbody>
                {progresses.map((progress, index) => {
                    const isDropup =
                        progresses.length >= 3 &&
                        index >= progresses.length - 2

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
                                    {progress.client_code}
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
                                                    <span>Edit Lengkap (SPK / Pekerjaan)</span>
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
