import type {
    RepresentativeLetterDetail,
} from '@/features/representative-letter/types/representative-letter.types'

interface RepresentativeLetterSourceDrawerProps {
    details: RepresentativeLetterDetail[]
    isOpen: boolean
    onClose: () => void
}

const RepresentativeLetterSourceDrawer = ({
                                              details,
                                              isOpen,
                                              onClose,
                                          }: RepresentativeLetterSourceDrawerProps) => {
    if (!isOpen) {
        return null
    }

    return (
        <div className="representative-letter-drawer-backdrop">
            <aside className="representative-letter-drawer">
                <div className="representative-letter-drawer-header">
                    <h2>Source Progress Report</h2>
                    <button
                        type="button"
                        className="representative-letter-icon-button"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="table-responsive">
                    <table className="table representative-letter-table">
                        <thead>
                        <tr>
                            <th>Nomor PR</th>
                            <th>Tanggal</th>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Parent Task</th>
                            <th>Task</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {details.map((detail) => (
                            <tr key={detail.id}>
                                <td>
                                    {detail.progress_report.nomor}
                                </td>
                                <td>
                                    {detail.progress_report.tanggal}
                                </td>
                                <td>{detail.employee.name}</td>
                                <td>{detail.type}</td>
                                <td>{detail.parent_task_name}</td>
                                <td>{detail.task_name}</td>
                                <td>
                                    <span className="representative-letter-status selesai">
                                        Selesai
                                    </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="representative-letter-source-notes">
                    <h3>Note Progress Report</h3>

                    {details.every(
                        (detail) =>
                            detail.notes === undefined ||
                            detail.notes.length === 0,
                    ) && (
                        <div className="representative-letter-state compact">
                            Tidak ada note Progress Report pada snapshot ini.
                        </div>
                    )}

                    {details.map((detail) => {
                        if (
                            detail.notes === undefined ||
                            detail.notes.length === 0
                        ) {
                            return null
                        }

                        return (
                            <div
                                className="representative-letter-source-note"
                                key={detail.id}
                            >
                                <strong>
                                    {detail.progress_report.nomor} /{' '}
                                    {detail.task_name}
                                </strong>
                                {detail.notes.map((note) => (
                                    <p key={note.id}>
                                        {note.catatan}
                                    </p>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </aside>
        </div>
    )
}

export default RepresentativeLetterSourceDrawer
