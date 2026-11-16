import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import NoteBlockViewer from '@/features/notes/components/NoteBlockViewer'
import type { Note } from '@/features/notes/types/notes.types'

interface NoteCardProps {
    note: Note
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

export const NoteCard = ({ note, onShareClick, basePath }: NoteCardProps) => {
    const { employee } = useAuth()
    const isAuthor =
        employee?.employee_code !== undefined
            ? note.author_employee_code === employee.employee_code
            : false

    const isMeeting =
        note.type === 'meeting' ||
        (note.meeting_scope !== undefined && note.meeting_scope !== null)
    const attendeeCount = note.shares?.filter((s) => s.is_attendance).length ?? 0
    const invitedCount = note.shares?.length ?? 0
    const reportNumber = note.report_number || note.report_no

    const targetUrl = basePath
        ? `${basePath}/${note.id}`
        : isMeeting
        ? `/notulen/${note.id}`
        : `/notes/${note.id}`

    return (
        <div className="notes-card">
            {/* Header: Icon + Badges */}
            <div className="notes-card-header">
                <div className="d-flex align-items-center gap-2">
                    <span className="notes-card-icon">
                        {isMeeting ? '👥' : '📝'}
                    </span>
                    <span
                        className={`notes-tag ${
                            isMeeting ? 'tag-meeting' : 'tag-standard'
                        }`}
                    >
                        {isMeeting ? 'Notulen' : 'Standar'}
                    </span>
                </div>

                <div className="d-flex align-items-center gap-1 flex-wrap">
                    {isMeeting && reportNumber && (
                        <span className="notes-tag tag-standard" title="Nomor Notulen">
                            <i className="bi bi-hash text-muted" />
                            {reportNumber}
                        </span>
                    )}

                    {isMeeting && note.meeting_scope === 'client' && (
                        <span className="notes-tag tag-primary">
                            Klien #{note.client_id ?? '-'}
                        </span>
                    )}

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
                </div>
            </div>

            {/* Title */}
            <h3 className="notes-card-title">
                <Link
                    to={targetUrl}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                >
                    {note.title || 'Tanpa Judul'}
                </Link>
            </h3>

            {/* Snippet Preview */}
            <div className="notes-card-preview">
                <NoteBlockViewer content={note.content} showSummaryOnly />
            </div>

            {/* Footer Metadata */}
            <div className="notes-card-footer">
                <span>
                    <i className="bi bi-calendar3 me-1" />
                    {formatDate(note.created_at)}
                </span>

                <span>
                    <i className="bi bi-person me-1" />
                    {isAuthor ? 'Saya' : note.author_employee_code}
                </span>

                {isMeeting && attendeeCount > 0 && (
                    <span style={{ color: '#e64b38', fontWeight: 500 }}>
                        <i className="bi bi-people me-1" />
                        {attendeeCount} hadir
                    </span>
                )}
                {!isMeeting && invitedCount > 0 && (
                    <span>
                        <i className="bi bi-person-check me-1" />
                        {invitedCount} diundang
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="notes-card-actions">
                <Link
                    to={targetUrl}
                    className="notes-card-action-btn flex-grow-1 text-center"
                >
                    <span>{isMeeting ? 'Buka Notulen' : 'Buka Catatan'}</span>
                    <i className="bi bi-arrow-right" />
                </Link>

                {isAuthor && (
                    <button
                        type="button"
                        className="notes-card-share-btn"
                        title="Atur Pembagian"
                        onClick={() => onShareClick(note)}
                    >
                        <i className="bi bi-share" />
                    </button>
                )}
            </div>
        </div>
    )
}

export default NoteCard
