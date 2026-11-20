import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    RepresentativeLetterHeader,
    RepresentativeLetterHeaderFormPayload,
    RepresentativeLetterMeta,
} from '@/features/representative-letter/types/representative-letter.types'

import '@/features/representative-letter/styles/representative-letter.scss'

interface HeaderFormState {
    code: string
    name: string
    isActive: boolean
    file: File | null
    footerFile: File | null
    footerText: string
    footerType: 'image' | 'text' | 'both' | 'none'
}

const defaultMeta: RepresentativeLetterMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
}

const emptyFormState: HeaderFormState = {
    code: '',
    name: '',
    isActive: false,
    file: null,
    footerFile: null,
    footerText: '',
    footerType: 'image',
}

interface RepresentativeLetterHeaderListPageProps {
    embedded?: boolean
}

const RepresentativeLetterHeaderListPage = ({
    embedded = false,
}: RepresentativeLetterHeaderListPageProps = {}) => {
    const navigate = useNavigate()

    const [headers, setHeaders] = useState<RepresentativeLetterHeader[]>([])
    const [, setMeta] = useState<RepresentativeLetterMeta>(defaultMeta)
    const [currentPage] = useState<number>(1)
    const [editingHeader, setEditingHeader] = useState<RepresentativeLetterHeader | null>(null)
    const [formState, setFormState] = useState<HeaderFormState>(emptyFormState)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [footerPreviewUrl, setFooterPreviewUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [activatingHeaderId, setActivatingHeaderId] = useState<number | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const fetchHeaders = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setErrorMessage(null)

        const result = await representativeLetterApi.getHeaders({
            page: currentPage,
            per_page: 20,
        })

        if (result.success && result.data !== undefined) {
            setHeaders(result.data)
            setMeta(result.meta ?? defaultMeta)
            setIsLoading(false)
            return
        }

        setHeaders([])
        setMeta(defaultMeta)
        setErrorMessage(result.message)
        setIsLoading(false)
    }, [currentPage])

    useEffect(() => {
        queueMicrotask(() => {
            void fetchHeaders()
        })
    }, [fetchHeaders])

    useEffect(() => {
        return () => {
            if (previewUrl !== null) {
                URL.revokeObjectURL(previewUrl)
            }
            if (footerPreviewUrl !== null) {
                URL.revokeObjectURL(footerPreviewUrl)
            }
        }
    }, [previewUrl, footerPreviewUrl])

    const resetForm = (): void => {
        if (previewUrl !== null) {
            URL.revokeObjectURL(previewUrl)
        }
        if (footerPreviewUrl !== null) {
            URL.revokeObjectURL(footerPreviewUrl)
        }

        setEditingHeader(null)
        setFormState(emptyFormState)
        setPreviewUrl(null)
        setFooterPreviewUrl(null)
        setErrorMessage(null)
    }

    const startEdit = (header: RepresentativeLetterHeader): void => {
        if (previewUrl !== null) {
            URL.revokeObjectURL(previewUrl)
        }
        if (footerPreviewUrl !== null) {
            URL.revokeObjectURL(footerPreviewUrl)
        }

        setEditingHeader(header)
        setFormState({
            code: header.code,
            name: header.name,
            isActive: header.is_active,
            file: null,
            footerFile: null,
            footerText: header.footer?.text ?? '',
            footerType: header.footer?.type ?? 'image',
        })
        setPreviewUrl(null)
        setFooterPreviewUrl(null)
        setErrorMessage(null)
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0] ?? null

        if (previewUrl !== null) {
            URL.revokeObjectURL(previewUrl)
        }

        setFormState((current) => ({
            ...current,
            file,
        }))
        setPreviewUrl(file === null ? null : URL.createObjectURL(file))
    }

    const handleFooterFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0] ?? null

        if (footerPreviewUrl !== null) {
            URL.revokeObjectURL(footerPreviewUrl)
        }

        setFormState((current) => ({
            ...current,
            footerFile: file,
        }))
        setFooterPreviewUrl(file === null ? null : URL.createObjectURL(file))
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (editingHeader === null && formState.code.trim() === '') {
            setErrorMessage('Code wajib diisi.')
            return
        }

        if (formState.name.trim() === '') {
            setErrorMessage('Name wajib diisi.')
            return
        }

        if (editingHeader === null && formState.file === null) {
            setErrorMessage('Header Image wajib diisi.')
            return
        }

        setIsSubmitting(true)

        const payload: RepresentativeLetterHeaderFormPayload =
            editingHeader === null
                ? {
                    code: formState.code.trim(),
                    name: formState.name.trim(),
                    header_image: formState.file === null ? undefined : formState.file,
                    footer_image: formState.footerFile === null ? undefined : formState.footerFile,
                    footer_text: formState.footerText.trim() === '' ? undefined : formState.footerText.trim(),
                    footer_type: formState.footerType,
                    is_active: formState.isActive,
                }
                : {
                    name: formState.name.trim(),
                    header_image: formState.file === null ? undefined : formState.file,
                    footer_image: formState.footerFile === null ? undefined : formState.footerFile,
                    footer_text: formState.footerText.trim() === '' ? undefined : formState.footerText.trim(),
                    footer_type: formState.footerType,
                    is_active: formState.isActive,
                }

        const result =
            editingHeader === null
                ? await representativeLetterApi.createHeader(payload)
                : await representativeLetterApi.updateHeader(editingHeader.id, payload)

        setIsSubmitting(false)

        if (result.success) {
            resetForm()
            await fetchHeaders()
            return
        }

        setErrorMessage(result.message)
    }

    const handleActivate = async (header: RepresentativeLetterHeader): Promise<void> => {
        setActivatingHeaderId(header.id)
        setErrorMessage(null)

        const result = await representativeLetterApi.activateHeader(header.id)

        setActivatingHeaderId(null)

        if (result.success) {
            await fetchHeaders()
            return
        }

        setErrorMessage(result.message)
    }

    return (
        <div className={embedded ? 'mt-2' : 'representative-letter-page-shell'}>
            {!embedded && (
                <div className="representative-letter-heading">
                    <div>
                        <h1 className="representative-letter-title">
                            Master Kop Surat (Header & Footer)
                        </h1>
                        <p className="text-muted small mb-0">
                            Atur kop surat resmi perusahaan (logo atas & footer bawah) yang diload otomatis saat generate RL.
                        </p>
                    </div>

                    <div className="representative-letter-actions d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => navigate('/representative-letter/master-layout')}
                        >
                            <i className="bi bi-layout-text-window-reverse me-1" />
                            Master Layout RL
                        </button>
                        <button
                            type="button"
                            className="btn btn-light btn-sm"
                            onClick={() => navigate('/representative-letter')}
                        >
                            Kembali
                        </button>
                    </div>
                </div>
            )}

            {errorMessage !== null && (
                <div className="alert alert-danger">
                    {errorMessage}
                </div>
            )}

            <section className="representative-letter-header-layout">
                <form
                    className="representative-letter-header-form"
                    onSubmit={handleSubmit}
                >
                    <h2 className="h5 fw-bold mb-3">
                        {editingHeader === null ? 'Buat Kop Baru' : 'Edit Kop Surat'}
                    </h2>

                    <label className="form-label">
                        Kode Kop
                        <input
                            className="form-control"
                            placeholder="Contoh: PRO-2026"
                            value={formState.code}
                            disabled={editingHeader !== null}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setFormState((current) => ({
                                    ...current,
                                    code: e.target.value,
                                }))
                            }
                        />
                    </label>

                    <label className="form-label">
                        Nama Kop
                        <input
                            className="form-control"
                            placeholder="Contoh: Kop Surat Resmi PRO 2026"
                            value={formState.name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setFormState((current) => ({
                                    ...current,
                                    name: e.target.value,
                                }))
                            }
                        />
                    </label>

                    <label className="form-label">
                        Gambar Kop Atas (Header Image)
                        <input
                            type="file"
                            className="form-control"
                            accept=".png,.jpg,.jpeg,.webp"
                            onChange={handleFileChange}
                        />
                    </label>

                    {(previewUrl !== null || editingHeader !== null) && (
                        <div className="representative-letter-header-preview mb-3">
                            <span className="small text-muted d-block mb-1">Preview Kop Atas:</span>
                            <img
                                src={previewUrl ?? editingHeader?.image.url}
                                alt="Preview Header"
                                style={{ maxHeight: '80px', objectFit: 'contain' }}
                            />
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="form-label">Tipe Footer</label>
                        <select
                            className="form-select"
                            value={formState.footerType}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                setFormState((current) => ({
                                    ...current,
                                    footerType: e.target.value as 'image' | 'text' | 'both' | 'none',
                                }))
                            }
                        >
                            <option value="image">Gambar Saja (Logo / Border Bawah)</option>
                            <option value="text">Teks Saja (Alamat / Disclaimer)</option>
                            <option value="both">Kombinasi (Gambar + Teks)</option>
                            <option value="none">Tanpa Footer</option>
                        </select>
                    </div>

                    {(formState.footerType === 'image' || formState.footerType === 'both') && (
                        <div className="mb-3">
                            <label className="form-label">Gambar Footer (Opsional)</label>
                            <input
                                type="file"
                                className="form-control"
                                accept=".png,.jpg,.jpeg,.webp"
                                onChange={handleFooterFileChange}
                            />
                            {(footerPreviewUrl !== null || editingHeader?.footer?.url) && (
                                <div className="representative-letter-header-preview mt-2">
                                    <span className="small text-muted d-block mb-1">Preview Kop Bawah:</span>
                                    <img
                                        src={footerPreviewUrl ?? editingHeader?.footer?.url ?? ''}
                                        alt="Preview Footer"
                                        style={{ maxHeight: '50px', objectFit: 'contain' }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {(formState.footerType === 'text' || formState.footerType === 'both') && (
                        <div className="mb-3">
                            <label className="form-label">Teks Footer (Alamat / Catatan Kaki)</label>
                            <textarea
                                className="form-control"
                                rows={2}
                                placeholder="Contoh: Gedung Menara ALS Lt. 15, Jl. Sudirman Jakarta | www.als-holdings.com"
                                value={formState.footerText}
                                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                    setFormState((current) => ({
                                        ...current,
                                        footerText: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    )}

                    <label className="form-check form-switch mb-3">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={formState.isActive}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setFormState((current) => ({
                                    ...current,
                                    isActive: e.target.checked,
                                }))
                            }
                        />
                        <span className="form-check-label fw-semibold">
                            Aktifkan Kop Ini untuk Tenant
                        </span>
                    </label>

                    <div className="representative-letter-form-footer">
                        {editingHeader !== null && (
                            <button
                                type="button"
                                className="btn btn-light"
                                disabled={isSubmitting}
                                onClick={resetForm}
                            >
                                Batal Edit
                            </button>
                        )}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && (
                                <span className="spinner-border spinner-border-sm me-2" />
                            )}
                            Simpan Kop Surat
                        </button>
                    </div>
                </form>

                <div className="representative-letter-board">
                    {isLoading && (
                        <div className="representative-letter-state">
                            Memuat kop surat...
                        </div>
                    )}

                    {!isLoading && headers.length === 0 && (
                        <div className="representative-letter-state">
                            Belum ada kop surat.
                        </div>
                    )}

                    {!isLoading && headers.length > 0 && (
                        <div className="table-responsive">
                            <table className="table representative-letter-table">
                                <thead>
                                <tr>
                                    <th>Kode</th>
                                    <th>Nama Kop</th>
                                    <th>Kop Atas</th>
                                    <th>Kop Bawah (Footer)</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                                </thead>
                                <tbody>
                                {headers.map((h) => (
                                    <tr key={h.id}>
                                        <td><code>{h.code}</code></td>
                                        <td><strong>{h.name}</strong></td>
                                        <td>
                                            <img
                                                className="representative-letter-header-thumb"
                                                src={h.image.url}
                                                alt={h.name}
                                                style={{ maxHeight: '40px', objectFit: 'contain' }}
                                            />
                                        </td>
                                        <td>
                                            {h.footer?.url ? (
                                                <img
                                                    className="representative-letter-header-thumb"
                                                    src={h.footer.url}
                                                    alt="Footer"
                                                    style={{ maxHeight: '30px', objectFit: 'contain' }}
                                                />
                                            ) : h.footer?.text ? (
                                                <span className="small text-muted">{h.footer.text.substring(0, 30)}...</span>
                                            ) : (
                                                <span className="text-muted small">Default</span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`representative-letter-header-status ${
                                                    h.is_active ? 'active' : 'inactive'
                                                }`}
                                            >
                                                {h.is_active ? 'Aktif' : 'Non-Aktif'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="representative-letter-row-actions">
                                                <button
                                                    type="button"
                                                    className="representative-letter-action-button"
                                                    title="View/Edit"
                                                    onClick={() => startEdit(h)}
                                                >
                                                    <i className="bi bi-pencil-square" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="representative-letter-action-button"
                                                    title="Aktifkan Kop Ini"
                                                    disabled={h.is_active || activatingHeaderId === h.id}
                                                    onClick={() => void handleActivate(h)}
                                                >
                                                    <i className="bi bi-check2-circle" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}

export default RepresentativeLetterHeaderListPage
