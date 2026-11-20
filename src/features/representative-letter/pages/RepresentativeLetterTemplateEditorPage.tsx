import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type KeyboardEvent,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { FontFamily } from '@tiptap/extension-font-family'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Link } from '@tiptap/extension-link'

import {
    FontSize,
    LineHeight,
    ResizableImage,
} from '@/features/representative-letter/components/editor/tiptapExtensions'
import DocumentEditorToolbar from '@/features/representative-letter/components/editor/DocumentEditorToolbar'
import DocumentEditorStatusBar from '@/features/representative-letter/components/editor/DocumentEditorStatusBar'
import RepresentativeLetterDocumentPage from '@/features/representative-letter/components/RepresentativeLetterDocumentPage'
import RepresentativeLetterDocumentSettings from '@/features/representative-letter/components/RepresentativeLetterDocumentSettings'
import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    RepresentativeLetterDocumentSettings as DocumentSettings,
    RepresentativeLetterHeader,
    RepresentativeLetterHeaderSummary,
    RepresentativeLetterSaveState,
    RepresentativeLetterTemplate,
    RepresentativeLetterTemplateFormPayload,
} from '@/features/representative-letter/types/representative-letter.types'
import {
    resolveRepresentativeLetterDocumentSettings,
} from '@/features/representative-letter/utils/documentSettings'

import '@/features/representative-letter/styles/representative-letter.scss'

const defaultTemplateContent = `<p style="text-align: right;">Tanggal: {{tanggal_surat}}</p>
<p>Kepada Yth.<br/><strong>{{client_name}}</strong><br/>Di Tempat</p>
<br/>
<p>Dengan hormat,</p>
<p>Sehubungan dengan pelaksanaan pekerjaan audit &amp; konsultasi berdasarkan Surat Perintah Kerja (SPK) Nomor: <strong>{{nomor_spk}}</strong>, bersama ini kami sampaikan laporan perkembangan hasil pelaksanaan tugas kami sebagai berikut:</p>
<br/>
<p>{{index_content}}</p>
<br/>
<p>Demikian surat representasi ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.</p>
<br/><br/>
<p>Hormat kami,</p>
<p><strong>Tim Pelaksana</strong></p>
<p>{{approver_name}}</p>`

const availableVariables = [
    { label: 'Injeksi Konten PR', tag: '{{index_content}}', desc: 'Rekapitulasi hirarki progress report' },
    { label: 'Nama Klien', tag: '{{client_name}}', desc: 'Nama resmi entitas klien' },
    { label: 'Nomor SPK', tag: '{{nomor_spk}}', desc: 'Nomor kontrak / SPK pekerjaan' },
    { label: 'Tanggal Surat', tag: '{{tanggal_surat}}', desc: 'Tanggal pembuatan dokumen' },
    { label: 'Nomor Surat', tag: '{{nomor_surat}}', desc: 'Nomor penomoran surat resmi' },
    { label: 'Pekerjaan / Jasa', tag: '{{job_description}}', desc: 'Deskripsi jasa pekerjaan' },
    { label: 'Periode Laporan', tag: '{{periode_bulan_tahun}}', desc: 'Bulan & Tahun laporan' },
    { label: 'Nama Pembuat', tag: '{{created_by_name}}', desc: 'PIC pembuat laporan' },
    { label: 'Penandatangan', tag: '{{approver_name}}', desc: 'Penanggung jawab / signer' },
]

export const RepresentativeLetterTemplateEditorPage = () => {
    const navigate = useNavigate()
    const { id } = useParams<{ id?: string }>()
    const isEditMode = Boolean(id)
    const templateId = id ? Number(id) : null

    const [, setTemplate] = useState<RepresentativeLetterTemplate | null>(null)
    const [name, setName] = useState<string>('Template Standar Representative Letter')
    const [isEditingName, setIsEditingName] = useState<boolean>(false)
    const [nameInput, setNameInput] = useState<string>('Template Standar Representative Letter')

    const [headers, setHeaders] = useState<RepresentativeLetterHeader[]>([])
    const [selectedHeaderId, setSelectedHeaderId] = useState<number | ''>('')
    const [isActive, setIsActive] = useState<boolean>(true)
    const [settings, setSettings] = useState<DocumentSettings>(
        resolveRepresentativeLetterDocumentSettings(null),
    )

    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [saveState, setSaveState] = useState<RepresentativeLetterSaveState>('saved')
    const [isDirty, setIsDirty] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const isFirstLoadRef = useRef<boolean>(true)

    // Tiptap WYSIWYG Editor Instance
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            FontFamily,
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            Subscript,
            Superscript,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            ResizableImage,
            CharacterCount,
            FontSize,
            LineHeight,
            Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
                HTMLAttributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    class: 'representative-letter-link',
                },
            }),
        ],
        content: '<p></p>',
        editable: true,
        onUpdate: () => {
            setIsDirty(true)
            setSaveState('unsaved')
        },
    })

    // Fetch Kop Surat Headers & Template (if editing)
    useEffect(() => {
        let isMounted = true

        const initialize = async () => {
            setIsLoading(true)
            setErrorMessage(null)

            const headerRes = await representativeLetterApi.getHeaders({ per_page: 50 })
            let availableHeaders: RepresentativeLetterHeader[] = []
            if (headerRes.success && headerRes.data) {
                availableHeaders = headerRes.data
                if (isMounted) {
                    setHeaders(availableHeaders)
                }
            }

            if (isEditMode && templateId) {
                const res = await representativeLetterApi.getTemplateById(templateId)
                if (res.success && res.data) {
                    const tpl = res.data
                    if (isMounted) {
                        setTemplate(tpl)
                        setName(tpl.name)
                        setNameInput(tpl.name)
                        setSelectedHeaderId(tpl.default_header_id ?? '')
                        setIsActive(tpl.is_active)

                        const resolved = resolveRepresentativeLetterDocumentSettings(tpl.settings)
                        if (tpl.default_watermark_url) {
                            resolved.watermark.image_url = tpl.default_watermark_url
                        }
                        setSettings(resolved)

                        // Compose content from body_template or opening + index_content + closing
                        const bodyHtml =
                            tpl.body_template ||
                            `${tpl.opening_template ?? ''}<br/>{{index_content}}<br/>${tpl.closing_template ?? ''}`

                        if (editor && isFirstLoadRef.current) {
                            editor.commands.setContent(bodyHtml || defaultTemplateContent, { emitUpdate: false })
                            isFirstLoadRef.current = false
                        }
                        setIsDirty(false)
                        setSaveState('saved')
                    }
                } else {
                    if (isMounted) {
                        setErrorMessage(res.message || 'Gagal memuat template.')
                    }
                }
            } else {
                // Create Mode
                if (isMounted) {
                    const activeHeader = availableHeaders.find((h) => h.is_active)
                    if (activeHeader) {
                        setSelectedHeaderId(activeHeader.id)
                    }
                    if (editor && isFirstLoadRef.current) {
                        editor.commands.setContent(defaultTemplateContent, { emitUpdate: false })
                        isFirstLoadRef.current = false
                    }
                    setIsDirty(false)
                    setSaveState('saved')
                }
            }

            if (isMounted) {
                setIsLoading(false)
            }
        }

        void initialize()

        return () => {
            isMounted = false
        }
    }, [isEditMode, templateId, editor])

    // Save Template Handler
    const handleSave = useCallback(async (): Promise<void> => {
        if (!editor) return

        if (name.trim() === '') {
            setErrorMessage('Nama Template wajib diisi.')
            return
        }

        setIsSaving(true)
        setSaveState('saving')
        setErrorMessage(null)

        const currentHtml = editor.getHTML()

        // Separate opening and closing based on {{index_content}} or {{daftar_progress_report}}
        let opening = currentHtml
        let closing = ''
        const tokenMatch = currentHtml.match(/(?:<p>)?\s*\{\{(?:index_content|daftar_progress_report)\}\}\s*(?:<\/p>)?/)

        if (tokenMatch && tokenMatch.index !== undefined) {
            opening = currentHtml.substring(0, tokenMatch.index)
            closing = currentHtml.substring(tokenMatch.index + tokenMatch[0].length)
        }

        const payloadSettings: DocumentSettings = {
            ...settings,
            watermark: {
                ...settings.watermark,
                image_url: settings.watermark.image_url?.trim() || undefined,
            },
        }

        const payload: RepresentativeLetterTemplateFormPayload = {
            name: name.trim(),
            default_header_id: selectedHeaderId === '' ? null : Number(selectedHeaderId),
            default_watermark_url: settings.watermark.image_url?.trim() || null,
            opening_template: opening,
            closing_template: closing,
            body_template: currentHtml,
            settings: payloadSettings,
            is_active: isActive,
        }

        const result = isEditMode && templateId
            ? await representativeLetterApi.updateTemplate(templateId, payload)
            : await representativeLetterApi.createTemplate(payload)

        setIsSaving(false)

        if (!result.success) {
            setSaveState('failed')
            setErrorMessage(result.message || 'Gagal menyimpan template.')
            return
        }

        setSaveState('saved')
        setIsDirty(false)
        setSuccessMessage('Master Layout Template berhasil disimpan!')
        setTimeout(() => setSuccessMessage(null), 3500)

        if (!isEditMode && result.data?.id) {
            navigate(`/representative-letter/templates/${result.data.id}/edit`, { replace: true })
        }
    }, [editor, name, selectedHeaderId, settings, isActive, isEditMode, templateId, navigate])

    // Keyboard shortcut Ctrl+S / Cmd+S
    useEffect(() => {
        const handleKeyDown = (e: globalThis.KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                void handleSave()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleSave])

    // Insert tag token into Tiptap Editor
    const insertVariableTag = (tag: string) => {
        if (!editor) return
        editor.chain().focus().insertContent(` ${tag} `).run()
    }

    // Resolve header summary for live preview on A4
    const selectedHeader = headers.find((h) => h.id === Number(selectedHeaderId))
    const headerSummary: RepresentativeLetterHeaderSummary | null = selectedHeader
        ? {
              id: selectedHeader.id,
              code: selectedHeader.code,
              name: selectedHeader.name,
              image_url: selectedHeader.image?.url || selectedHeader.header?.url || '',
              header_image_url: selectedHeader.header?.url || selectedHeader.image?.url || '',
              footer_image_url: selectedHeader.footer?.url || null,
              footer_text: selectedHeader.footer?.text || null,
              footer_type: selectedHeader.footer?.type || 'image',
          }
        : null

    const handleNameBlur = () => {
        setIsEditingName(false)
        if (nameInput.trim() !== '') {
            setName(nameInput.trim())
            setIsDirty(true)
            setSaveState('unsaved')
        } else {
            setNameInput(name)
        }
    }

    const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur()
        } else if (e.key === 'Escape') {
            setNameInput(name)
            setIsEditingName(false)
        }
    }

    if (isLoading) {
        return (
            <div className="representative-letter-page-shell">
                <div className="representative-letter-state">
                    <div className="spinner-border text-primary" />
                    <span>Memuat Master Layout RL...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="representative-letter-page-shell representative-letter-editor">
            {/* 1. Top Action Bar */}
            <div className="doc-top-bar">
                <div className="doc-top-bar-left">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 me-2"
                        onClick={() => navigate('/representative-letter/master-layout')}
                        title="Kembali ke Daftar Master Layout"
                    >
                        <i className="bi bi-arrow-left" />
                        <span className="d-none d-sm-inline">Master Layout</span>
                    </button>

                    <span className="doc-icon-badge" title="Master Layout RL">
                        <i className="bi bi-file-earmark-code" />
                    </span>

                    {isEditingName ? (
                        <input
                            type="text"
                            className="doc-title-input"
                            value={nameInput}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setNameInput(e.target.value)}
                            onBlur={handleNameBlur}
                            onKeyDown={handleNameKeyDown}
                            autoFocus
                            placeholder="Ketik nama template..."
                        />
                    ) : (
                        <h1
                            className="doc-title-display"
                            onClick={() => {
                                setNameInput(name)
                                setIsEditingName(true)
                            }}
                            title="Klik untuk mengubah nama template"
                        >
                            {name || 'Template Tanpa Nama'}
                            <i className="bi bi-pencil ms-2 text-muted" style={{ fontSize: '13px' }} />
                        </h1>
                    )}

                    {isActive ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle ms-2">
                            Default Aktif
                        </span>
                    ) : (
                        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle ms-2">
                            Non-Aktif
                        </span>
                    )}
                </div>

                <div className="doc-top-bar-actions d-flex align-items-center gap-2">
                    {/* Status Save Indicator */}
                    <span className="small text-muted me-2 d-none d-md-inline">
                        {saveState === 'saving' && (
                            <span className="text-primary">
                                <span className="spinner-border spinner-border-sm me-1" />
                                Menyimpan...
                            </span>
                        )}
                        {saveState === 'saved' && (
                            <span className="text-success">
                                <i className="bi bi-cloud-check me-1" />
                                Tersimpan
                            </span>
                        )}
                        {saveState === 'unsaved' && (
                            <span className="text-warning-emphasis">
                                <i className="bi bi-pencil me-1" />
                                Ada Perubahan
                            </span>
                        )}
                        {saveState === 'failed' && (
                            <span className="text-danger">
                                <i className="bi bi-exclamation-circle me-1" />
                                Gagal Simpan
                            </span>
                        )}
                    </span>

                    <button
                        type="button"
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm px-3"
                        disabled={isSaving}
                        onClick={() => void handleSave()}
                    >
                        {isSaving ? (
                            <>
                                <span className="spinner-border spinner-border-sm" />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check2-circle" />
                                <span>Simpan Master Layout</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Success / Error Alerts */}
            {successMessage && (
                <div className="alert alert-success alert-dismissible fade show mx-3 mt-2 py-2 mb-0 shadow-sm" role="alert">
                    <i className="bi bi-check-circle me-2" />
                    {successMessage}
                    <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)} />
                </div>
            )}
            {errorMessage && (
                <div className="alert alert-danger alert-dismissible fade show mx-3 mt-2 py-2 mb-0 shadow-sm" role="alert">
                    <i className="bi bi-exclamation-triangle me-2" />
                    {errorMessage}
                    <button type="button" className="btn-close" onClick={() => setErrorMessage(null)} />
                </div>
            )}

            {/* 2. Workspace Layout Engine (Sama persis dengan Screenshot) */}
            <div className="doc-editor-container">
                {/* Ribbon Toolbar Tiptap */}
                <div className="position-relative">
                    <DocumentEditorToolbar editor={editor} />
                </div>

                {/* Workspace Lembar Kertas A4 & Settings Sidebar */}
                <div className="representative-letter-workspace">
                    {/* Lembar A4 di Tengah */}
                    <div className="representative-letter-paper-scroll">
                        {selectedHeader === undefined && settings.header.enabled && (
                            <div className="representative-letter-warning">
                                <i className="bi bi-info-circle me-1" />
                                Template ini belum memilih kop surat default. Menggunakan tata letak kop surat tenant.
                            </div>
                        )}

                        <RepresentativeLetterDocumentPage
                            header={headerSummary}
                            editor={editor}
                            settings={settings}
                        />
                    </div>

                    {/* Sidebar Pengaturan Halaman & Template di Kanan */}
                    <div className="representative-letter-settings-wrapper" style={{ width: '310px', flexShrink: 0 }}>
                        {/* Page Layout Settings (Sama persis seperti Screenshot) */}
                        <RepresentativeLetterDocumentSettings
                            settings={settings}
                            onChange={(nextSettings) => {
                                setSettings(nextSettings)
                                setIsDirty(true)
                                setSaveState('unsaved')
                            }}
                        />

                        {/* Pengaturan Tambahan Master Template */}
                        <aside className="representative-letter-settings mt-3">
                            <div className="representative-letter-settings-section">
                                <h2>Kop Surat &amp; Template</h2>

                                <label className="form-label">
                                    Kop Surat Perusahaan
                                    <select
                                        className="form-select"
                                        value={selectedHeaderId}
                                        onChange={(e) => {
                                            setSelectedHeaderId(e.target.value === '' ? '' : Number(e.target.value))
                                            setIsDirty(true)
                                            setSaveState('unsaved')
                                        }}
                                    >
                                        <option value="">Gunakan Kop Surat Tenant Default</option>
                                        {headers.map((h) => (
                                            <option key={h.id} value={h.id}>
                                                {h.name} {h.is_active ? '(Aktif)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="form-label mt-2">
                                    Watermark Image URL (Opsional)
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="https://... atau /watermark.png"
                                        value={settings.watermark.image_url ?? ''}
                                        onChange={(e) => {
                                            setSettings({
                                                ...settings,
                                                watermark: {
                                                    ...settings.watermark,
                                                    image_url: e.target.value,
                                                },
                                            })
                                            setIsDirty(true)
                                            setSaveState('unsaved')
                                        }}
                                    />
                                </label>

                                <div className="form-check form-switch mt-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="templateIsActiveSwitch"
                                        checked={isActive}
                                        onChange={(e) => {
                                            setIsActive(e.target.checked)
                                            setIsDirty(true)
                                            setSaveState('unsaved')
                                        }}
                                    />
                                    <label className="form-check-label fw-semibold small" htmlFor="templateIsActiveSwitch">
                                        Tetapkan sebagai Template Aktif Utama
                                    </label>
                                </div>
                            </div>

                            {/* Panel Cepat Sisipkan Variabel Sistem */}
                            <div className="representative-letter-settings-section mt-3">
                                <h2>Sisipkan Variabel</h2>
                                <p className="text-muted small mb-2" style={{ fontSize: '11px' }}>
                                    Klik token untuk menyisipkan variabel dinamis ke posisi kursor editor:
                                </p>
                                <div className="d-flex flex-column gap-1">
                                    {availableVariables.map((v) => (
                                        <button
                                            key={v.tag}
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary text-start py-1 px-2 d-flex justify-content-between align-items-center"
                                            style={{ fontSize: '11px' }}
                                            onClick={() => insertVariableTag(v.tag)}
                                            title={v.desc}
                                        >
                                            <span className="fw-medium text-dark">{v.label}</span>
                                            <code className="text-primary">{v.tag}</code>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>

                {/* Bottom Status Bar */}
                <DocumentEditorStatusBar
                    editor={editor}
                    isDirty={isDirty}
                    isSaving={isSaving}
                />
            </div>
        </div>
    )
}

export default RepresentativeLetterTemplateEditorPage
