import type {
    AdditionalTask,
    AdditionalTaskStatus,
} from '@/features/additional-task/types/additional-task.types'

interface AdditionalTaskTableProps {
    tasks: AdditionalTask[]
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
                                 onEdit,
                                 onDelete,
                             }: AdditionalTaskTableProps) => {
    if (tasks.length === 0) {
        return (
            <div className="additional-task-empty">
                <i className="bi bi-inbox" />

                <span>
                    Belum ada task tambahan.
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
                    <th>Client</th>
                    <th>Pekerjaan</th>
                    <th>Parent</th>
                    <th>Task</th>
                    <th>Status</th>
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

                        <td>{task.details.length}</td>

                        <td>{getTotalTaskItems(task)}</td>

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
