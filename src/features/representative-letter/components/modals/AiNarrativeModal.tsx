import { useState } from 'react'
import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    AiNarrativeTone,
    AiNarrativeType,
    GenerateAiNarrativeResult,
    RepresentativeLetter,
} from '@/features/representative-letter/types/representative-letter.types'

interface AiNarrativeModalProps {
    isOpen: boolean
    onClose: () => void
    letter: RepresentativeLetter | null
    onApplyContent: (html: string, mode: 'prepend' | 'append' | 'replace') => void
}

export const AiNarrativeModal = ({
    isOpen,
    onClose,
    letter,
    onApplyContent,
}: AiNarrativeModalProps) => {
    const [narrativeType, setNarrativeType] = useState<AiNarrativeType>('executive_summary')
    const [tone, setTone] = useState<AiNarrativeTone>('formal')
    const [customInstruction, setCustomInstruction] = useState<string>('')
    const [isGenerating, setIsGenerating] = useState<boolean>(false)
    const [result, setResult] = useState<GenerateAiNarrativeResult | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [copied, setCopied] = useState<boolean>(false)

    if (!isOpen) return null

    const handleGenerate = async () => {
        setIsGenerating(true)
        setErrorMessage(null)
        setCopied(false)

        try {
            let apiRes
            if (letter?.id) {
                apiRes = await representativeLetterApi.generateAiNarrative(letter.id, {
                    type: narrativeType,
                    tone,
                    custom_instruction: customInstruction.trim() || undefined,
                })
            } else {
                apiRes = await representativeLetterApi.generateAiNarrativeAdHoc({
                    type: narrativeType,
                    tone,
                    custom_instruction: customInstruction.trim() || undefined,
                    client_name: letter?.client_name || undefined,
                    no_spk: letter?.spk?.no_spk || undefined,
                    job_description: letter?.job?.description || undefined,
                })
            }

            if (apiRes.success && apiRes.data) {
                setResult(apiRes.data)
            } else {
                setErrorMessage(apiRes.message || 'Gagal menghasilkan narasi dengan AI.')
            }
        } catch {
            setErrorMessage('Terjadi kesalahan saat memanggil asisten AI.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleCopy = () => {
        if (!result?.narrative_html) return
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = result.narrative_html
        const textToCopy = tempDiv.innerText || tempDiv.textContent || ''
        navigator.clipboard.writeText(textToCopy)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleApply = (mode: 'prepend' | 'append' | 'replace') => {
        if (!result?.narrative_html) return
        onApplyContent(result.narrative_html, mode)
        onClose()
    }

    return (
        <div
            className="modal fade show d-block"
            tabIndex={-1}
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow-lg rounded-3">
                    {/* Header */}
                    <div
                        className="modal-header text-white"
                        style={{
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                            borderTopLeftRadius: '0.5rem',
                            borderTopRightRadius: '0.5rem',
                        }}
                    >
                        <h5 className="modal-title fs-6 fw-bold d-flex align-items-center gap-2">
                            <i className="bi bi-stars fs-5 text-warning" />
                            <span>Asisten AI - Generator Narasi Dokumen RL</span>
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            disabled={isGenerating}
                            onClick={onClose}
                        />
                    </div>

                    {/* Body */}
                    <div className="modal-body p-4">
                        {/* Info Banner */}
                        <div className="alert alert-light border small text-muted mb-3 d-flex align-items-center justify-content-between">
                            <div>
                                <i className="bi bi-info-circle me-1 text-primary" />
                                <strong>Klien:</strong> {letter?.client_name || '-'} |{' '}
                                <strong>SPK:</strong> {letter?.spk?.no_spk || '-'} |{' '}
                                <strong>Pekerjaan:</strong> {letter?.job?.description || '-'}
                            </div>
                            <span className="badge bg-primary-subtle text-primary border">
                                Free AI Enabled
                            </span>
                        </div>

                        {errorMessage && (
                            <div className="alert alert-danger py-2 small mb-3">
                                <i className="bi bi-exclamation-triangle-fill me-1" />
                                {errorMessage}
                            </div>
                        )}

                        <div className="row g-3 mb-3">
                            {/* Pilihan Jenis Narasi */}
                            <div className="col-md-7">
                                <label className="form-label fw-semibold small text-secondary">
                                    Jenis Narasi yang Ingin Dibuat:
                                </label>
                                <select
                                    className="form-select form-select-sm"
                                    value={narrativeType}
                                    onChange={(e) => setNarrativeType(e.target.value as AiNarrativeType)}
                                    disabled={isGenerating}
                                >
                                    <option value="executive_summary">
                                        📊 Ringkasan Eksekutif (Capaian Utama)
                                    </option>
                                    <option value="opening_closing">
                                        ✉️ Pembuka & Penutup Formal Surat
                                    </option>
                                    <option value="findings_summary">
                                        🔍 Rangkuman Temuan Lapangan & Mitigasi Solusi
                                    </option>
                                    <option value="full_narrative">
                                        📑 Draf Lengkap (Pembuka + Capaian + Penutup)
                                    </option>
                                </select>
                            </div>

                            {/* Pilihan Gaya Bahasa */}
                            <div className="col-md-5">
                                <label className="form-label fw-semibold small text-secondary">
                                    Gaya Bahasa (Tone):
                                </label>
                                <select
                                    className="form-select form-select-sm"
                                    value={tone}
                                    onChange={(e) => setTone(e.target.value as AiNarrativeTone)}
                                    disabled={isGenerating}
                                >
                                    <option value="formal">Formal Korporat (Direkomendasikan)</option>
                                    <option value="ringkas">Singkat & Padat (To the point)</option>
                                    <option value="detail">Detail & Menyeluruh</option>
                                </select>
                            </div>

                            {/* Instruksi Tambahan (Opsional) */}
                            <div className="col-12">
                                <label className="form-label fw-semibold small text-secondary">
                                    Catatan Tambahan untuk AI (Opsional):
                                </label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Contoh: Tekankan bahwa pekerjaan rampung sebelum deadline..."
                                    value={customInstruction}
                                    onChange={(e) => setCustomInstruction(e.target.value)}
                                    disabled={isGenerating}
                                />
                            </div>
                        </div>

                        {/* Tombol Generate */}
                        <div className="d-flex justify-content-end mb-3">
                            <button
                                type="button"
                                className="btn btn-primary btn-sm px-4 d-flex align-items-center gap-2 shadow-sm"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" />
                                        <span>Menyusun Narasi...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-stars text-warning" />
                                        <span className="fw-semibold">Generate Narasi AI</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Hasil Generasi */}
                        {result && (
                            <div className="card bg-light border">
                                <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="badge bg-success-subtle text-success border">
                                            Berhasil Dibuat
                                        </span>
                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            Model: {result.model || result.provider}
                                        </small>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm py-0 px-2"
                                        onClick={handleCopy}
                                        title="Salin ke clipboard"
                                    >
                                        <i className={`bi ${copied ? 'bi-check2 text-success' : 'bi-clipboard'}`} />{' '}
                                        <span style={{ fontSize: '0.8rem' }}>{copied ? 'Tersalin!' : 'Salin'}</span>
                                    </button>
                                </div>
                                <div
                                    className="card-body bg-white p-3"
                                    style={{
                                        maxHeight: '260px',
                                        overflowY: 'auto',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.6,
                                    }}
                                    dangerouslySetInnerHTML={{ __html: result.narrative_html }}
                                />
                                {result.note && (
                                    <div className="card-footer py-1 px-3 bg-light text-muted small" style={{ fontSize: '0.75rem' }}>
                                        <i className="bi bi-info-circle me-1" />
                                        {result.note}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="modal-footer bg-light border-top d-flex justify-content-between">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={isGenerating}
                            onClick={onClose}
                        >
                            Tutup
                        </button>

                        {result?.narrative_html && (
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleApply('prepend')}
                                    title="Sisipkan di bagian paling atas dokumen"
                                >
                                    Sisipkan di Awal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleApply('append')}
                                    title="Sisipkan di bagian paling bawah dokumen"
                                >
                                    Sisipkan di Akhir
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleApply('replace')}
                                    title="Ganti seluruh isi dokumen dengan teks ini"
                                >
                                    Ganti Seluruh Isi
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AiNarrativeModal
