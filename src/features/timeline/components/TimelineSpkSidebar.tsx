import { useMemo, useState, type ChangeEvent } from 'react'

import type { TimelineSpkItem } from '@/features/timeline/types/timeline.types'
import { getAvatarStyle, getInitials } from '@/features/timeline/utils/timelineUtils'

interface TimelineSpkSidebarProps {
    spks: TimelineSpkItem[]
    selectedSpkId: number | null
    onSelectSpk: (spkId: number | null) => void
    isLoading?: boolean
}

export const TimelineSpkSidebar = ({
    spks,
    selectedSpkId,
    onSelectSpk,
    isLoading = false,
}: TimelineSpkSidebarProps) => {
    const [searchQuery, setSearchQuery] = useState<string>('')

    const filteredSpks = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) {
            return spks
        }
        return spks.filter(
            (spk) =>
                spk.no_spk.toLowerCase().includes(query) ||
                spk.kode_klien.toLowerCase().includes(query) ||
                (spk.job_description &&
                    spk.job_description.toLowerCase().includes(query)) ||
                (spk.job_code && spk.job_code.toLowerCase().includes(query)),
        )
    }, [spks, searchQuery])

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setSearchQuery(event.target.value)
    }

    return (
        <aside className="timeline-sidebar">
            <div className="timeline-sidebar-header">
                <h3 className="timeline-sidebar-title">
                    <i className="bi bi-people" />
                    <span>Daftar SPK</span>
                </h3>
                <span className="timeline-badge-count">{spks.length}</span>
            </div>

            <div className="timeline-search-box">
                <i className="bi bi-search" />
                <input
                    type="text"
                    value={searchQuery}
                    placeholder="Cari SPK..."
                    onChange={handleSearchChange}
                />
            </div>

            <div className="timeline-spk-list">
                <button
                    type="button"
                    className={`timeline-spk-all-item ${
                        selectedSpkId === null ? 'active' : ''
                    }`}
                    onClick={() => onSelectSpk(null)}
                >
                    <div className="timeline-spk-all-left">
                        <i className="bi bi-layers" />
                        <span className="timeline-spk-all-label">Semua SPK</span>
                    </div>
                    <span className="timeline-active-dot" />
                </button>

                {filteredSpks.map((spk) => {
                    const avatarStyle = getAvatarStyle(spk.kode_klien || spk.no_spk)
                    const isSelected = selectedSpkId === spk.id

                    return (
                        <button
                            key={spk.id}
                            type="button"
                            className={`timeline-spk-item ${
                                isSelected ? 'active' : ''
                            }`}
                            onClick={() => onSelectSpk(spk.id)}
                        >
                            <div
                                className="timeline-spk-avatar"
                                style={{
                                    backgroundColor: avatarStyle.bg,
                                    color: avatarStyle.color,
                                    border: `1px solid ${avatarStyle.border}`,
                                }}
                            >
                                {getInitials(spk.kode_klien || spk.no_spk)}
                            </div>

                            <div className="timeline-spk-info">
                                <div className="timeline-spk-name-row">
                                    <span
                                        className="timeline-spk-name"
                                        title={spk.no_spk}
                                    >
                                        {spk.no_spk}
                                    </span>
                                </div>

                                <p
                                    className="timeline-spk-desc"
                                    title={spk.job_description ?? spk.kode_klien}
                                >
                                    #{spk.kode_klien}
                                    {spk.job_description
                                        ? ` • ${spk.job_description}`
                                        : ''}
                                </p>

                                <div className="timeline-spk-badges">
                                    {spk.total_daily_progress > 0 && (
                                        <span className="spk-stat-badge">
                                            {spk.total_daily_progress} DP
                                        </span>
                                    )}
                                    {spk.total_progress_report > 0 && (
                                        <span className="spk-stat-badge">
                                            {spk.total_progress_report} PR
                                        </span>
                                    )}
                                </div>
                            </div>

                            <span className="timeline-active-dot" />
                        </button>
                    )
                })}

                {!isLoading && filteredSpks.length === 0 && (
                    <div className="text-center py-4 text-muted small">
                        Tidak ada SPK yang cocok.
                    </div>
                )}
            </div>
        </aside>
    )
}
