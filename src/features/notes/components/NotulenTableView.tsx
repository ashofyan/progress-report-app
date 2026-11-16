import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import NoteBlockViewer from '@/features/notes/components/NoteBlockViewer'
import type { Note } from '@/features/notes/types/notes.types'

interface NotulenTableViewProps {
    notes: Note[]
    onShareClick: (note: Note) => void
    basePath?: string
}

export const NotulenTableView = ({
    notes,
    onShareClick,
    basePath = '/notulen',
}: NotulenTableViewProps) => {
    const { employee } = useAuth()

    return (
        <div className="notes-table-container">
            <div className="table-responsive">
                <table className="table table-hover notes-table align-middle mb-0">
                    <thead>
                        <tr>
                            <th style={{ width: '18%' }}>No. Notulen</th>
                            <th style={{ width: '32%' }}>Judul Notulen</th>
                            <th style={{ width: '14%' }}>Lingkup Rapat</th>
                            <th style={{ width: '12%' }}>Hak Akses</th>
                            <th style={{ width: '10%' }}>Peserta</th>
                            <th style={{ width: '14%' }} className="text-end pe-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {notes.map((note) => {
                            const isAuthor =
                                employee?.employee_code !== undefined
                                    ? note.author_employee_code === employee.employee_code
                                    : false
                            const targetUrl = `${basePath}/${note.id}`
                            const attendeeCount =
                                note.shares?.filter((s) => s.is_attendance).length ?? 0
                            const reportNumber = note.report_number || note.report_no

                            return (
                                <tr key={note.id} className="notes-table-row">
                                    <td>
                                        <div className="d-flex align-items-center gap-1">
                                            <span className="fs-6 lh-1">👥</span>
                                            {reportNumber ? (
                                                <span
                                                    className="badge bg-light text-dark border font-monospace"
                                                    style={{ fontSize: '11px', letterSpacing: '0.02em' }}
                                                >
                                                    {reportNumber}
                                                </span>
                                            ) : (
                                                <span className="text-muted small">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="min-w-0">
                                            <Link
                                                to={targetUrl}
                                                className="notes-table-title text-truncate d-block"
                                            >
                                                {note.title || 'Tanpa Judul'}
                                            </Link>
                                            <div className="notes-table-excerpt text-muted small text-truncate">
                                                <NoteBlockViewer
                                                    content={note.content}
                                                    showSummaryOnly
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {note.meeting_scope === 'client' ? (
                                            <span className="notes-tag tag-primary">
                                                <i className="bi bi-briefcase me-1" />
                                                Klien #{note.client_id ?? '-'}
                                            </span>
                                        ) : (
                                            <span className="notes-tag tag-standard">
                                                <i className="bi bi-building me-1" />
                                                Internal ALS
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className={`notes-tag ${
                                                note.share_type === 'public'
                                                    ? 'tag-public'
                                                    : note.share_type === 'invited'
                                                    ? 'tag-invited'
                                                    : 'tag-private'
                                            }`}
                                        >
                                            {note.share_type === 'public' && 'Publik'}
                                            {note.share_type === 'invited' && 'Diundang'}
                                            {note.share_type === 'private' && 'Privat'}
                                        </span>
                                    </td>
                                    <td>
                                        {attendeeCount > 0 ? (
                                            <span
                                                className="badge bg-danger-subtle text-danger"
                                                style={{ fontSize: '11px' }}
                                            >
                                                <i className="bi bi-people me-1" />
                                                {attendeeCount} hadir
                                            </span>
                                        ) : (
                                            <span className="text-muted small">0</span>
                                        )}
                                    </td>
                                    <td className="text-end pe-3">
                                        <div className="d-inline-flex align-items-center gap-1">
                                            <Link
                                                to={targetUrl}
                                                className="btn btn-sm btn-outline-secondary notes-table-btn"
                                                title="Buka Notulen"
                                            >
                                                <i className="bi bi-box-arrow-up-right me-1" />
                                                <span>Buka</span>
                                            </Link>
                                            {isAuthor && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger notes-table-btn"
                                                    title="Bagikan Notulen"
                                                    onClick={() => onShareClick(note)}
                                                >
                                                    <i className="bi bi-share" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default NotulenTableView
