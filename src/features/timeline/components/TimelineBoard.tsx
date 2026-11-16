import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'

import { timelineApi } from '@/features/timeline/api/timelineApi'
import { TimelineFeedCard } from '@/features/timeline/components/TimelineFeedCard'
import { TimelineSpkSidebar } from '@/features/timeline/components/TimelineSpkSidebar'
import type {
    TimelineData,
    TimelineFeedType,
    TimelineFilters,
    TimelineSpkItem,
} from '@/features/timeline/types/timeline.types'

import '@/features/timeline/styles/timeline.scss'

export const TimelineBoard = () => {
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

    // Fetch initial list of SPKs
    const fetchSpks = useCallback(async (): Promise<void> => {
        const result = await timelineApi.getSpks()
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
                als_spk_id: selectedSpkId ?? undefined,
                type: feedTypeFilter !== 'all' ? feedTypeFilter : undefined,
                employee_code: employeeFilter || undefined,
                tanggal: dateFilter || undefined,
            }

            const result = await timelineApi.getTimeline(filters)

            if (result.success && result.data !== undefined) {
                setTimelineData(result.data)
                // If available_spks exists in response, keep SPK list updated
                if (result.data.available_spks && result.data.available_spks.length > 0) {
                    setSpks(result.data.available_spks)
                }
            } else {
                setErrorMessage(result.message)
            }

            setIsLoading(false)
            setIsRefreshing(false)
        },
        [selectedSpkId, feedTypeFilter, employeeFilter, dateFilter],
    )

    // Initial load
    useEffect(() => {
        void fetchSpks()
    }, [fetchSpks])

    useEffect(() => {
        void fetchTimeline()
    }, [fetchTimeline])

    const handleSelectSpk = (spkId: number | null): void => {
        setSelectedSpkId(spkId)
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

    const handleRefresh = (): void => {
        void fetchTimeline(true)
    }

    const currentSpk = timelineData?.current_spk
    const summary = timelineData?.summary
    const feeds = useMemo(() => timelineData?.feeds ?? [], [timelineData])

    return (
        <div className="timeline-page">
            {/* Top Page Heading */}
            <div className="timeline-heading">
                <h1 className="timeline-title">Dashboard</h1>
                <p className="timeline-subtitle">
                    Ringkasan progress, task aktif, dan laporan terbaru.
                </p>
            </div>

            {/* Section Header: Icon, Subtitle, and Filter Controls */}
            <div className="timeline-section-header">
                <div className="timeline-section-title-wrap">
                    <div className="timeline-section-icon">
                        <i className="bi bi-chat-square-text text-primary" />
                    </div>
                    <div>
                        <h2 className="timeline-section-title">
                            Timeline Progress Report Tim
                        </h2>
                        <p className="timeline-section-desc">
                            Pantau aktivitas laporan harian tim per SPK dan per karyawan
                            secara real-time.
                        </p>
                    </div>
                </div>

                <div className="timeline-filters-bar">
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

                    {/* Filter Karyawan/Team (if available in current SPK) */}
                    {currentSpk && currentSpk.teams && currentSpk.teams.length > 0 && (
                        <select
                            className="timeline-select"
                            value={employeeFilter}
                            onChange={handleEmployeeChange}
                            title="Filter Anggota Tim"
                        >
                            <option value="">Semua Karyawan</option>
                            {currentSpk.teams.map((member) => (
                                <option
                                    key={member.kode_employee}
                                    value={member.kode_employee}
                                >
                                    {member.name_employee}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Date Picker */}
                    <input
                        type="date"
                        className="timeline-date-input"
                        value={dateFilter}
                        onChange={handleDateChange}
                        title="Filter Tanggal"
                    />

                    {/* Refresh Button */}
                    <button
                        type="button"
                        className={`timeline-refresh-btn ${
                            isRefreshing ? 'spinning' : ''
                        }`}
                        onClick={handleRefresh}
                        title="Segarkan data"
                        disabled={isLoading || isRefreshing}
                    >
                        <i className="bi bi-arrow-clockwise" />
                    </button>
                </div>
            </div>

            {/* Main 2-Column Layout */}
            <div className="timeline-layout">
                {/* Left Column: List SPK Sidebar */}
                <TimelineSpkSidebar
                    spks={spks}
                    selectedSpkId={selectedSpkId}
                    onSelectSpk={handleSelectSpk}
                    isLoading={isLoading}
                />

                {/* Right Column: Feed Content */}
                <main className="timeline-content">
                    {isLoading && (
                        <div className="timeline-loading-box">
                            <div className="spinner-border" />
                            <span>Memuat timeline aktivitas tim...</span>
                        </div>
                    )}

                    {!isLoading && errorMessage && (
                        <div className="alert alert-danger d-flex align-items-center justify-content-between">
                            <span>{errorMessage}</span>
                            <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => void fetchTimeline()}
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    {!isLoading && !errorMessage && currentSpk && (
                        <div className="timeline-spk-banner">
                            <div className="timeline-spk-banner-header">
                                <div>
                                    <h4 className="timeline-spk-banner-title">
                                        {currentSpk.no_spk}
                                        <span className="badge bg-light text-primary border ms-2">
                                            {currentSpk.kode_klien}
                                        </span>
                                        {currentSpk.jenis && (
                                            <span className="badge bg-light text-secondary border ms-1">
                                                {currentSpk.jenis}
                                            </span>
                                        )}
                                    </h4>
                                    <p className="timeline-spk-banner-sub">
                                        {currentSpk.job?.job_code
                                            ? `${currentSpk.job.job_code} — `
                                            : ''}
                                        {currentSpk.job?.description ?? '-'}
                                    </p>
                                </div>

                                {currentSpk.teams && currentSpk.teams.length > 0 && (
                                    <div className="timeline-spk-banner-team">
                                        <span className="team-label">Tim:</span>
                                        {currentSpk.teams.map((member) => (
                                            <span
                                                key={member.kode_employee}
                                                className="team-chip"
                                                title={`Tingkat ${member.tingkat}`}
                                            >
                                                <i className="bi bi-person-fill text-muted" />
                                                {member.name_employee}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {summary && (
                                <div className="timeline-summary-chips">
                                    <span className="summary-chip primary">
                                        <i className="bi bi-activity" />
                                        {summary.total_feeds} Total Aktivitas
                                    </span>
                                    <span className="summary-chip info">
                                        <i className="bi bi-calendar-check" />
                                        {summary.total_daily_progress} DP
                                    </span>
                                    <span className="summary-chip purple">
                                        <i className="bi bi-journal-check" />
                                        {summary.total_progress_report} PR
                                    </span>
                                    <span className="summary-chip success">
                                        <i className="bi bi-check-circle-fill" />
                                        {summary.total_tasks_completed} Selesai
                                    </span>
                                    {summary.total_tasks_pending > 0 && (
                                        <span className="summary-chip warning">
                                            <i className="bi bi-hourglass-split" />
                                            {summary.total_tasks_pending} Pending
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {!isLoading && !errorMessage && feeds.length === 0 && (
                        <div className="timeline-empty-box">
                            <p>
                                Belum ada Progress Report yang dipublikasikan untuk filter
                                yang dipilih.
                            </p>
                        </div>
                    )}

                    {!isLoading && !errorMessage && feeds.length > 0 && (
                        <div className="timeline-feed-list">
                            {feeds.map((feed) => (
                                <TimelineFeedCard
                                    key={feed.feed_id}
                                    feed={feed}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
