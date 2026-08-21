import type {
    DailyProgress,
} from '@/features/daily-progress/types/daily-progress.types'

interface DailyProgressTableProps {
    progresses: DailyProgress[]
    onView: (progress: DailyProgress) => void
    onEdit: (progress: DailyProgress) => void
    onDelete: (progress: DailyProgress) => void
}

const getTodayDate = (): string => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

const DailyProgressTable = ({
                                progresses,
                                onView,
                                onEdit,
                                onDelete,
                            }: DailyProgressTableProps) => {
    const today = getTodayDate()

    if (progresses.length === 0) {
        return (
            <div className="daily-progress-empty">
                <i className="bi bi-inbox" />

                <span>
                    Belum ada daily progress.
                </span>
            </div>
        )
    }

    return (
        <div className="table-responsive">
            <table className="table daily-progress-table">
                <thead>
                <tr>
                    <th>No</th>
                    <th>Nomor</th>
                    <th>Tanggal</th>
                    <th>Client</th>
                    <th>No SPK</th>
                    <th>Detail</th>
                    <th className="text-center">
                        Aksi
                    </th>
                </tr>
                </thead>

                <tbody>
                {progresses.map((progress, index) => (
                    <tr
                        key={progress.id}
                        className="daily-progress-clickable-row"
                        onClick={() => onView(progress)}
                    >
                        <td>{index + 1}</td>

                        <td>
                            <strong>{progress.nomor}</strong>
                        </td>

                        <td>{progress.tanggal}</td>

                        <td>{progress.client_code}</td>

                        <td>{progress.no_spk ?? '-'}</td>

                        <td>{progress.details.length}</td>

                        <td>
                            <div className="daily-progress-actions">
                                {progress.tanggal === today && (
                                    <button
                                        type="button"
                                        className="daily-progress-action-button edit"
                                        title="Edit"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            onEdit(progress)
                                        }}
                                    >
                                        <i className="bi bi-pencil-square" />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="daily-progress-action-button delete"
                                    title="Hapus"
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        onDelete(progress)
                                    }}
                                >
                                    <i className="bi bi-trash3" />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}

export default DailyProgressTable
