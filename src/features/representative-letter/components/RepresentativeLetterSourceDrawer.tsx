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
                    <h3>Note & Temuan Progress Report</h3>

                    {details.every(
                        (detail) =>
                            (!detail.notes || detail.notes.length === 0) &&
                            (!detail.temuans || detail.temuans.length === 0) &&
                            (!detail.documents || detail.documents.length === 0),
                    ) && (
                        <div className="representative-letter-state compact">
                            Tidak ada catatan, temuan, atau dokumen pada snapshot ini.
                        </div>
                    )}

                    {details.map((detail) => {
                        const hasNotes = detail.notes && detail.notes.length > 0
                        const hasTemuans = detail.temuans && detail.temuans.length > 0
                        const hasDocs = detail.documents && detail.documents.length > 0

                        if (!hasNotes && !hasTemuans && !hasDocs) {
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

                                {hasNotes && detail.notes?.map((note) => (
                                    <p key={note.id}>
                                        {note.catatan}
                                    </p>
                                ))}

                                {hasTemuans && detail.temuans?.map((temuan, tIdx) => (
                                    <div
                                        key={temuan.id ?? tIdx}
                                        style={{
                                            backgroundColor: '#fffbeb',
                                            border: '1px solid #fef3c7',
                                            borderRadius: '4px',
                                            padding: '6px 10px',
                                            marginTop: '6px',
                                            fontSize: '12px',
                                        }}
                                    >
                                        <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: '#991b1b' }}>
                                            &bull; Identifikasi Masalah:
                                        </p>
                                        <p style={{ margin: '0 0 4px 10px', color: '#374151' }}>
                                            {temuan.masalah}
                                        </p>
                                        {temuan.saran && (
                                            <>
                                                <p style={{ margin: '4px 0 2px 0', fontWeight: 'bold', color: '#065f46' }}>
                                                    &bull; Saran:
                                                </p>
                                                <p style={{ margin: '0 0 2px 10px', color: '#374151' }}>
                                                    {temuan.saran}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ))}

                                {hasDocs && (
                                    <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {detail.documents?.map((doc) => (
                                            <a
                                                key={doc.id}
                                                href={doc.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    fontSize: '11px',
                                                    color: '#2563eb',
                                                    textDecoration: 'underline',
                                                }}
                                            >
                                                {doc.is_image ? '🖼️ ' : '📎 '}
                                                {doc.original_name}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </aside>
        </div>
    )
}

export default RepresentativeLetterSourceDrawer
