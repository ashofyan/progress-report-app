import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import NoteBlockViewer from '@/features/notes/components/NoteBlockViewer'
import type { Note } from '@/features/notes/types/notes.types'

interface NoteTableViewProps {
    notes: Note[]
    onShareClick: (note: Note) => void
    basePath?: string
}

const formatDate = (dateString?: string): string => {
    if (!dateString) return '-'
    try {
        const d = new Date(dateString)
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    } catch {
        return dateString
    }
}

export const NoteTableView = ({
    notes,
    onShareClick,
    basePath = '/notes',
}: NoteTableViewProps) => {
    const { employee } = useAuth()

    return (
        <div className="notes-table-container">
            <div className="table-responsive">
                <table className="table table-hover notes-table align-middle mb-0">
                    <thead>
                        <tr>
                            <th style={{ width: '40%' }}>Judul Catatan</th>
                            <th style={{ width: '15%' }}>Hak Akses</th>
                            <th style={{ width: '15%' }}>Pembuat</th>
                            <th style={{ width: '15%' }}>Tanggal</th>
                            <th style={{ width: '15%' }} className="text-end pe-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {notes.map((note) => {
                            const isAuthor =
                                employee?.employee_code !== undefined
                                    ? note.author_employee_code === employee.employee_code
                                    : false
                            const targetUrl = `${basePath}/${note.id}`
                            const invitedCount = note.shares?.length ?? 0

                            return (
                                <tr key={note.id} className="notes-table-row">
                                    <td>
                                        <div className="d-flex align-items-start gap-2">
                                            <span className="fs-5 lh-1 text-muted">📝</span>
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
                                        </div>
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
                                            {note.share_type === 'invited' && (
                                                <>
                                                    Diundang
                                                    {invitedCount > 0 && ` (${invitedCount})`}
                                                </>
                                            )}
                                            {note.share_type === 'private' && 'Privat'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="small text-dark fw-medium">
                                            <i className="bi bi-person me-1 text-muted" />
                                            {isAuthor ? 'Saya' : (note.author_employee_name || note.author_employee_code)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="small text-muted">
                                            <i className="bi bi-calendar3 me-1 text-muted" />
                                            {formatDate(note.created_at)}
                                        </span>
                                    </td>
                                    <td className="text-end pe-3">
                                        <div className="d-inline-flex align-items-center gap-1">
                                            <Link
                                                to={targetUrl}
                                                className="btn btn-sm btn-outline-secondary notes-table-btn"
                                                title="Buka Catatan"
                                            >
                                                <i className="bi bi-box-arrow-up-right me-1" />
                                                <span>Buka</span>
                                            </Link>
                                            {isAuthor && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger notes-table-btn"
                                                    title="Bagikan Catatan"
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

export default NoteTableView
