import {
    useCallback,
    useEffect,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    RepresentativeLetterHeader,
    RepresentativeLetterTemplate,
} from '@/features/representative-letter/types/representative-letter.types'
import {
    resolveRepresentativeLetterDocumentSettings,
} from '@/features/representative-letter/utils/documentSettings'
import { A4DocumentPreviewSheet } from '@/features/representative-letter/components/editor/A4DocumentPreviewSheet'

import '@/features/representative-letter/styles/representative-letter.scss'

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
    const [previewingTemplate, setPreviewingTemplate] = useState<RepresentativeLetterTemplate | null>(null)
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

    const handleCreateNew = (): void => {
        navigate('/representative-letter/templates/create')
    }

    const handleEditTemplate = (tpl: RepresentativeLetterTemplate): void => {
        navigate(`/representative-letter/templates/${tpl.id}/edit`)
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
                        onClick={handleCreateNew}
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
                                                    className="btn btn-outline-info"
                                                    title="Pratinjau Dokumen WYSIWYG"
                                                    onClick={() => setPreviewingTemplate(tpl)}
                                                >
                                                    <i className="bi bi-eye" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary"
                                                    title="Edit Template"
                                                    onClick={() => handleEditTemplate(tpl)}
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

            {/* Standalone Quick Preview Modal */}
            {previewingTemplate && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div
                        className="modal-dialog modal-xl modal-dialog-scrollable"
                        style={{ maxHeight: 'calc(100vh - 2rem)', margin: '1rem auto' }}
                    >
                        <div
                            className="modal-content border-0 shadow"
                            style={{
                                maxHeight: 'calc(100vh - 2rem)',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div className="modal-header bg-light py-2">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-eye me-2 text-primary" />
                                    Pratinjau Master Template: {previewingTemplate.name}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setPreviewingTemplate(null)}
                                />
                            </div>
                            <div className="modal-body p-4" style={{ overflowY: 'auto' }}>
                                {(() => {
                                    const tplSettings = resolveRepresentativeLetterDocumentSettings(previewingTemplate.settings)
                                    const tplHeader = previewingTemplate.default_header ?? headers.find((h) => h.id === previewingTemplate.default_header_id) ?? null
                                    return (
                                        <div>
                                            <div className="alert alert-light border py-2 px-3 small d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
                                                <span>
                                                    <i className="bi bi-info-circle me-1 text-primary" />
                                                    Tampilan WYSIWYG A4 dengan tata letak baku: orientasi <strong>{tplSettings.page.orientation}</strong>, margin <strong>{tplSettings.page.margin_top}/{tplSettings.page.margin_right}/{tplSettings.page.margin_bottom}/{tplSettings.page.margin_left} mm</strong>.
                                                </span>
                                                <span className="badge bg-primary">
                                                    Format Baku Siap Pakai
                                                </span>
                                            </div>
                                            <A4DocumentPreviewSheet
                                                openingHtml={previewingTemplate.opening_template || ''}
                                                closingHtml={previewingTemplate.closing_template || ''}
                                                pageSize="A4"
                                                pageOrientation={tplSettings.page.orientation}
                                                marginTop={tplSettings.page.margin_top}
                                                marginRight={tplSettings.page.margin_right}
                                                marginBottom={tplSettings.page.margin_bottom}
                                                marginLeft={tplSettings.page.margin_left}
                                                watermarkEnabled={tplSettings.watermark.enabled}
                                                watermarkOpacity={tplSettings.watermark.opacity}
                                                watermarkUrl={previewingTemplate.default_watermark_url ?? tplSettings.watermark.image_url}
                                                header={tplHeader}
                                            />
                                        </div>
                                    )
                                })()}
                            </div>
                            <div className="modal-footer bg-light py-2">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setPreviewingTemplate(null)}
                                >
                                    Tutup
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                        const tpl = previewingTemplate
                                        setPreviewingTemplate(null)
                                        handleEditTemplate(tpl)
                                    }}
                                >
                                    <i className="bi bi-pencil me-1" /> Edit Template Ini
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RepresentativeLetterTemplateListPage
