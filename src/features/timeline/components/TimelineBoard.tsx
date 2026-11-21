import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'

import { timelineApi } from '@/features/timeline/api/timelineApi'
import { TimelineClientSidebar } from '@/features/timeline/components/TimelineClientSidebar'
import { TimelineFeedCard } from '@/features/timeline/components/TimelineFeedCard'
import type {
    TimelineClientItem,
    TimelineData,
    TimelineFeedItem,
    TimelineFeedType,
    TimelineFilters,
    TimelineSpkItem,
} from '@/features/timeline/types/timeline.types'
import { getAvatarStyle, getInitials } from '@/features/timeline/utils/timelineUtils'

import '@/features/timeline/styles/timeline.scss'

interface GroupStats {
    totalFeeds: number
    totalDp: number
    totalPr: number
    totalCompleted: number
    totalPending: number
    activeContributors: number
}

interface FeedGroup {
    key: string
    isSpk: boolean
    title: string
    clientCode?: string
    clientName?: string
    badgeText?: string
    badgeSub?: string
    subtitle?: string
    team?: Array<{
        kode: string
        name: string
        tingkat?: number
    }>
    stats: GroupStats
    feeds: TimelineFeedItem[]
}

export const TimelineBoard = () => {
    const [clients, setClients] = useState<TimelineClientItem[]>([])
    const [selectedClientCode, setSelectedClientCode] = useState<string>('')
    const [spks, setSpks] = useState<TimelineSpkItem[]>([])
    const [selectedSpkId, setSelectedSpkId] = useState<number | null>(null)
    const [timelineData, setTimelineData] = useState<TimelineData | null>(null)

    // Filters
    const [feedTypeFilter, setFeedTypeFilter] = useState<'all' | TimelineFeedType>('all')
    const [employeeFilter, setEmployeeFilter] = useState<string>('')
    const [dateFilter, setDateFilter] = useState<string>('')

    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Fetch initial list of Clients
    const fetchClients = useCallback(async (): Promise<void> => {
        const result = await timelineApi.getClients()
        if (result.success && result.data !== undefined) {
            setClients(result.data)
        }
    }, [])

    // Fetch list of SPKs (can be filtered per client_code)
    const fetchSpks = useCallback(async (clientCode?: string): Promise<void> => {
        const result = await timelineApi.getSpks(clientCode ? { client_code: clientCode } : {})
        if (result.success && result.data !== undefined) {
            setSpks(result.data)
        }
    }, [])

    // Fetch timeline data
    const fetchTimeline = useCallback(
        async (isBackgroundRefresh = false): Promise<void> => {
            if (isBackgroundRefresh) {
                setIsRefreshing(true)
            } else {
                setIsLoading(true)
            }
            setErrorMessage(null)

            const filters: TimelineFilters = {
                client_code: selectedClientCode || undefined,
                als_spk_id: selectedSpkId ?? undefined,
                type: feedTypeFilter !== 'all' ? feedTypeFilter : undefined,
                employee_code: employeeFilter || undefined,
                tanggal: dateFilter || undefined,
            }

            const result = await timelineApi.getTimeline(filters)

            if (result.success && result.data !== undefined) {
                const responseData = result.data
                setTimelineData(responseData)

                // If available_clients exists in response and clients state is empty, keep clients updated
                if (responseData.available_clients && responseData.available_clients.length > 0) {
                    const fallbackClients = responseData.available_clients
                    setClients((prev) => (prev.length > 0 ? prev : fallbackClients))
                }

                // If available_spks exists in response, keep SPK list updated
                if (responseData.available_spks && responseData.available_spks.length > 0) {
                    setSpks(responseData.available_spks)
                }
            } else {
                setErrorMessage(result.message)
            }

            setIsLoading(false)
            setIsRefreshing(false)
        },
        [selectedClientCode, selectedSpkId, feedTypeFilter, employeeFilter, dateFilter],
    )

    // Initial load
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchClients()
            void fetchSpks()
        }, 0)

        return () => {
            window.clearTimeout(timer)
        }
    }, [fetchClients, fetchSpks])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchTimeline()
        }, 0)

        return () => {
            window.clearTimeout(timer)
        }
    }, [fetchTimeline])

    const handleSelectClient = (clientCode: string): void => {
        setSelectedClientCode(clientCode)
        setSelectedSpkId(null)
        setEmployeeFilter('')
        void fetchSpks(clientCode || undefined)
    }

    const handleSpkChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        const value = event.target.value
        setSelectedSpkId(value ? Number(value) : null)
        setEmployeeFilter('')
    }

    const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        setFeedTypeFilter(event.target.value as 'all' | TimelineFeedType)
    }

    const handleEmployeeChange = (event: ChangeEvent<HTMLSelectElement>): void => {
        setEmployeeFilter(event.target.value)
    }

    const handleDateChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setDateFilter(event.target.value)
    }

    const handleClearDate = (): void => {
        setDateFilter('')
    }

    const handleRefresh = (): void => {
        void fetchClients()
        void fetchSpks(selectedClientCode || undefined)
        void fetchTimeline(true)
    }

    const currentSpk = timelineData?.current_spk
    const summary = timelineData?.summary
    const feeds = useMemo(() => timelineData?.feeds ?? [], [timelineData])

    // Client options for sidebar
    const clientOptions = useMemo(() => {
        if (clients.length > 0) {
            return clients
        }
        return timelineData?.available_clients ?? []
    }, [clients, timelineData?.available_clients])

    // Available employees for filter (from all active feeds and selected SPK teams)
    const availableEmployees = useMemo(() => {
        const map = new Map<string, string>()

        // 1. Ambil seluruh pembuat aktivitas yang ada di feeds
        timelineData?.feeds?.forEach((feed) => {
            if (feed.creator?.employee_code && feed.creator?.employee_name) {
                map.set(feed.creator.employee_code, feed.creator.employee_name)
            }
        })

        // 2. Jika SPK spesifik dipilih, gabungkan juga anggota tim SPK tersebut
        if (selectedSpkId && currentSpk?.teams) {
            currentSpk.teams.forEach((member) => {
                map.set(member.kode_employee, member.name_employee)
            })
        }

        return Array.from(map.entries())
            .map(([code, name]) => ({
                code,
                name,
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [selectedSpkId, currentSpk, timelineData])

    // Mode determination: true jika Client, SPK, atau Employee dipilih (langsung menampilkan Feed)
    const isDetailSpkMode = Boolean(selectedClientCode || selectedSpkId || employeeFilter)

    // Calculate group stats helper
    const calculateGroupStats = useCallback((groupFeeds: TimelineFeedItem[]): GroupStats => {
        let totalCompleted = 0
        let totalPending = 0
        const contributorSet = new Set<string>()

        groupFeeds.forEach((feed) => {
            if (feed.creator?.employee_code) {
                contributorSet.add(feed.creator.employee_code)
            }
            feed.tasks?.forEach((task) => {
                const isCompleted =
                    task.is_checked !== undefined
                        ? Boolean(task.is_checked)
                        : task.status === 'selesai'

                if (isCompleted) {
                    totalCompleted++
                } else {
                    totalPending++
                }
            })
        })

        return {
            totalFeeds: groupFeeds.length,
            totalDp: groupFeeds.filter((f) => f.type === 'daily_progress').length,
            totalPr: groupFeeds.filter((f) => f.type === 'progress_report').length,
            totalCompleted,
            totalPending,
            activeContributors: contributorSet.size,
        }
    }, [])

    // DETAIL MODE: Groups feeds per Client & SPK with sticky headers
    const spkFeedGroups = useMemo<FeedGroup[]>(() => {
        if (!isDetailSpkMode || !feeds || feeds.length === 0) {
            return []
        }

        const spkMap = new Map<string, TimelineFeedItem[]>()

        feeds.forEach((feed) => {
            const clientKey = feed.spk?.kode_klien || selectedClientCode || 'OTHER'
            const spkKey =
                feed.spk?.no_spk || (feed.spk?.id ? `SPK-${feed.spk.id}` : 'SPK-Lainnya')
            const groupKey = `${clientKey}__${spkKey}`
            if (!spkMap.has(groupKey)) {
                spkMap.set(groupKey, [])
            }
            spkMap.get(groupKey)!.push(feed)
        })

        return Array.from(spkMap.entries()).map(([groupKey, groupFeeds]) => {
            const sampleFeed = groupFeeds[0]
            const [grpClientCode, grpSpkNo] = groupKey.split('__')
            const spkNo = sampleFeed?.spk?.no_spk || grpSpkNo
            const spkMeta = spks.find(
                (s) =>
                    (spkNo && s.no_spk === spkNo) ||
                    (sampleFeed?.spk?.id && s.id === sampleFeed.spk.id),
            )

            const noSpk = spkMeta?.no_spk || sampleFeed?.spk?.no_spk || spkNo || groupKey
            const clientCode =
                spkMeta?.kode_klien || sampleFeed?.spk?.kode_klien || selectedClientCode || grpClientCode
            const clientMeta = clientOptions.find((c) => c.kode_klien === clientCode)
            const clientName =
                sampleFeed?.spk?.client_name || spkMeta?.client_name || clientMeta?.client_name || clientCode
            const jobDesc =
                spkMeta?.job_description || sampleFeed?.spk?.job_description || null
            const jobCode = spkMeta?.job_code || null
            const jenis =
                spkMeta?.jenis ||
                (currentSpk?.id === spkMeta?.id ? currentSpk?.jenis : null)

            // Team members: from currentSpk if it matches this SPK, or derived from group feed creators
            let team: Array<{ kode: string; name: string; tingkat?: number }> = []
            if (
                currentSpk &&
                (currentSpk.no_spk === noSpk || currentSpk.id === spkMeta?.id) &&
                currentSpk.teams
            ) {
                team = currentSpk.teams.map((t) => ({
                    kode: t.kode_employee,
                    name: t.name_employee,
                    tingkat: t.tingkat,
                }))
            } else {
                const teamMap = new Map<
                    string,
                    { kode: string; name: string; tingkat?: number }
                >()
                groupFeeds.forEach((f) => {
                    if (f.creator?.employee_code && f.creator?.employee_name) {
                        teamMap.set(f.creator.employee_code, {
                            kode: f.creator.employee_code,
                            name: f.creator.employee_name,
                            tingkat: f.creator.tingkat,
                        })
                    }
                })
                team = Array.from(teamMap.values())
            }

            const stats = calculateGroupStats(groupFeeds)
            const subParts: string[] = []
            if (jobCode) subParts.push(jobCode)
            if (jobDesc) subParts.push(jobDesc)
            const subtitle =
                subParts.length > 0
                    ? subParts.join(' — ')
                    : (spkMeta?.jenis ?? undefined)

            return {
                key: `group-${groupKey}`,
                isSpk: true,
                title: noSpk,
                clientCode,
                clientName,
                badgeText: clientName ? `${clientName} (#${clientCode})` : `#${clientCode}`,
                badgeSub: jenis ?? undefined,
                subtitle,
                team,
                stats,
                feeds: groupFeeds,
            }
        })
    }, [isDetailSpkMode, feeds, spks, selectedClientCode, clientOptions, currentSpk, calculateGroupStats])

    // SUMMARY MODE: Ringkasan Semua Client
    const clientSummaries = useMemo(() => {
        if (isDetailSpkMode) {
            return []
        }

        return clientOptions.map((client) => {
            const clientSpks = spks.filter((s) => s.kode_klien === client.kode_klien)
            const effectiveSpks =
                clientSpks.length > 0
                    ? clientSpks
                    : (client.spks ?? []).map((s) => ({
                          id: s.id,
                          no_spk: s.no_spk,
                          kode_klien: client.kode_klien,
                          client_name: client.client_name,
                          jenis: '',
                          job_description: s.job_description,
                          total_daily_progress: s.total_daily_progress,
                          total_progress_report: s.total_progress_report,
                      }))

            const clientFeeds = feeds.filter(
                (f) => f.spk?.kode_klien === client.kode_klien,
            )

            const stats = calculateGroupStats(clientFeeds)

            const totalDp =
                stats.totalDp > 0 ? stats.totalDp : client.total_daily_progress
            const totalPr =
                stats.totalPr > 0 ? stats.totalPr : client.total_progress_report
            const totalFeeds =
                stats.totalFeeds > 0 ? stats.totalFeeds : totalDp + totalPr

            return {
                kode_klien: client.kode_klien,
                client_name: client.client_name || client.kode_klien,
                spks: effectiveSpks,
                stats: {
                    ...stats,
                    totalFeeds,
                    totalDp,
                    totalPr,
                },
            }
        })
    }, [isDetailSpkMode, clientOptions, spks, feeds, calculateGroupStats])

    return (
        <div className="timeline-page">
            {/* Top Page Heading */}
            <div className="timeline-heading">
                <h1 className="timeline-title">Log Aktifitas Tim</h1>
                <p className="timeline-subtitle">
                    Pantau aktivitas laporan harian tim per SPK dan per Client secara real-time.
                </p>
            </div>

            {/* Section Header: Icon, Subtitle, and Filter Controls */}
            <div className="timeline-section-header">
                <div className="timeline-section-title-wrap">
                    <div className="timeline-section-icon">
                        <i className="bi bi-clock-history text-primary" />
                    </div>
                    <div>
                        <h2 className="timeline-section-title">
                            Log Aktifitas Tim
                        </h2>
                        <p className="timeline-section-desc">
                            Pantau riwayat aktivitas Daily Progress dan Progress Report tim secara terpadu.
                        </p>
                    </div>
                </div>

                <div className="timeline-filters-bar">
                    {/* Filter SPK Dropdown */}
                    <select
                        className="timeline-select timeline-spk-select"
                        value={selectedSpkId ?? ''}
                        onChange={handleSpkChange}
                        title="Filter SPK"
                    >
                        <option value="">
                            {selectedClientCode
                                ? `Semua SPK (${selectedClientCode})`
                                : 'Semua SPK'}
                        </option>
                        {spks.map((spk) => (
                            <option key={spk.id} value={spk.id}>
                                {spk.no_spk}
                                {spk.client_name ? ` (${spk.client_name})` : ''}
                                {spk.job_description ? ` — ${spk.job_description}` : ''}
                            </option>
                        ))}
                    </select>

                    {/* Filter Type */}
                    <select
                        className="timeline-select"
                        value={feedTypeFilter}
                        onChange={handleTypeChange}
                        title="Filter Tipe Laporan"
                    >
                        <option value="all">Semua Laporan</option>
                        <option value="daily_progress">Daily Progress</option>
                        <option value="progress_report">Progress Report</option>
                    </select>

                    {/* Filter Karyawan/Team */}
                    {availableEmployees.length > 0 && (
                        <select
                            className="timeline-select"
                            value={employeeFilter}
                            onChange={handleEmployeeChange}
                            title="Filter Anggota Tim"
                        >
                            <option value="">Semua Karyawan</option>
                            {availableEmployees.map((emp) => (
                                <option key={emp.code} value={emp.code}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Filter Tanggal */}
                    <div className="timeline-date-filter-group">
                        <span className="timeline-date-label">Tgl:</span>
                        <div className="timeline-date-input-wrap">
                            <input
                                type="date"
                                className="timeline-date-input"
                                value={dateFilter}
                                onChange={handleDateChange}
                                title="Pilih Tanggal Laporan"
                            />
                            {dateFilter && (
                                <button
                                    type="button"
                                    className="timeline-date-clear-btn"
                                    onClick={handleClearDate}
                                    title="Hapus filter tanggal"
                                    aria-label="Hapus filter tanggal"
                                >
                                    <i className="bi bi-x-circle-fill" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        className={`timeline-refresh-btn ${
                            isRefreshing ? 'refreshing' : ''
                        }`}
                        onClick={handleRefresh}
                        title="Muat ulang timeline"
                        aria-label="Muat ulang timeline"
                        disabled={isLoading || isRefreshing}
                    >
                        <i className="bi bi-arrow-clockwise" />
                    </button>
                </div>
            </div>

            {/* Layout: Sidebar + Main Content */}
            <div className="timeline-layout">
                {/* Left Sidebar: List of Clients */}
                <TimelineClientSidebar
                    clients={clientOptions}
                    selectedClientCode={selectedClientCode}
                    onSelectClient={handleSelectClient}
                    isLoading={isLoading}
                />

                {/* Main Content Area */}
                <main className="timeline-content">
                    {/* Loading Box */}
                    {isLoading && (
                        <div className="timeline-loading-box">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Memuat...</span>
                            </div>
                            <p>Memuat aktivitas timeline...</p>
                        </div>
                    )}

                    {/* Error Box */}
                    {!isLoading && errorMessage && (
                        <div className="timeline-error-box">
                            <i className="bi bi-exclamation-triangle" />
                            <p>{errorMessage}</p>
                            <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => void fetchTimeline()}
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    {/* Overview Header Bar (Detail / Filter Mode) */}
                    {!isLoading && !errorMessage && isDetailSpkMode && summary && (
                        <div className="timeline-client-overview-bar">
                            <div className="overview-left">
                                {selectedClientCode ? (
                                    <>
                                        <span className="overview-client-title">
                                            Client <strong>{timelineData?.current_client_name || selectedClientCode}</strong>
                                            <span className="badge bg-light text-secondary border ms-2">#{selectedClientCode}</span>
                                        </span>
                                        <span className="overview-badge">
                                            Multi-SPK Feed
                                        </span>
                                        <span className="overview-desc">
                                            {spkFeedGroups.length} Kelompok SPK
                                        </span>
                                    </>
                                ) : employeeFilter ? (
                                    <>
                                        <span className="overview-client-title">
                                            Aktivitas: <strong>{availableEmployees.find((e) => e.code === employeeFilter)?.name || employeeFilter}</strong>
                                        </span>
                                        <span className="overview-badge">
                                            Live Feed Karyawan
                                        </span>
                                        <span className="overview-desc">
                                            {spkFeedGroups.length} SPK / Client
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="overview-client-title">
                                            Detail <strong>Log Aktifitas SPK</strong>
                                        </span>
                                        <span className="overview-badge">
                                            SPK Feed
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="overview-right">
                                <span className="overview-stat">
                                    <strong>{summary.total_feeds}</strong> Total Aktivitas
                                </span>
                                <span className="overview-stat text-success">
                                    <strong>{summary.total_tasks_completed}</strong> Selesai
                                </span>
                                {summary.total_tasks_pending > 0 && (
                                    <span className="overview-stat text-warning">
                                        <strong>{summary.total_tasks_pending}</strong> Pending
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Overview Bar for All Clients Mode */}
                    {!isLoading && !errorMessage && !isDetailSpkMode && summary && (
                        <div className="timeline-client-overview-bar">
                            <div className="overview-left">
                                <span className="overview-client-title">
                                    Ringkasan <strong>Semua Client</strong>
                                </span>
                                <span className="overview-badge">
                                    Executive Overview
                                </span>
                                <span className="overview-desc">
                                    {clientSummaries.length} Client Aktif
                                </span>
                            </div>
                            <div className="overview-right">
                                <span className="overview-stat">
                                    <strong>{summary.total_feeds}</strong> Total Aktivitas
                                </span>
                                <span className="overview-stat">
                                    <strong>{summary.total_daily_progress}</strong> DP
                                </span>
                                <span className="overview-stat">
                                    <strong>{summary.total_progress_report}</strong> PR
                                </span>
                                {summary.total_tasks_completed > 0 && (
                                    <span className="overview-stat text-success">
                                        <strong>{summary.total_tasks_completed}</strong> Selesai
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading &&
                        !errorMessage &&
                        (isDetailSpkMode
                            ? spkFeedGroups.length === 0
                            : clientSummaries.length === 0) && (
                            <div className="timeline-empty-box">
                                <i className="bi bi-inbox" />
                                <p>
                                    Belum ada aktivitas (Daily Progress atau Progress Report) untuk
                                    filter yang dipilih.
                                </p>
                            </div>
                        )}

                    {/* ============================================================== */}
                    {/* MODE 1: SEMUA CLIENT -> CARD CLIENT SAJA (EXECUTIVE OVERVIEW) */}
                    {/* ============================================================== */}
                    {!isLoading && !errorMessage && !isDetailSpkMode && clientSummaries.length > 0 && (
                        <div className="timeline-client-cards-list">
                            {clientSummaries.map((item) => {
                                const avatarStyle = getAvatarStyle(item.client_name || item.kode_klien)
                                const initials = getInitials(item.client_name || item.kode_klien)
                                return (
                                    <div
                                        key={item.kode_klien}
                                        className="timeline-client-card"
                                        onClick={() => handleSelectClient(item.kode_klien)}
                                        role="button"
                                        tabIndex={0}
                                        title={`Buka detail log aktifitas klien ${item.client_name || item.kode_klien}`}
                                    >
                                        <div className="client-card-header">
                                            <div className="client-card-info">
                                                <div
                                                    className="client-card-avatar"
                                                    style={{
                                                        backgroundColor: avatarStyle.bg,
                                                        color: avatarStyle.color,
                                                        borderColor: avatarStyle.border,
                                                    }}
                                                >
                                                    {initials}
                                                </div>
                                                <div>
                                                    <div className="client-card-title-row">
                                                        <h4 className="client-name">
                                                            {item.client_name}
                                                            {item.client_name !== item.kode_klien && (
                                                                <span className="badge bg-light text-secondary border ms-2" style={{ fontSize: '0.72rem' }}>
                                                                    #{item.kode_klien}
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <i className="bi bi-arrow-right client-card-arrow" />
                                                    </div>
                                                    <p className="client-desc">
                                                        Ringkasan aktivitas seluruh SPK milik {item.client_name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="timeline-summary-chips">
                                            <span className="summary-chip primary">
                                                <i className="bi bi-activity" />
                                                {item.stats.totalFeeds} Aktivitas
                                            </span>
                                            <span className="summary-chip info">
                                                <i className="bi bi-calendar-check" />
                                                {item.stats.totalDp} DP
                                            </span>
                                            <span className="summary-chip purple">
                                                <i className="bi bi-journal-check" />
                                                {item.stats.totalPr} PR
                                            </span>
                                            {item.stats.totalCompleted > 0 && (
                                                <span className="summary-chip success">
                                                    <i className="bi bi-check-circle-fill" />
                                                    {item.stats.totalCompleted} Selesai
                                                </span>
                                            )}
                                            {item.stats.totalPending > 0 && (
                                                <span className="summary-chip warning">
                                                    <i className="bi bi-hourglass-split" />
                                                    {item.stats.totalPending} Pending
                                                </span>
                                            )}
                                            <span className="summary-chip dark">
                                                <i className="bi bi-briefcase-fill" />
                                                {item.spks.length} SPK
                                            </span>
                                        </div>

                                        {item.spks.length > 0 && (
                                            <div className="client-card-spks-preview">
                                                {item.spks.slice(0, 3).map((spk) => (
                                                    <span key={spk.id} className="spk-preview-pill">
                                                        {spk.no_spk}
                                                        {spk.job_description ? ` (${spk.job_description})` : ''}
                                                    </span>
                                                ))}
                                                {item.spks.length > 3 && (
                                                    <span className="spk-preview-pill more">
                                                        +{item.spks.length - 3} SPK lainnya
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* ============================================================== */}
                    {/* MODE 2: DETAIL MODE / FILTER PER USER -> LIVE FEED GROUPS     */}
                    {/* ============================================================== */}
                    {!isLoading && !errorMessage && isDetailSpkMode && spkFeedGroups.length > 0 && (
                        <div className="timeline-feed-groups">
                            {spkFeedGroups.map((group) => {
                                return (
                                    <section
                                        key={group.key}
                                        className="timeline-group-section"
                                    >
                                        {/* Sticky Group Header per Client & SPK */}
                                        <div className="timeline-sticky-group-header">
                                            <div className="sticky-header-main">
                                                <div>
                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style={{ fontSize: '0.82rem' }}>
                                                            <i className="bi bi-building me-1" />
                                                            <strong>{group.clientName || group.clientCode}</strong>
                                                            {group.clientCode && <span className="ms-1 text-secondary">#{group.clientCode}</span>}
                                                        </span>
                                                        {group.badgeSub && (
                                                            <span className="badge bg-light text-secondary border">
                                                                {group.badgeSub}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h4 className="sticky-header-title mb-0">
                                                        <i className="bi bi-briefcase-fill text-primary me-2" />
                                                        {group.title}
                                                    </h4>
                                                    {group.subtitle && (
                                                        <p className="sticky-header-sub mt-1 mb-0">
                                                            {group.subtitle}
                                                        </p>
                                                    )}
                                                </div>

                                                {group.team && group.team.length > 0 && (
                                                    <div className="sticky-header-team">
                                                        <span className="team-label">Tim:</span>
                                                        {group.team.map((member) => (
                                                            <span
                                                                key={member.kode}
                                                                className="team-chip"
                                                                title={
                                                                    member.tingkat
                                                                        ? `Tingkat ${member.tingkat}`
                                                                        : undefined
                                                                }
                                                            >
                                                                <i className="bi bi-person-fill text-muted" />
                                                                {member.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="timeline-summary-chips">
                                                <span className="summary-chip primary">
                                                    <i className="bi bi-activity" />
                                                    {group.stats.totalFeeds} Total Aktivitas
                                                </span>
                                                <span className="summary-chip info">
                                                    <i className="bi bi-calendar-check" />
                                                    {group.stats.totalDp} DP
                                                </span>
                                                <span className="summary-chip purple">
                                                    <i className="bi bi-journal-check" />
                                                    {group.stats.totalPr} PR
                                                </span>
                                                {group.stats.totalCompleted > 0 && (
                                                    <span className="summary-chip success">
                                                        <i className="bi bi-check-circle-fill" />
                                                        {group.stats.totalCompleted} Selesai
                                                    </span>
                                                )}
                                                {group.stats.totalPending > 0 && (
                                                    <span className="summary-chip warning">
                                                        <i className="bi bi-hourglass-split" />
                                                        {group.stats.totalPending} Pending
                                                    </span>
                                                )}
                                                {group.stats.activeContributors > 0 && (
                                                    <span className="summary-chip dark">
                                                        <i className="bi bi-people-fill" />
                                                        {group.stats.activeContributors} Kontributor
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Feed List for this Group */}
                                        <div className="timeline-feed-list">
                                            {group.feeds.map((feed) => (
                                                <TimelineFeedCard
                                                    key={feed.feed_id}
                                                    feed={feed}
                                                    hideSpkBar={true}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
