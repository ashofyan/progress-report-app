import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    RepresentativeLetterDocumentSettings,
    RepresentativeLetterHeader,
    RepresentativeLetterTemplate,
    RepresentativeLetterTemplateFormPayload,
} from '@/features/representative-letter/types/representative-letter.types'
import {
    resolveRepresentativeLetterDocumentSettings,
} from '@/features/representative-letter/utils/documentSettings'

import '@/features/representative-letter/styles/representative-letter.scss'

interface TemplateFormState {
    name: string
    defaultHeaderId: number | ''
    defaultWatermarkUrl: string
    pageSize: 'A4'
    pageOrientation: 'portrait' | 'landscape'
    marginTop: number
    marginRight: number
    marginBottom: number
    marginLeft: number
    watermarkEnabled: boolean
    watermarkOpacity: number
    openingTemplate: string
    closingTemplate: string
    isActive: boolean
}

const defaultOpening = `<p><strong>SURAT REPRESENTASI MANAJEMEN</strong></p>
<p>Nomor: {{nomor_surat}}</p>
<p>Tanggal: {{tanggal_surat}}</p>
<br/>
<p>Kepada Yth.<br/><strong>{{client_name}}</strong><br/>Di Tempat</p>
<br/>
<p>Sehubungan dengan pelaksanaan pekerjaan berdasarkan Surat Perintah Kerja (SPK) Nomor: <strong>{{nomor_spk}}</strong>, bersama ini kami sampaikan laporan penyelesaian pekerjaan berikut rincian progress report yang telah diselesaikan:</p>`

const defaultClosing = `<p>Demikian surat representasi ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.</p>
<br/><br/>
<p>Hormat kami,</p>
<p><strong>Tim Pelaksana</strong></p>
<p>{{approver_name}}</p>`

const emptyFormState: TemplateFormState = {
    name: '',
    defaultHeaderId: '',
    defaultWatermarkUrl: '',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    marginTop: 25,
    marginRight: 20,
    marginBottom: 25,
    marginLeft: 20,
    watermarkEnabled: false,
    watermarkOpacity: 0.15,
    openingTemplate: defaultOpening,
    closingTemplate: defaultClosing,
    isActive: true,
}

const tagPills = [
    { label: 'Nama Klien', tag: '{{client_name}}' },
    { label: 'Nomor SPK', tag: '{{nomor_spk}}' },
    { label: 'Tanggal Surat', tag: '{{tanggal_surat}}' },
    { label: 'Nomor Surat', tag: '{{nomor_surat}}' },
    { label: 'Pekerjaan', tag: '{{job_description}}' },
    { label: 'Nama Pembuat', tag: '{{created_by_name}}' },
    { label: 'Penandatangan', tag: '{{approver_name}}' },
    { label: 'Periode', tag: '{{periode_bulan_tahun}}' },
]

interface RepresentativeLetterTemplateListPageProps {
    embedded?: boolean
    onSwitchToHeaderTab?: () => void
}

const RepresentativeLetterTemplateListPage = ({
    embedded = false,
    onSwitchToHeaderTab,
}: RepresentativeLetterTemplateListPageProps = {}) => {
    const navigate = useNavigate()

    const [templates, setTemplates] = useState<RepresentativeLetterTemplate[]>([])
    const [headers, setHeaders] = useState<RepresentativeLetterHeader[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [editingTemplate, setEditingTemplate] = useState<RepresentativeLetterTemplate | null>(null)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
    const [modalTab, setModalTab] = useState<'content' | 'layout' | 'header'>('content')
    const [formState, setFormState] = useState<TemplateFormState>(emptyFormState)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const fetchTemplates = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setErrorMessage(null)

        const result = await representativeLetterApi.getTemplates({ per_page: 50 })
        if (result.success && result.data !== undefined) {
            setTemplates(result.data)
        } else {
            setErrorMessage(result.message)
        }
        setIsLoading(false)
    }, [])

    const fetchHeaders = useCallback(async (): Promise<void> => {
        const result = await representativeLetterApi.getHeaders({ per_page: 50 })
        if (result.success && result.data !== undefined) {
            setHeaders(result.data)
        }
    }, [])

    useEffect(() => {
        void fetchTemplates()
        void fetchHeaders()
    }, [fetchTemplates, fetchHeaders])

    const openCreateModal = (): void => {
        setEditingTemplate(null)
        setModalTab('content')
        setFormState({
            ...emptyFormState,
            defaultHeaderId: headers.find((h) => h.is_active)?.id ?? '',
        })
        setErrorMessage(null)
        setIsModalOpen(true)
    }

    const openEditModal = (tpl: RepresentativeLetterTemplate): void => {
        setEditingTemplate(tpl)
        setModalTab('content')
        const resolved = resolveRepresentativeLetterDocumentSettings(tpl.settings)

        setFormState({
            name: tpl.name,
            defaultHeaderId: tpl.default_header_id ?? '',
            defaultWatermarkUrl: tpl.default_watermark_url ?? resolved.watermark.image_url ?? '',
            pageSize: 'A4',
            pageOrientation: resolved.page.orientation === 'landscape' ? 'landscape' : 'portrait',
            marginTop: resolved.page.margin_top,
            marginRight: resolved.page.margin_right,
            marginBottom: resolved.page.margin_bottom,
            marginLeft: resolved.page.margin_left,
            watermarkEnabled: resolved.watermark.enabled,
            watermarkOpacity: resolved.watermark.opacity,
            openingTemplate: tpl.opening_template ?? defaultOpening,
            closingTemplate: tpl.closing_template ?? defaultClosing,
            isActive: tpl.is_active,
        })
        setErrorMessage(null)
        setIsModalOpen(true)
    }

    const closeModal = (): void => {
        setIsModalOpen(false)
        setEditingTemplate(null)
        setFormState(emptyFormState)
    }

    const insertTagToOpening = (tag: string): void => {
        setFormState((prev) => ({
            ...prev,
            openingTemplate: prev.openingTemplate + tag,
        }))
    }

    const insertTagToClosing = (tag: string): void => {
        setFormState((prev) => ({
            ...prev,
            closingTemplate: prev.closingTemplate + tag,
        }))
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (formState.name.trim() === '') {
            setErrorMessage('Nama Template wajib diisi.')
            return
        }

        setIsSubmitting(true)

        const settings: RepresentativeLetterDocumentSettings = {
            page: {
                size: formState.pageSize,
                orientation: formState.pageOrientation,
                margin_top: formState.marginTop,
                margin_right: formState.marginRight,
                margin_bottom: formState.marginBottom,
                margin_left: formState.marginLeft,
            },
            header: {
                enabled: true,
            },
            footer: {
                enabled: true,
            },
            watermark: {
                enabled: formState.watermarkEnabled,
                opacity: formState.watermarkOpacity,
                width: 150,
                image_url: formState.defaultWatermarkUrl.trim() || undefined,
            },
        }

        // Auto-compose body template to ensure backend generateDraft stays perfectly synced
        const bodyTemplate = `${formState.openingTemplate}<br/>{{daftar_progress_report}}<br/>${formState.closingTemplate}`

        const payload: RepresentativeLetterTemplateFormPayload = {
            name: formState.name.trim(),
            default_header_id: formState.defaultHeaderId === '' ? null : Number(formState.defaultHeaderId),
            default_watermark_url: formState.defaultWatermarkUrl.trim() || null,
            opening_template: formState.openingTemplate,
            closing_template: formState.closingTemplate,
            body_template: bodyTemplate,
            settings,
            is_active: formState.isActive,
        }

        const result = editingTemplate
            ? await representativeLetterApi.updateTemplate(editingTemplate.id, payload)
            : await representativeLetterApi.createTemplate(payload)

        setIsSubmitting(false)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        setSuccessMessage(result.message)
        closeModal()
        await fetchTemplates()
        setTimeout(() => setSuccessMessage(null), 4000)
    }

    const handleDelete = async (id: number): Promise<void> => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus template ini?')) {
            return
        }

        setIsLoading(true)
        const result = await representativeLetterApi.deleteTemplate(id)
        setIsLoading(false)

        if (!result.success) {
            setErrorMessage(result.message)
            return
        }

        setSuccessMessage('Template berhasil dihapus.')
        await fetchTemplates()
        setTimeout(() => setSuccessMessage(null), 4000)
    }

    return (
        <div className={embedded ? 'mt-2' : 'container-fluid py-4'}>
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
                <div>
                    {!embedded && (
                        <>
                            <h4 className="fw-bold mb-1">Master Layout & Template RL</h4>
                            <p className="text-muted mb-0 small">
                                Kelola struktur template pembuka, penutup, kop surat, margin kertas, dan format otomatis dokumen Representative Letter.
                            </p>
                        </>
                    )}
                    {embedded && (
                        <p className="text-muted mb-0 small">
                            Konfigurasi template pembuka, penutup, tata letak margin, orientasi, watermark, dan kop surat default dokumen Representative Letter.
                        </p>
                    )}
                </div>
                <div className="d-flex gap-2">
                    {onSwitchToHeaderTab ? (
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                            onClick={onSwitchToHeaderTab}
                        >
                            <i className="bi bi-card-heading" /> Kelola Kop Surat
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                            onClick={() => navigate('/representative-letter/master-layout?tab=header')}
                        >
                            <i className="bi bi-card-heading" /> Kelola Kop Surat
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                        onClick={openCreateModal}
                    >
                        <i className="bi bi-plus-lg" /> Tambah Template Baru
                    </button>
                </div>
            </div>

            {successMessage && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                    <i className="bi bi-check-circle me-2" />
                    {successMessage}
                    <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)} />
                </div>
            )}

            {errorMessage && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="bi bi-exclamation-triangle me-2" />
                    {errorMessage}
                    <button type="button" className="btn-close" onClick={() => setErrorMessage(null)} />
                </div>
            )}

            <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-semibold">Daftar Master Template Dokumen</h6>
                    <span className="badge bg-light text-dark">{templates.length} Template</span>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th style={{ width: '5%' }}>No.</th>
                                <th style={{ width: '25%' }}>Nama Template</th>
                                <th style={{ width: '20%' }}>Layout & Margin</th>
                                <th style={{ width: '20%' }}>Kop Surat Default</th>
                                <th style={{ width: '12%' }}>Status</th>
                                <th style={{ width: '10%' }}>Diperbarui</th>
                                <th style={{ width: '8%' }} className="text-end">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-muted">
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Memuat data template...
                                    </td>
                                </tr>
                            )}
                            {!isLoading && templates.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-muted">
                                        Belum ada template yang terdaftar. Klik <strong>Tambah Template Baru</strong> untuk membuat.
                                    </td>
                                </tr>
                            )}
                            {!isLoading && templates.map((tpl, idx) => {
                                const settings = resolveRepresentativeLetterDocumentSettings(tpl.settings)
                                return (
                                    <tr key={tpl.id}>
                                        <td>{idx + 1}</td>
                                        <td>
                                            <div className="fw-semibold text-dark">{tpl.name}</div>
                                            {tpl.default_watermark_url && (
                                                <span className="badge bg-light text-secondary border mt-1">
                                                    <i className="bi bi-droplet-half me-1" /> Watermark
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="small fw-semibold text-capitalize">
                                                {settings.page.size} {settings.page.orientation}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                M: {settings.page.margin_top} / {settings.page.margin_right} / {settings.page.margin_bottom} / {settings.page.margin_left} mm
                                            </div>
                                        </td>
                                        <td>
                                            {tpl.default_header ? (
                                                <span className="badge bg-info-subtle text-info border">
                                                    <i className="bi bi-card-image me-1" />
                                                    {tpl.default_header.name}
                                                </span>
                                            ) : (
                                                <span className="text-muted small">Kop Surat Aktif Tenant</span>
                                            )}
                                        </td>
                                        <td>
                                            {tpl.is_active ? (
                                                <span className="badge bg-success">
                                                    <i className="bi bi-check2-circle me-1" /> Aktif (Default)
                                                </span>
                                            ) : (
                                                <span className="badge bg-secondary">Non-Aktif</span>
                                            )}
                                        </td>
                                        <td className="small text-muted">
                                            {tpl.updated_at ? new Date(tpl.updated_at).toLocaleDateString('id-ID') : '-'}
                                        </td>
                                        <td className="text-end">
                                            <div className="btn-group btn-group-sm">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary"
                                                    title="Edit Template"
                                                    onClick={() => openEditModal(tpl)}
                                                >
                                                    <i className="bi bi-pencil" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger"
                                                    title="Hapus Template"
                                                    onClick={() => handleDelete(tpl.id)}
                                                >
                                                    <i className="bi bi-trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form Create / Edit */}
            {isModalOpen && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div
                        className="modal-dialog modal-xl modal-dialog-scrollable"
                        style={{ maxHeight: 'calc(100vh - 2rem)', margin: '1rem auto' }}
                    >
                        <form
                            onSubmit={handleSubmit}
                            className="modal-content border-0 shadow"
                            style={{
                                maxHeight: 'calc(100vh - 2rem)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            <div className="modal-header bg-light flex-shrink-0">
                                <div>
                                    <h5 className="modal-title fw-bold mb-0">
                                        {editingTemplate ? 'Edit Master Layout RL' : 'Tambah Master Layout RL Baru'}
                                    </h5>
                                    <small className="text-muted">
                                        Konfigurasi tata letak halaman, margin, watermark, kop surat, dan template teks dokumen.
                                    </small>
                                </div>
                                <button type="button" className="btn-close" onClick={closeModal} />
                            </div>

                            {/* Modal Sub-Tabs */}
                            <div className="px-4 pt-3 bg-light border-bottom flex-shrink-0">
                                    <ul className="nav nav-tabs border-0">
                                        <li className="nav-item">
                                            <button
                                                type="button"
                                                className={`nav-link ${modalTab === 'content' ? 'active fw-bold' : ''}`}
                                                onClick={() => setModalTab('content')}
                                            >
                                                <i className="bi bi-file-earmark-text me-1" />
                                                1. Template Konten (Pembuka & Penutup)
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                type="button"
                                                className={`nav-link ${modalTab === 'layout' ? 'active fw-bold' : ''}`}
                                                onClick={() => setModalTab('layout')}
                                            >
                                                <i className="bi bi-aspect-ratio me-1" />
                                                2. Tata Letak, Margin & Watermark
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                type="button"
                                                className={`nav-link ${modalTab === 'header' ? 'active fw-bold' : ''}`}
                                                onClick={() => setModalTab('header')}
                                            >
                                                <i className="bi bi-card-heading me-1" />
                                                3. Kop Surat & Pengaturan Default
                                            </button>
                                        </li>
                                    </ul>
                                </div>

                                <div
                                    className="modal-body p-4"
                                    style={{
                                        overflowY: 'auto',
                                        flex: '1 1 auto',
                                        maxHeight: 'calc(100vh - 230px)',
                                    }}
                                >
                                    {/* Tab 1: Template Konten */}
                                    {modalTab === 'content' && (
                                        <div>
                                            <div className="mb-3">
                                                <label className="form-label fw-semibold">Nama Template <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Contoh: Template Standar Audit Manajemen"
                                                    value={formState.name}
                                                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            {/* Quick Insert Pills */}
                                            <div className="bg-light p-3 rounded mb-3 border">
                                                <div className="small fw-bold text-muted mb-2">
                                                    <i className="bi bi-tags me-1" /> Sisipkan Variabel Dinamis Sistem:
                                                </div>
                                                <div className="d-flex flex-wrap gap-1">
                                                    {tagPills.map((p) => (
                                                        <div key={p.tag} className="btn-group btn-group-sm">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary btn-sm"
                                                                onClick={() => insertTagToOpening(p.tag)}
                                                                title="Sisipkan ke Pembuka"
                                                            >
                                                                + {p.label} <code className="text-primary">{p.tag}</code> (Ke Pembuka)
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary btn-sm"
                                                                onClick={() => insertTagToClosing(p.tag)}
                                                                title="Sisipkan ke Penutup"
                                                            >
                                                                (Ke Penutup)
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 1. Template Pembuka */}
                                            <div className="mb-4">
                                                <label className="form-label fw-bold text-primary d-flex align-items-center gap-1">
                                                    <i className="bi bi-file-earmark-text" /> Bagian Pembuka (Intro / Informasi Surat)
                                                </label>
                                                <textarea
                                                    className="form-control font-monospace"
                                                    rows={7}
                                                    value={formState.openingTemplate}
                                                    onChange={(e) => setFormState({ ...formState, openingTemplate: e.target.value })}
                                                    placeholder="HTML atau teks pembuka..."
                                                />
                                                <div className="form-text small text-muted">
                                                    Memuat judul surat, nomor surat, tanggal surat, pihak yang dituju, dan kalimat pengantar.
                                                </div>
                                            </div>

                                            {/* Dynamic PR Hierarchy Indicator */}
                                            <div className="p-3 bg-secondary-subtle border border-dashed rounded text-center my-3">
                                                <span className="badge bg-primary mb-1">Injeksi Dinamis Sistem</span>
                                                <div className="fw-semibold text-secondary">
                                                    [ Rekapitulasi Progress Report (Jasa &gt; Task &gt; Sub Task &gt; Notes) ]
                                                </div>
                                                <div className="small text-muted mt-1">
                                                    Posisi ini otomatis disisipkan data Progress Report berstruktur:
                                                    <br />
                                                    <strong><u>Nama Jasa</u></strong> &rarr; 1. Nama Task &rarr; a. Sub Task &rarr; note subtask
                                                </div>
                                            </div>

                                            {/* 2. Template Penutup */}
                                            <div className="mb-3">
                                                <label className="form-label fw-bold text-success d-flex align-items-center gap-1">
                                                    <i className="bi bi-pen" /> Bagian Penutup (Closing / Tanda Tangan)
                                                </label>
                                                <textarea
                                                    className="form-control font-monospace"
                                                    rows={6}
                                                    value={formState.closingTemplate}
                                                    onChange={(e) => setFormState({ ...formState, closingTemplate: e.target.value })}
                                                    placeholder="HTML atau teks penutup..."
                                                />
                                                <div className="form-text small text-muted">
                                                    Memuat kalimat penutup, ucapan terima kasih, dan kolom tanda tangan tim pelaksana & penanggung jawab.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 2: Layout & Margins */}
                                    {modalTab === 'layout' && (
                                        <div>
                                            <div className="row g-3 mb-4">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-semibold">Ukuran Kertas</label>
                                                    <select
                                                        className="form-select"
                                                        value={formState.pageSize}
                                                        onChange={(e) => setFormState({ ...formState, pageSize: e.target.value as 'A4' })}
                                                    >
                                                        <option value="A4">A4 (210 x 297 mm)</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-semibold">Orientasi Halaman</label>
                                                    <div className="d-flex gap-3 mt-1">
                                                        <div className="form-check">
                                                            <input
                                                                className="form-check-input"
                                                                type="radio"
                                                                name="pageOrientation"
                                                                id="orientPortrait"
                                                                checked={formState.pageOrientation === 'portrait'}
                                                                onChange={() => setFormState({ ...formState, pageOrientation: 'portrait' })}
                                                            />
                                                            <label className="form-check-label" htmlFor="orientPortrait">
                                                                <i className="bi bi-file-earmark me-1" /> Portrait (Tegak)
                                                            </label>
                                                        </div>
                                                        <div className="form-check">
                                                            <input
                                                                className="form-check-input"
                                                                type="radio"
                                                                name="pageOrientation"
                                                                id="orientLandscape"
                                                                checked={formState.pageOrientation === 'landscape'}
                                                                onChange={() => setFormState({ ...formState, pageOrientation: 'landscape' })}
                                                            />
                                                            <label className="form-check-label" htmlFor="orientLandscape">
                                                                <i className="bi bi-file-earmark-landscape me-1" /> Landscape (Mendatar)
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                                                <i className="bi bi-arrows-fullscreen me-2" />
                                                Margin Halaman Dokumen (Milimeter / mm)
                                            </h6>
                                            <div className="row g-3 mb-4">
                                                <div className="col-md-3">
                                                    <label className="form-label small fw-semibold">Margin Atas (mm)</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        min={0}
                                                        max={100}
                                                        value={formState.marginTop}
                                                        onChange={(e) => setFormState({ ...formState, marginTop: Number(e.target.value) || 0 })}
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label small fw-semibold">Margin Kanan (mm)</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        min={0}
                                                        max={100}
                                                        value={formState.marginRight}
                                                        onChange={(e) => setFormState({ ...formState, marginRight: Number(e.target.value) || 0 })}
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label small fw-semibold">Margin Bawah (mm)</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        min={0}
                                                        max={100}
                                                        value={formState.marginBottom}
                                                        onChange={(e) => setFormState({ ...formState, marginBottom: Number(e.target.value) || 0 })}
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label small fw-semibold">Margin Kiri (mm)</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        min={0}
                                                        max={100}
                                                        value={formState.marginLeft}
                                                        onChange={(e) => setFormState({ ...formState, marginLeft: Number(e.target.value) || 0 })}
                                                    />
                                                </div>
                                            </div>

                                            <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                                                <i className="bi bi-droplet-half me-2" />
                                                Watermark Latar Belakang
                                            </h6>
                                            <div className="row g-3">
                                                <div className="col-md-3">
                                                    <div className="form-check form-switch mt-2">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="watermarkEnabledSwitch"
                                                            checked={formState.watermarkEnabled}
                                                            onChange={(e) => setFormState({ ...formState, watermarkEnabled: e.target.checked })}
                                                        />
                                                        <label className="form-check-label fw-semibold" htmlFor="watermarkEnabledSwitch">
                                                            Aktifkan Watermark
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label small fw-semibold">Transparansi / Opacity (0.01 - 1.0)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        max="1"
                                                        className="form-control"
                                                        value={formState.watermarkOpacity}
                                                        onChange={(e) => setFormState({ ...formState, watermarkOpacity: Number(e.target.value) || 0.15 })}
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small fw-semibold">URL Gambar Watermark (Opsional)</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="https://... atau /storage/watermark.png"
                                                        value={formState.defaultWatermarkUrl}
                                                        onChange={(e) => setFormState({ ...formState, defaultWatermarkUrl: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 3: Kop Surat & Defaults */}
                                    {modalTab === 'header' && (
                                        <div>
                                            <div className="row g-3 mb-4">
                                                <div className="col-md-8">
                                                    <label className="form-label fw-semibold">Default Kop Surat (Header & Footer)</label>
                                                    <select
                                                        className="form-select"
                                                        value={formState.defaultHeaderId}
                                                        onChange={(e) => setFormState({ ...formState, defaultHeaderId: e.target.value === '' ? '' : Number(e.target.value) })}
                                                    >
                                                        <option value="">Gunakan Kop Surat Aktif Tenant Otomatis</option>
                                                        {headers.map((h) => (
                                                            <option key={h.id} value={h.id}>
                                                                {h.name} {h.is_active ? '(Sedang Aktif)' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="form-text small text-muted">
                                                        Jika dikosongkan, dokumen RL otomatis menggunakan kop surat tenant yang sedang aktif saat digenerate.
                                                    </div>
                                                </div>
                                                <div className="col-md-4 d-flex align-items-center pt-3">
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="isActiveSwitch"
                                                            checked={formState.isActive}
                                                            onChange={(e) => setFormState({ ...formState, isActive: e.target.checked })}
                                                        />
                                                        <label className="form-check-label fw-semibold" htmlFor="isActiveSwitch">
                                                            Tetapkan sebagai Template Aktif Utama
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="alert alert-light border">
                                                <h6 className="fw-semibold mb-2">
                                                    <i className="bi bi-info-circle me-1 text-primary" /> Informasi Header & Footer Kop Surat
                                                </h6>
                                                <p className="small text-muted mb-0">
                                                    Header dan footer kop surat mencakup logo atas resmi perusahaan, alamat footer, dan nomor kontak. Anda dapat mengelola file gambar kop surat pada tab <strong>Header Kop Surat</strong> di menu Master Layout RL.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div
                                    className="modal-footer bg-light flex-shrink-0 border-top"
                                    style={{
                                        position: 'sticky',
                                        bottom: 0,
                                        zIndex: 10,
                                    }}
                                >
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            'Simpan Master Layout'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
            )}
        </div>
    )
}

export default RepresentativeLetterTemplateListPage
