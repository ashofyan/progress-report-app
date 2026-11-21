import { useState } from 'react'
import { Link } from 'react-router-dom'

import type {
    TimelineDocument,
    TimelineFeedItem,
} from '@/features/timeline/types/timeline.types'
import {
    formatDateTime,
    getAvatarStyle,
    getInitials,
} from '@/features/timeline/utils/timelineUtils'

interface TimelineFeedCardProps {
    feed: TimelineFeedItem
    hideSpkBar?: boolean
}

export const TimelineFeedCard = ({
    feed,
    hideSpkBar = false,
}: TimelineFeedCardProps) => {
    const [showPairedDp, setShowPairedDp] = useState<boolean>(false)

    const isDp = feed.type === 'daily_progress'
    const creatorName = feed.creator?.employee_name || feed.creator?.employee_code || 'Anonim'
    const avatarStyle = getAvatarStyle(creatorName)
    const initials = getInitials(creatorName)

    const renderDocumentChip = (doc: TimelineDocument) => {
        const docName = doc.original_name || 'Dokumen Lampiran'
        const docUrl = doc.url || doc.path || '#'

        return (
            <a
                key={doc.id}
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="doc-chip"
                title={docName}
            >
                <i className="bi bi-paperclip" />
                <span className="doc-name">{docName}</span>
                <i className="bi bi-box-arrow-up-right ext-icon" />
            </a>
        )
    }

    const clientDisplayName = feed.spk?.client_name
        ? `${feed.spk.client_name} (#${feed.spk.kode_klien})`
        : `#${feed.spk?.kode_klien || ''}`

    return (
        <article className="timeline-feed-card">
            <header className="timeline-feed-header">
                <div className="timeline-feed-creator-wrap">
                    <div
                        className="timeline-feed-avatar"
                        style={{
                            backgroundColor: avatarStyle.bg,
                            color: avatarStyle.color,
                            border: `1px solid ${avatarStyle.border}`,
                        }}
                    >
                        {initials}
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
                    {feed.has_paired_dp && (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle me-1" title="Laporan ini merupakan penyelesaian dari Daily Progress pagi">
                            <i className="bi bi-link-45deg me-1" />
                            DP + PR Terpadu
                        </span>
                    )}

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
                    <span className="spk-client-tag">{clientDisplayName}</span>
                    {feed.spk.job_description && (
                        <span className="spk-desc" title={feed.spk.job_description}>
                            — {feed.spk.job_description}
                        </span>
                    )}
                </div>
            )}

            {/* Task list dari laporan ini */}
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

            {/* Temuan */}
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

            {/* Catatan Umum */}
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

            {/* Dokumen Umum */}
            {feed.documents && feed.documents.length > 0 && (
                <div className="timeline-feed-documents mt-2 pt-2 border-top">
                    {feed.documents.map(renderDocumentChip)}
                </div>
            )}

            {/* Paired Daily Progress Accordion (Collapse / Expand) */}
            {feed.paired_daily_progress && (
                <div className="mt-3 pt-2 border-top">
                    <button
                        type="button"
                        className="btn btn-sm btn-light border d-flex align-items-center justify-content-between w-100 py-2 px-3 text-start"
                        onClick={() => setShowPairedDp((prev) => !prev)}
                        style={{ borderRadius: '6px', backgroundColor: '#f8f9fa' }}
                    >
                        <span className="d-flex align-items-center gap-2">
                            <i className={`bi ${showPairedDp ? 'bi-chevron-down' : 'bi-chevron-right'} text-primary`} />
                            <i className="bi bi-calendar-check text-info" />
                            <span className="fw-semibold text-dark" style={{ fontSize: '0.84rem' }}>
                                Rincian Rencana Daily Progress Pagi
                            </span>
                            <span className="text-muted small">
                                ({feed.paired_daily_progress.nomor})
                            </span>
                        </span>
                        <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: '0.74rem' }}>
                            {showPairedDp ? 'Sembunyikan' : 'Buka Rincian DP'}
                        </span>
                    </button>

                    {showPairedDp && (
                        <div className="mt-2 p-3 bg-light rounded border">
                            <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                                <span className="text-muted small">
                                    <i className="bi bi-clock me-1" />
                                    Dibuat: {formatDateTime(feed.paired_daily_progress.tanggal, feed.paired_daily_progress.created_at)}
                                </span>
                                <Link
                                    to={`/daily-progress/${feed.paired_daily_progress.reference_id}`}
                                    className="small text-decoration-none fw-semibold"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Buka Dokumen DP Asli <i className="bi bi-box-arrow-up-right ms-1" />
                                </Link>
                            </div>

                            <div className="d-flex flex-column gap-1">
                                <span className="small fw-semibold text-secondary mb-1">
                                    Tugas yang Direncanakan pada DP Ini:
                                </span>
                                {(feed.paired_daily_progress.tasks ?? []).map((t) => (
                                    <div
                                        key={t.id}
                                        className="small d-flex align-items-center justify-content-between py-1 px-2 bg-white rounded border"
                                    >
                                        <span>
                                            {t.parent_task_name && (
                                                <span className="text-muted">{t.parent_task_name} / </span>
                                            )}
                                            {t.task_name}
                                        </span>
                                        <span className="badge bg-info-subtle text-info border">
                                            Rencana Pagi
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {feed.paired_daily_progress.findings && feed.paired_daily_progress.findings.length > 0 && (
                                <div className="mt-2 pt-2 border-top">
                                    <span className="small fw-semibold text-secondary mb-1 d-block">
                                        Temuan pada DP Pagi ({feed.paired_daily_progress.findings.length}):
                                    </span>
                                    {feed.paired_daily_progress.findings.map((f) => (
                                        <div key={f.id} className="small bg-white p-2 rounded border mb-1">
                                            <p className="mb-0 text-muted">{f.keterangan}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </article>
    )
}
