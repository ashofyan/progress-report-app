import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '@/features/dashboard/api/dashboardApi'
import type {
    DashboardAnnouncementItem,
    DashboardSpkItem,
    DashboardSummary,
} from '@/features/dashboard/types/dashboard.types'
import { progressReportApi } from '@/features/progress-report/api/progressReportApi'
import type { ProgressReportSummary } from '@/features/progress-report/types/progress-report.types'
import { temuanApi } from '@/features/temuan/api/temuanApi'
import type { Temuan } from '@/features/temuan/types/temuan.types'

import '@/pages/dashboard/styles/dashboard.scss'

type ActiveModalType = 'progress_report' | 'spk' | 'pekerjaan_pending' | 'perlu_approve' | 'temuan' | null

const DashboardPage = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    // Announcement Feed State
    const [announcements, setAnnouncements] = useState<DashboardAnnouncementItem[]>([])
    const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState<boolean>(true)

    // Modal States
    const [activeModal, setActiveModal] = useState<ActiveModalType>(null)
    const [modalDataLoading, setModalDataLoading] = useState<boolean>(false)

    const [prList, setPrList] = useState<ProgressReportSummary[]>([])
    const [spkList, setSpkList] = useState<DashboardSpkItem[]>([])
    const [pendingPrList, setPendingPrList] = useState<ProgressReportSummary[]>([])
    const [temuanList, setTemuanList] = useState<Temuan[]>([])

    useEffect(() => {
        let isMounted = true
        const fetchDashboardData = async () => {
            setIsLoading(true)
            setIsAnnouncementsLoading(true)

            const [data, announcementList] = await Promise.all([
                dashboardApi.getSummary(),
                dashboardApi.getAnnouncements({ per_page: 10 }),
            ])

            if (isMounted) {
                if (data?.summary) {
                    setSummary(data.summary)
                }
                if (data?.spks) {
                    setSpkList(data.spks)
                }
                setAnnouncements(announcementList)
                setIsLoading(false)
                setIsAnnouncementsLoading(false)
            }
        }

        void fetchDashboardData()

        return () => {
            isMounted = false
        }
    }, [])

    const handleOpenModal = async (type: ActiveModalType) => {
        setActiveModal(type)
        setModalDataLoading(true)

        if (type === 'progress_report') {
            const res = await progressReportApi.getAll()
            if (res.success && res.data) {
                setPrList(res.data)
            }
        } else if (type === 'spk' || type === 'pekerjaan_pending') {
            if (spkList.length === 0) {
                const data = await dashboardApi.getSummary()
                if (data?.spks) {
                    setSpkList(data.spks)
                }
            }
        } else if (type === 'perlu_approve') {
            const res = await progressReportApi.getPendingApprovals()
            if (res.success && res.data) {
                setPendingPrList(res.data)
            }
        } else if (type === 'temuan') {
            const res = await temuanApi.getAll()
            if (res.success && res.data) {
                setTemuanList(res.data)
            }
        }

        setModalDataLoading(false)
    }

    const handleCloseModal = () => {
        setActiveModal(null)
    }

    const metricCards = [
        {
            label: 'Progress Report',
            value: summary?.total_progress_report_saya ?? 0,
            sub: 'Laporan Dibuat Saya',
            icon: 'bi-clipboard-data',
            color: 'blue',
            clickable: true,
            onClick: () => void handleOpenModal('progress_report'),
        },
        {
            label: 'SPK Aktif',
            value: summary?.total_spk_progress_report ?? summary?.total_spk_progress_report ?? 0,
            sub: 'Pekerjaan Tim',
            icon: 'bi-briefcase',
            color: 'indigo',
            clickable: true,
            onClick: () => void handleOpenModal('spk'),
        },
        {
            label: 'Pekerjaan PR Pending',
            value: summary?.total_pekerjaan_pr_pending_saya ?? summary?.total_pekerjaan_pr_pending ?? 0,
            sub: 'Tugas Pending',
            icon: 'bi-hourglass-split',
            color: 'purple',
            clickable: true,
            onClick: () => void handleOpenModal('pekerjaan_pending'),
        },
        {
            label: 'Total Temuan',
            value: summary?.total_temuan ?? 0,
            sub: `${summary?.total_temuan_open ?? 0} Open • ${summary?.total_temuan_pending ?? 0} Pending`,
            icon: 'bi-shield-exclamation',
            color: 'amber',
            clickable: true,
            onClick: () => void handleOpenModal('temuan'),
        },
        {
            label: 'Perlu Approve',
            value: summary?.total_menunggu_approval_saya ?? 0,
            sub: 'Menunggu Persetujuan Anda',
            icon: 'bi-person-check',
            color: 'rose',
            clickable: true,
            onClick: () => void handleOpenModal('perlu_approve'),
        },
    ]

    const navCards = [
        {
            title: 'Log Aktifitas Tim',
            desc: 'Pantau riwayat timeline aktivitas Daily Progress dan Progress Report tim secara real-time per SPK dan per Client.',
            icon: 'bi-clock-history',
            colorClass: 'primary',
            path: '/log-aktifitas-tim',
            actionText: 'Buka Log Aktifitas',
        },
        {
            title: 'Daily Progress',
            desc: 'Pencatatan kegiatan dan laporan progres pekerjaan operasional harian tim.',
            icon: 'bi-calendar3',
            colorClass: 'success',
            path: '/daily-progress',
            actionText: 'Kelola Daily Progress',
        },
        {
            title: 'Progress Report',
            desc: 'Rekapitulasi periodik progress pekerjaan, cetak laporan, dan ekspor ke format PDF.',
            icon: 'bi-clipboard-data',
            colorClass: 'info',
            path: '/progress-report',
            actionText: 'Lihat Progress Report',
        },
        {
            title: 'Temuan & Solusi',
            desc: 'Daftar temuan audit operasional dan tindak lanjut rekomendasi penyelesaian kendala.',
            icon: 'bi-check2-square',
            colorClass: 'warning',
            path: '/temuan',
            actionText: 'Daftar Temuan',
        },
        {
            title: 'Master Pekerjaan',
            desc: 'Pengaturan master job, rincian subtask, dan custom pekerjaan untuk SPK.',
            icon: 'bi-database-gear',
            colorClass: 'indigo',
            path: '/master-data/pekerjaan',
            actionText: 'Buka Master Data',
        },
        {
            title: 'Notulen & Catatan',
            desc: 'Dokumentasi risalah rapat tim, memo tindak lanjut, dan notulen proyek.',
            icon: 'bi-journal-bookmark-fill',
            colorClass: 'purple',
            path: '/notulen',
            actionText: 'Kelola Notulen',
        },
    ]

    return (
        <div className="dashboard-home-page">
            {/* Top Page Heading */}
            <div className="dashboard-heading">
                <div>
                    <h1 className="dashboard-title">Dashboard</h1>
                    <p className="dashboard-subtitle">
                        Monitoring ringkasan metrik dan aktivitas operasional tim
                    </p>
                </div>

                <div className="dashboard-breadcrumb">
                    <span className="active">Main</span>
                    <span>/</span>
                    <span>Dashboard</span>
                </div>
            </div>

            {/* Summary Metrics Cards */}
            <div className="dashboard-metrics-grid">
                {metricCards.map((card, idx) => (
                    <div
                        key={idx}
                        className={`dashboard-metric-card ${
                            card.clickable ? 'clickable' : ''
                        } ${isLoading ? 'loading' : ''}`}
                        onClick={card.clickable ? card.onClick : undefined}
                        role={card.clickable ? 'button' : undefined}
                        tabIndex={card.clickable ? 0 : undefined}
                        title={card.clickable ? 'Klik untuk melihat rincian' : undefined}
                    >
                        <div className={`metric-icon-wrap ${card.color}`}>
                            <i className={`bi ${card.icon}`} />
                        </div>
                        <div className="metric-content">
                            <span className="metric-label">{card.label}</span>
                            <h3 className="metric-value">
                                {isLoading ? (
                                    <span className="spinner-border spinner-border-sm text-secondary" />
                                ) : (
                                    card.value
                                )}
                            </h3>
                            <span className={`metric-sub ${card.color}`}>
                                {card.sub}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Split Row: Shortcut & Announcement */}
            <div className="dashboard-split-layout">
                {/* Sisi Kiri: Shortcut Menu Utama & Akses Cepat */}
                <div className="split-col">
                    <div className="split-header">
                        <h2 className="split-title">
                            <i className="bi bi-grid-fill text-primary" />
                            Menu Utama & Akses Cepat
                        </h2>
                        <p className="split-desc">Pintasan cepat modul operasional tim</p>
                    </div>

                    <div className="split-panel">
                        <div className="shortcut-grid">
                            {navCards.map((card) => (
                                <Link
                                    key={card.path}
                                    to={card.path}
                                    className="shortcut-card"
                                    title={card.title}
                                >
                                    <div className={`shortcut-icon-wrap ${card.colorClass}`}>
                                        <i className={`bi ${card.icon}`} />
                                    </div>
                                    <span className="shortcut-title">{card.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sisi Kanan: Pengumuman & Aktivitas Tim */}
                <div className="split-col">
                    <div className="split-header">
                        <h2 className="split-title">
                            <i className="bi bi-broadcast text-danger" />
                            Pengumuman & Aktivitas Tim
                        </h2>
                        <p className="split-desc">Aktivitas pembuatan Daily Progress & Progress Report tim</p>
                    </div>

                    <div className="split-panel">
                        <div className="announcement-list">
                            {isAnnouncementsLoading ? (
                                <div className="text-center py-5 text-muted">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status" />
                                    <p className="small mt-2 mb-0">Memuat aktivitas pengumuman...</p>
                                </div>
                            ) : announcements.length === 0 ? (
                                <div className="announcement-empty">
                                    <i className="bi bi-bell-slash" />
                                    <span>Belum ada pengumuman aktivitas tim hari ini.</span>
                                </div>
                            ) : (
                                announcements.map((item) => (
                                    <Link
                                        key={item.feed_id}
                                        to={item.navigation?.detail_path || item.navigation?.url || '#'}
                                        className="announcement-card-item"
                                    >
                                        <div className="announcement-item-top">
                                            <span className={`badge-type ${item.type_code}`}>
                                                {item.type_code.toUpperCase()} • {item.type_label}
                                            </span>
                                            {item.time_ago && (
                                                <span className="announcement-time">
                                                    <i className="bi bi-clock" />
                                                    {item.time_ago}
                                                </span>
                                            )}
                                        </div>

                                        <div className="announcement-msg">
                                            {item.announcement?.message || item.announcement?.text || item.announcement?.title}
                                        </div>

                                        <div className="announcement-meta">
                                            {item.spk?.no_spk && (
                                                <span className="meta-spk">
                                                    <i className="bi bi-briefcase" />
                                                    {item.spk.no_spk}
                                                    {item.spk.client_name ? ` (${item.spk.client_name})` : item.spk.client_code ? ` (${item.spk.client_code})` : ''}
                                                </span>
                                            )}
                                            {item.creator?.is_me && (
                                                <span className="badge-me">Anda</span>
                                            )}
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialog / Modal Section */}
            {activeModal !== null && (
                <>
                    <div className="dashboard-modal-backdrop" onClick={handleCloseModal} />
                    <div className="dashboard-modal-wrapper" onClick={handleCloseModal}>
                        <div
                            className="dashboard-modal-content"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                        >
                            {/* Modal Header */}
                            <div className="modal-header">
                                <div className="modal-title-wrap">
                                    {activeModal === 'progress_report' && (
                                        <>
                                            <i className="bi bi-clipboard-data text-primary" />
                                            <h3 className="modal-title">Daftar Progress Report</h3>
                                        </>
                                    )}
                                    {activeModal === 'spk' && (
                                        <>
                                            <i className="bi bi-briefcase text-primary" />
                                            <h3 className="modal-title">Daftar SPK Aktif</h3>
                                        </>
                                    )}
                                    {activeModal === 'pekerjaan_pending' && (
                                        <>
                                            <i className="bi bi-hourglass-split" style={{ color: '#9333ea', fontSize: '20px' }} />
                                            <h3 className="modal-title">Daftar Pekerjaan Progress Report Pending</h3>
                                        </>
                                    )}
                                    {activeModal === 'perlu_approve' && (
                                        <>
                                            <i className="bi bi-person-check text-danger" />
                                            <h3 className="modal-title">Daftar Progress Report Perlu Persetujuan</h3>
                                        </>
                                    )}
                                    {activeModal === 'temuan' && (
                                        <>
                                            <i className="bi bi-shield-exclamation text-warning" />
                                            <h3 className="modal-title">Daftar Temuan Tim</h3>
                                        </>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleCloseModal}
                                    aria-label="Tutup"
                                />
                            </div>

                            {/* Modal Body */}
                            <div className="modal-body">
                                {modalDataLoading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status" />
                                        <p className="text-muted mt-2 small">Memuat data rincian...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* 1. Modal: Progress Report */}
                                        {activeModal === 'progress_report' && (
                                            prList.length === 0 ? (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary" />
                                                    Belum ada data Progress Report yang ditemukan.
                                                </div>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>No. PR</th>
                                                                <th>Tanggal</th>
                                                                <th>Klien & SPK</th>
                                                                <th className="text-center">Status</th>
                                                                <th className="text-end">Aksi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {prList.map((pr) => (
                                                                <tr key={pr.id}>
                                                                    <td className="fw-semibold text-primary">
                                                                        {pr.nomor}
                                                                    </td>
                                                                    <td className="text-muted small">
                                                                        {pr.tanggal}
                                                                    </td>
                                                                    <td>
                                                                        <div className="fw-medium small text-dark">
                                                                            {pr.client_name || pr.client_code}
                                                                        </div>
                                                                        <div className="text-muted" style={{ fontSize: '11.5px' }}>
                                                                            {pr.spk?.no_spk || '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <span className={`badge ${
                                                                            pr.approval_status === 'approved'
                                                                                ? 'bg-success'
                                                                                : pr.approval_status === 'rejected'
                                                                                ? 'bg-danger'
                                                                                : 'bg-warning text-dark'
                                                                        }`}>
                                                                            {pr.approval_status === 'approved'
                                                                                ? 'Disetujui'
                                                                                : pr.approval_status === 'rejected'
                                                                                ? 'Ditolak'
                                                                                : 'Pending'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-end">
                                                                        <Link
                                                                            to={`/progress-report/${pr.id}`}
                                                                            className="btn btn-sm btn-outline-primary"
                                                                            onClick={handleCloseModal}
                                                                        >
                                                                            <i className="bi bi-eye me-1" />
                                                                            Detail
                                                                        </Link>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                        )}

                                        {/* Modal: SPK Aktif */}
                                        {activeModal === 'spk' && (
                                            spkList.length === 0 ? (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary" />
                                                    Belum ada data SPK aktif yang ditemukan.
                                                </div>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>No. SPK</th>
                                                                <th>Klien</th>
                                                                <th>Pekerjaan</th>
                                                                <th>Tim Pelaksana</th>
                                                                <th className="text-center">Progress Report</th>
                                                                <th className="text-center">Temuan</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {spkList.map((spk) => (
                                                                <tr key={spk.id}>
                                                                    <td>
                                                                        <div className="fw-semibold text-primary">
                                                                            {spk.no_spk}
                                                                        </div>
                                                                        {(spk.periode_awal || spk.tanggal) && (
                                                                            <div className="text-muted small" style={{ fontSize: '11.5px' }}>
                                                                                {spk.tanggal || `${spk.periode_awal || ''} s/d ${spk.periode_akhir || ''}`}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <div className="fw-medium small text-dark">
                                                                            {spk.client_name || spk.client_code}
                                                                        </div>
                                                                        {spk.client_name && spk.client_code && (
                                                                            <div className="text-muted" style={{ fontSize: '11.5px' }}>
                                                                                {spk.client_code}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <div className="small text-dark">
                                                                            {spk.job?.description || spk.job?.job_code || '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        {spk.teams && spk.teams.length > 0 ? (
                                                                            <div className="d-flex flex-wrap gap-1">
                                                                                {spk.teams.slice(0, 3).map((m) => (
                                                                                    <span
                                                                                        key={m.id}
                                                                                        className="badge bg-light text-dark border"
                                                                                        style={{ fontSize: '11px' }}
                                                                                        title={m.kode_employee}
                                                                                    >
                                                                                        {m.name_employee}
                                                                                    </span>
                                                                                ))}
                                                                                {spk.teams.length > 3 && (
                                                                                    <span
                                                                                        className="badge bg-light text-secondary border"
                                                                                        style={{ fontSize: '11px' }}
                                                                                        title={spk.teams.slice(3).map((t) => t.name_employee).join(', ')}
                                                                                    >
                                                                                        +{spk.teams.length - 3} lainnya
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-muted small">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <span className="badge bg-light text-primary border">
                                                                            {spk.progress_report?.total ?? 0} PR
                                                                        </span>
                                                                        {Boolean(spk.progress_report?.pending) && (
                                                                            <div className="text-warning small" style={{ fontSize: '11px' }}>
                                                                                {spk.progress_report?.pending} pending
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <span className="badge bg-light text-warning border">
                                                                            {spk.temuan?.total ?? 0} Temuan
                                                                        </span>
                                                                        {Boolean(spk.temuan?.open) && (
                                                                            <div className="text-danger small" style={{ fontSize: '11px' }}>
                                                                                {spk.temuan?.open} open
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                        )}

                                        {/* Modal: Pekerjaan PR Pending */}
                                        {activeModal === 'pekerjaan_pending' && (
                                            spkList.filter(s => (s.pekerjaan_pr_pending?.total ?? 0) > 0 || (s.progress_report?.pending ?? 0) > 0).length === 0 ? (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="bi bi-check-circle fs-2 d-block mb-2 text-success" />
                                                    Tidak ada pekerjaan Progress Report yang berstatus pending.
                                                </div>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>No. SPK</th>
                                                                <th>Klien</th>
                                                                <th>Pekerjaan</th>
                                                                <th className="text-center">Pending Saya</th>
                                                                <th className="text-center">Pending Tim</th>
                                                                <th className="text-center">Total Pending</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {spkList
                                                                .filter(s => (s.pekerjaan_pr_pending?.total ?? 0) > 0 || (s.progress_report?.pending ?? 0) > 0)
                                                                .map((spk) => (
                                                                    <tr key={spk.id}>
                                                                        <td>
                                                                            <div className="fw-semibold text-primary">
                                                                                {spk.no_spk}
                                                                            </div>
                                                                            {(spk.periode_awal || spk.tanggal) && (
                                                                                <div className="text-muted small" style={{ fontSize: '11.5px' }}>
                                                                                    {spk.tanggal || `${spk.periode_awal || ''} s/d ${spk.periode_akhir || ''}`}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            <div className="fw-medium small text-dark">
                                                                                {spk.client_name || spk.client_code}
                                                                            </div>
                                                                            {spk.client_name && spk.client_code && (
                                                                                <div className="text-muted" style={{ fontSize: '11.5px' }}>
                                                                                    {spk.client_code}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            <div className="small text-dark">
                                                                                {spk.job?.description || spk.job?.job_code || '-'}
                                                                            </div>
                                                                        </td>
                                                                        <td className="text-center">
                                                                            <span className="badge border" style={{ backgroundColor: '#f3e8ff', color: '#9333ea', fontWeight: 600 }}>
                                                                                {spk.pekerjaan_pr_pending?.saya ?? spk.pekerjaan_pr_pending?.pribadi ?? 0}
                                                                            </span>
                                                                        </td>
                                                                        <td className="text-center">
                                                                            <span className="badge bg-light text-secondary border">
                                                                                {spk.pekerjaan_pr_pending?.team ?? spk.pekerjaan_pr_pending?.tim ?? 0}
                                                                            </span>
                                                                        </td>
                                                                        <td className="text-center">
                                                                            <span className="badge bg-light text-primary border">
                                                                                {spk.pekerjaan_pr_pending?.total ?? 0}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                        )}

                                        {/* 2. Modal: Perlu Approve */}
                                        {activeModal === 'perlu_approve' && (
                                            pendingPrList.length === 0 ? (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="bi bi-check-circle fs-2 d-block mb-2 text-success" />
                                                    Tidak ada Progress Report yang memerlukan persetujuan Anda saat ini.
                                                </div>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>No. PR</th>
                                                                <th>Tanggal</th>
                                                                <th>Klien & SPK</th>
                                                                <th>Pembuat</th>
                                                                <th className="text-end">Aksi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {pendingPrList.map((pr) => (
                                                                <tr key={pr.id}>
                                                                    <td className="fw-semibold text-danger">
                                                                        {pr.nomor}
                                                                    </td>
                                                                    <td className="text-muted small">
                                                                        {pr.tanggal}
                                                                    </td>
                                                                    <td>
                                                                        <div className="fw-medium small text-dark">
                                                                            {pr.client_name || pr.client_code}
                                                                        </div>
                                                                        <div className="text-muted" style={{ fontSize: '11.5px' }}>
                                                                            {pr.spk?.no_spk || '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <span className="badge bg-light text-dark border">
                                                                            {pr.created_by_name || pr.created_by || 'Anggota Tim'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-end">
                                                                        <Link
                                                                            to={`/progress-report/${pr.id}`}
                                                                            className="btn btn-sm btn-danger"
                                                                            onClick={handleCloseModal}
                                                                        >
                                                                            <i className="bi bi-check2-circle me-1" />
                                                                            Tinjau
                                                                        </Link>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                        )}

                                        {/* 3. Modal: Temuan */}
                                        {activeModal === 'temuan' && (
                                            temuanList.length === 0 ? (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary" />
                                                    Belum ada temuan yang tercatat.
                                                </div>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>No. Temuan</th>
                                                                <th>Tanggal</th>
                                                                <th>Klien / SPK</th>
                                                                <th>Rincian Catatan</th>
                                                                <th className="text-center">Status</th>
                                                                <th className="text-end">Aksi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {temuanList.map((item) => (
                                                                <tr key={item.id}>
                                                                    <td>
                                                                        <div className="fw-semibold text-dark">
                                                                            {item.nomor}
                                                                        </div>
                                                                        <span className="badge bg-light text-secondary border" style={{ fontSize: '10.5px' }}>
                                                                            {item.type || 'TM'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-muted small">
                                                                        {item.tanggal}
                                                                    </td>
                                                                    <td>
                                                                        <div className="fw-medium small text-dark">
                                                                            {item.client_code}
                                                                        </div>
                                                                        <div className="text-muted" style={{ fontSize: '11.5px' }}>
                                                                            {item.spk?.no_spk || '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div className="text-truncate" style={{ maxWidth: '240px', fontSize: '13px' }}>
                                                                            {item.notes && item.notes.length > 0
                                                                                ? item.notes[0].note
                                                                                : '-'}
                                                                        </div>
                                                                        {item.notes && item.notes.length > 1 && (
                                                                            <span className="text-muted" style={{ fontSize: '11px' }}>
                                                                                +{item.notes.length - 1} catatan lainnya
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <span className={`badge ${
                                                                            item.status === 'selesai'
                                                                                ? 'bg-success'
                                                                                : item.status === 'pending'
                                                                                ? 'bg-warning text-dark'
                                                                                : 'bg-primary'
                                                                        }`}>
                                                                            {item.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-end">
                                                                        <Link
                                                                            to={`/temuan`}
                                                                            className="btn btn-sm btn-outline-secondary"
                                                                            onClick={handleCloseModal}
                                                                        >
                                                                            <i className="bi bi-box-arrow-up-right me-1" />
                                                                            Buka
                                                                        </Link>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="modal-footer">
                                <span className="text-muted small">
                                    {activeModal === 'progress_report' && `${prList.length} data laporan`}
                                    {activeModal === 'spk' && `${spkList.length} SPK aktif`}
                                    {activeModal === 'pekerjaan_pending' && `${summary?.total_pekerjaan_pr_pending_saya ?? summary?.total_pekerjaan_pr_pending ?? 0} pekerjaan pending saya`}
                                    {activeModal === 'perlu_approve' && `${pendingPrList.length} menunggu persetujuan`}
                                    {activeModal === 'temuan' && `${temuanList.length} temuan tercatat`}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-light btn-sm"
                                    onClick={handleCloseModal}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default DashboardPage
