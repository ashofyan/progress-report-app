import {
    PRIORITY_LABELS,
    type AdditionalTask,
    type AdditionalTaskStatus,
    type AdditionalTaskType,
} from '@/features/additional-task/types/additional-task.types'

interface AdditionalTaskTableProps {
    tasks: AdditionalTask[]
    type?: AdditionalTaskType
    onEdit: (task: AdditionalTask) => void
    onDelete: (task: AdditionalTask) => void
}

const statusLabels: Record<AdditionalTaskStatus, string> = {
    open: 'Open',
    pending: 'Pending',
    batal: 'Batal',
    selesai: 'Selesai',
}

const getTotalTaskItems = (
    task: AdditionalTask,
): number => {
    return task.details.reduce(
        (total, detail) =>
            total + detail.tasks.length,
        0,
    )
}

const getStatusSummary = (
    task: AdditionalTask,
): AdditionalTaskStatus[] => {
    const statuses = task.details.flatMap(
        (detail) =>
            detail.tasks.map(
                (item) => item.status,
            ),
    )

    return Array.from(new Set(statuses))
}

const AdditionalTaskTable = ({
    tasks,
    type = 'tambahan',
    onEdit,
    onDelete,
}: AdditionalTaskTableProps) => {
    const isCustom = type === 'custom'

    if (tasks.length === 0) {
        return (
            <div className="additional-task-empty">
                <i className="bi bi-inbox" />

                <span>
                    {isCustom
                        ? 'Belum ada custom pekerjaan.'
                        : 'Belum ada pekerjaan tambahan.'}
                </span>
            </div>
        )
    }

    return (
        <div className="table-responsive">
            <table className="table additional-task-table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Nomor</th>
                        <th>SPK</th>
                        <th>Client</th>
                        <th>Pekerjaan</th>
                        <th>Prioritas</th>
                        <th>Parent</th>
                        <th>Task</th>
                        {!isCustom && <th>Status</th>}
                        <th className="text-center">
                            Aksi
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {tasks.map((task, index) => (
                        <tr key={task.id}>
                            <td>{index + 1}</td>

                            <td>
                                <strong>{task.nomor}</strong>
                            </td>

                            <td>
                                {task.spk ? (
                                    <span title={task.spk.note ?? ''}>
                                        <strong>{task.spk.no_spk}</strong>
                                    </span>
                                ) : (
                                    <span className="text-muted">-</span>
                                )}
                            </td>

                            <td>{task.client_code}</td>

                            <td>
                                <div className="additional-task-job-cell">
                                    <strong>
                                        {task.job.job_code}
                                    </strong>

                                    <span>
                                        {task.job.description}
                                    </span>
                                </div>
                            </td>

                            <td>
                                <span
                                    className={`additional-task-priority-badge p${task.priority ?? 3}`}
                                    title={PRIORITY_LABELS[task.priority ?? 3] ?? `P${task.priority ?? 3}`}
                                >
                                    P{task.priority ?? 3} - {PRIORITY_LABELS[task.priority ?? 3]?.replace(/^P\d+\s*-\s*/, '') ?? 'Sedang'}
                                </span>
                            </td>

                            <td>{task.details.length}</td>

                            <td>{getTotalTaskItems(task)}</td>

                            {!isCustom && (
                                <td>
                                    <div className="additional-task-statuses">
                                        {getStatusSummary(task).map(
                                            (status) => (
                                                <span
                                                    key={status}
                                                    className={`additional-task-status ${status}`}
                                                >
                                                    {statusLabels[status]}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                </td>
                            )}

                            <td>
                                <div className="additional-task-actions">
                                    <button
                                        type="button"
                                        className="additional-task-action-button edit"
                                        title="Edit"
                                        onClick={() => onEdit(task)}
                                    >
                                        <i className="bi bi-pencil-square" />
                                    </button>

                                    <button
                                        type="button"
                                        className="additional-task-action-button delete"
                                        title="Hapus"
                                        onClick={() => onDelete(task)}
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

export default AdditionalTaskTable
