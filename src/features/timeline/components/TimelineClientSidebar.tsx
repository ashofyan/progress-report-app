import { useMemo, useState, type ChangeEvent } from 'react'

import type { TimelineClientItem } from '@/features/timeline/types/timeline.types'
import { getAvatarStyle, getInitials } from '@/features/timeline/utils/timelineUtils'

interface TimelineClientSidebarProps {
    clients: TimelineClientItem[]
    selectedClientCode: string
    onSelectClient: (clientCode: string) => void
    isLoading?: boolean
}

export const TimelineClientSidebar = ({
    clients,
    selectedClientCode,
    onSelectClient,
    isLoading = false,
}: TimelineClientSidebarProps) => {
    const [searchQuery, setSearchQuery] = useState<string>('')

    const filteredClients = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) {
            return clients
        }
        return clients.filter((client) =>
            client.kode_klien.toLowerCase().includes(query) ||
            (client.client_name && client.client_name.toLowerCase().includes(query)),
        )
    }, [clients, searchQuery])

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setSearchQuery(event.target.value)
    }

    return (
        <aside className="timeline-sidebar">
            <div className="timeline-sidebar-header">
                <h3 className="timeline-sidebar-title">
                    <i className="bi bi-building" />
                    <span>Daftar Client</span>
                </h3>
                <span className="timeline-badge-count">{clients.length}</span>
            </div>

            <div className="timeline-search-box">
                <i className="bi bi-search" />
                <input
                    type="text"
                    value={searchQuery}
                    placeholder="Cari Client / Kode..."
                    onChange={handleSearchChange}
                />
            </div>

            <div className="timeline-spk-list">
                <button
                    type="button"
                    className={`timeline-spk-all-item ${
                        selectedClientCode === '' ? 'active' : ''
                    }`}
                    onClick={() => onSelectClient('')}
                >
                    <div className="timeline-spk-all-left">
                        <i className="bi bi-layers" />
                        <span className="timeline-spk-all-label">Semua Client</span>
                    </div>
                    <span className="timeline-active-dot" />
                </button>

                {filteredClients.map((client) => {
                    const avatarStyle = getAvatarStyle(client.kode_klien)
                    const isSelected = selectedClientCode === client.kode_klien
                    const displayName = client.client_name || client.kode_klien

                    return (
                        <button
                            key={client.kode_klien}
                            type="button"
                            className={`timeline-spk-item ${
                                isSelected ? 'active' : ''
                            }`}
                            onClick={() => onSelectClient(client.kode_klien)}
                            title={`${displayName} (#${client.kode_klien})`}
                        >
                            <div
                                className="timeline-spk-avatar"
                                style={{
                                    backgroundColor: avatarStyle.bg,
                                    color: avatarStyle.color,
                                    border: `1px solid ${avatarStyle.border}`,
                                }}
                            >
                                {getInitials(displayName)}
                            </div>

                            <div className="timeline-spk-info">
                                <div className="timeline-spk-name-row">
                                    <span
                                        className="timeline-spk-name"
                                        title={displayName}
                                    >
                                        {displayName}
                                    </span>
                                </div>

                                <p className="timeline-spk-desc">
                                    <span className="text-secondary fw-semibold">#{client.kode_klien}</span> • {client.total_spk} SPK
                                </p>

                                <div className="timeline-spk-badges">
                                    {client.total_daily_progress > 0 && (
                                        <span className="spk-stat-badge">
                                            {client.total_daily_progress} DP
                                        </span>
                                    )}
                                    {client.total_progress_report > 0 && (
                                        <span className="spk-stat-badge">
                                            {client.total_progress_report} PR
                                        </span>
                                    )}
                                </div>
                            </div>

                            <span className="timeline-active-dot" />
                        </button>
                    )
                })}

                {!isLoading && filteredClients.length === 0 && (
                    <div className="text-center py-4 text-muted small">
                        Tidak ada Client yang cocok.
                    </div>
                )}
            </div>
        </aside>
    )
}
