import { Link } from 'react-router-dom'
import type {
    TimelineDocument,
    TimelineFeedItem,
} from '@/features/timeline/types/timeline.types'
import {
    formatDateTime,
    getAvatarStyle,
    getInitials,
    getTimelineDocumentUrl,
} from '@/features/timeline/utils/timelineUtils'

interface TimelineFeedCardProps {
    feed: TimelineFeedItem
    hideSpkBar?: boolean
}

export const TimelineFeedCard = ({
    feed,
    hideSpkBar = false,
}: TimelineFeedCardProps) => {

    const creatorName =
        feed.creator?.employee_name ??
        (feed.creator as { name_employee?: string } | undefined)?.name_employee ??
        feed.creator?.employee_code ??
        'Karyawan'
    const creatorAvatar = getAvatarStyle(creatorName)
    const isDp = feed.type === 'daily_progress'

    const renderDocumentChip = (doc: TimelineDocument) => {
        const url = getTimelineDocumentUrl(doc)
        const name = doc.original_name ?? doc.path ?? 'Dokumen'

        return (
            <a
                key={doc.id}
                href={url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="doc-chip"
                title={name}
            >
                <i className="bi bi-paperclip" />
                <span>{name}</span>
            </a>
        )
    }

    return (
        <article className="timeline-feed-card">
            <header className="timeline-feed-header">
                <div className="timeline-feed-creator-wrap">
                    <div
                        className="timeline-feed-avatar"
                        style={{
                            backgroundColor: creatorAvatar.bg,
                            color: creatorAvatar.color,
                            border: `1px solid ${creatorAvatar.border}`,
                        }}
                    >
                        {getInitials(creatorName)}
                    </div>

                    <div className="timeline-feed-creator-info">
                        <span className="creator-name">
                            {creatorName}
                        </span>
                        <div className="creator-sub">
                            {feed.creator?.tingkat !== undefined && (
                                <span className="creator-level">
                                    Tingkat {feed.creator.tingkat}
                                </span>
                            )}
                            <span className="feed-date">
                                {formatDateTime(feed.tanggal, feed.created_at)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="timeline-feed-type-meta">
                    <span className={`type-badge ${isDp ? 'dp' : 'pr'}`}>
                        <i
                            className={`bi ${
                                isDp
                                    ? 'bi-calendar-check'
                                    : 'bi-journal-check'
                            }`}
                        />
                        {isDp ? 'Daily Progress' : 'Progress Report'}
                    </span>

                    <Link
                        to={isDp ? `/daily-progress/${feed.reference_id}` : `/progress-report/${feed.reference_id}`}
                        className="doc-number doc-number-link"
                        title={`Buka detail ${isDp ? 'Daily Progress' : 'Progress Report'} ${feed.nomor}`}
                    >
                        <span>{feed.nomor}</span>
                        <i className="bi bi-box-arrow-up-right ms-1" />
                    </Link>
                </div>
            </header>

            {!hideSpkBar && feed.spk && (
                <div className="timeline-feed-spk-bar">
                    <i className="bi bi-briefcase-fill" />
                    <span className="spk-number">{feed.spk.no_spk}</span>
                    <span className="spk-client-tag">#{feed.spk.kode_klien}</span>
                    {feed.spk.job_description && (
                        <span className="spk-desc" title={feed.spk.job_description}>
                            — {feed.spk.job_description}
                        </span>
                    )}
                </div>
            )}


            <div className="timeline-feed-tasks">
                {(feed.tasks ?? []).map((task) => {
                    const isCompleted =
                        task.is_checked !== undefined
                            ? Boolean(task.is_checked)
                            : task.status === 'selesai'

                    return (
                        <div key={task.id} className="timeline-feed-task-item">
                            <div className="task-top-row">
                                <span className="task-name">
                                    {task.parent_task_name && (
                                        <span className="parent-task">
                                            {task.parent_task_name} /{' '}
                                        </span>
                                    )}
                                    {task.task_name}
                                </span>

                                <span
                                    className={`task-status-pill ${
                                        isCompleted ? 'selesai' : 'pending'
                                    }`}
                                >
                                    <i
                                        className={`bi ${
                                            isCompleted
                                                ? 'bi-check2-circle'
                                                : 'bi-hourglass-split'
                                        }`}
                                    />
                                    {isCompleted ? 'Selesai' : 'Pending'}
                                </span>
                            </div>

                        {task.catatan && (
                            <div className="task-note-box">
                                <i className="bi bi-chat-left-text" />
                                <span>{task.catatan}</span>
                            </div>
                        )}

                        {task.notes && task.notes.length > 0 && (
                            <div className="d-flex flex-column gap-1 mt-1">
                                {task.notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="task-note-box"
                                    >
                                        <i className="bi bi-chat-left-text" />
                                        <span>{note.catatan}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {task.documents && task.documents.length > 0 && (
                            <div className="timeline-feed-documents">
                                {task.documents.map(renderDocumentChip)}
                            </div>
                        )}
                    </div>
                    )
                })}
            </div>

            {feed.findings && feed.findings.length > 0 && (
                <div className="timeline-feed-findings">
                    <h5 className="findings-title">
                        <i className="bi bi-exclamation-triangle" />
                        <span>Temuan ({feed.findings.length})</span>
                    </h5>

                    {feed.findings.map((finding) => {
                        const findingTitle =
                            finding.source_type === 'master'
                                ? finding.master_task?.task_name ?? 'Master Task'
                                : finding.source_type === 'additional'
                                ? finding.additional_task?.task_name ?? 'Additional Task'
                                : null

                        return (
                            <div key={finding.id} className="finding-item">
                                {findingTitle && <strong>{findingTitle}</strong>}
                                <p className="mb-0">{finding.keterangan}</p>

                            {finding.documents &&
                                finding.documents.length > 0 && (
                                    <div className="timeline-feed-documents mt-1">
                                        {finding.documents.map(
                                            renderDocumentChip,
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {feed.notes && feed.notes.length > 0 && (
                <div className="mt-2 pt-2 border-top">
                    {feed.notes.map((note) => (
                        <div key={note.id} className="task-note-box mb-1">
                            <i className="bi bi-info-circle" />
                            <span>
                                {note.judul ? (
                                    <strong>{note.judul}: </strong>
                                ) : null}
                                {note.catatan}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {feed.documents && feed.documents.length > 0 && (
                <div className="timeline-feed-documents mt-2 pt-2 border-top">
                    {feed.documents.map(renderDocumentChip)}
                </div>
            )}
        </article>
    )
}
