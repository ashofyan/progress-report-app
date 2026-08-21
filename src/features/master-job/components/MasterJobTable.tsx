import type {
    MasterJob,
} from '@/features/master-job/types/master-job.types'

interface MasterJobTableProps {
    jobs: MasterJob[]
    onEdit: (job: MasterJob) => void
    onDelete: (job: MasterJob) => void
}

const MasterJobTable = ({
                            jobs,
                            onEdit,
                            onDelete,
                        }: MasterJobTableProps) => {
    if (jobs.length === 0) {
        return (
            <div className="master-job-empty">
                <i className="bi bi-inbox" />

                <span>
          Belum ada master pekerjaan.
        </span>
            </div>
        )
    }

    return (
        <div className="table-responsive">
            <table className="table master-job-table">
                <thead>
                <tr>
                    <th>No</th>
                    <th>Kode Pekerjaan</th>
                    <th>Deskripsi</th>
                    <th>Task</th>
                    <th>Additional Task</th>
                    <th className="text-center">
                        Aksi
                    </th>
                </tr>
                </thead>

                <tbody>
                {jobs.map((job, index) => (
                    <tr key={job.id}>
                        <td>
                            {index + 1}
                        </td>

                        <td>
                            <strong>
                                {job.job_code}
                            </strong>
                        </td>

                        <td>
                            {job.description}
                        </td>

                        <td>
                            {job.tasks.length}
                        </td>

                        <td>
                            {job.task_additionals.length}
                        </td>

                        <td>
                            <div className="master-job-actions">
                                <button
                                    type="button"
                                    className="master-job-action-button edit"
                                    title="Edit"
                                    onClick={() => onEdit(job)}
                                >
                                    <i className="bi bi-pencil-square" />
                                </button>

                                <button
                                    type="button"
                                    className="master-job-action-button delete"
                                    title="Hapus"
                                    onClick={() => onDelete(job)}
                                >
                                    <i className="bi bi-trash3"  />
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

export default MasterJobTable
