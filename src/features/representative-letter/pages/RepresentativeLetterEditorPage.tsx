import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import {
    useNavigate,
    useParams,
} from 'react-router-dom'

import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import RepresentativeLetterDocumentWorkspace from '@/features/representative-letter/components/RepresentativeLetterDocumentWorkspace'
import RepresentativeLetterSourceDrawer from '@/features/representative-letter/components/RepresentativeLetterSourceDrawer'
import { saveAs } from 'file-saver'
import DocumentEditorTopBar from '@/features/representative-letter/components/editor/DocumentEditorTopBar'
import type {
    RepresentativeLetter,
    RepresentativeLetterDocumentSettings,
    RepresentativeLetterSaveState,
} from '@/features/representative-letter/types/representative-letter.types'
import {
    resolveRepresentativeLetterDocumentSettings,
} from '@/features/representative-letter/utils/documentSettings'

import '@/features/representative-letter/styles/representative-letter.scss'

const RepresentativeLetterEditorPage = () => {
    const navigate = useNavigate()
    const params = useParams<{ id: string }>()
    const id =
        params.id === undefined ? Number.NaN : Number(params.id)

    const [letter, setLetter] =
        useState<RepresentativeLetter | null>(null)
    const [title, setTitle] =
        useState<string>('')
    const [content, setContent] =
        useState<string>('')
    const [settings, setSettings] =
        useState<RepresentativeLetterDocumentSettings>(
            resolveRepresentativeLetterDocumentSettings(null),
        )
    const [isLoading, setIsLoading] =
        useState<boolean>(true)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)
    const [saveState, setSaveState] =
        useState<RepresentativeLetterSaveState>('saved')
    const [isDirty, setIsDirty] =
        useState<boolean>(false)
    const [isSourceOpen, setIsSourceOpen] =
        useState<boolean>(false)
    const [isPresentationMode, setIsPresentationMode] =
        useState<boolean>(false)
    const [isExportingPdf, setIsExportingPdf] =
        useState<boolean>(false)

    const saveRequestIdRef = useRef<number>(0)

    useEffect(() => {
        if (!Number.isFinite(id)) {
            queueMicrotask(() => {
                setErrorMessage(
                    'ID Representative Letter tidak valid.',
                )
                setIsLoading(false)
            })
            return
        }

        queueMicrotask(() => {
            const fetchLetter = async (): Promise<void> => {
                setIsLoading(true)
                setErrorMessage(null)

                const result =
                    await representativeLetterApi.getById(id)

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setLetter(result.data)
                    setTitle(result.data.nomor || 'Representative Letter')
                    setContent(result.data.content ?? '')
                    setSettings(
                        resolveRepresentativeLetterDocumentSettings(
                            result.data.document_settings,
                        ),
                    )
                    setIsDirty(false)
                    setSaveState('saved')
                    setIsLoading(false)
                    return
                }

                setLetter(null)
                setErrorMessage(result.message)
                setIsLoading(false)
            }

            void fetchLetter()
        })
    }, [id])

    const save = useCallback(async (): Promise<void> => {
        if (letter === null || !isDirty) {
            return
        }

        const requestId = saveRequestIdRef.current + 1
        saveRequestIdRef.current = requestId
        setSaveState('saving')

        const result = await representativeLetterApi.update(
            letter.id,
            {
                content,
                content_format: 'html',
                document_settings: settings,
            },
        )

        if (saveRequestIdRef.current !== requestId) {
            return
        }

        if (
            result.success &&
            result.data !== undefined
        ) {
            setLetter(result.data)
            setSettings(
                resolveRepresentativeLetterDocumentSettings(
                    result.data.document_settings,
                ),
            )
            setIsDirty(false)
            setSaveState('saved')
            return
        }

        setSaveState('failed')
        setErrorMessage(result.message)
    }, [
        content,
        isDirty,
        letter,
        settings,
    ])

    // Keyboard shortcut: Ctrl+S / Cmd+S
    useEffect(() => {
        const handleKeyDown = (e: globalThis.KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                void save()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [save])

    // Autosave after 2.5s of inactivity
    useEffect(() => {
        if (!isDirty || letter === null) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            void save()
        }, 2500)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [
        isDirty,
        letter,
        save,
    ])

    const handleContentChange = (value: string): void => {
        setContent(value)
        setIsDirty(true)
        setSaveState('unsaved')
        setErrorMessage(null)
    }

    const handleSettingsChange = (
        nextSettings: RepresentativeLetterDocumentSettings,
    ): void => {
        setSettings(nextSettings)
        setIsDirty(true)
        setSaveState('unsaved')
        setErrorMessage(null)
    }

    const handleExportPdf = async (): Promise<void> => {
        if (!letter) return
        setIsExportingPdf(true)
        setErrorMessage(null)

        try {
            const blob = await representativeLetterApi.exportPdf(letter.id)
            const cleanNomor = (letter.nomor_surat || letter.nomor || title || 'Representative-Letter')
                .replace(/[/\\?%*:|"<>]/g, '-')
            saveAs(blob, `${cleanNomor}.pdf`)
        } catch {
            setErrorMessage('Gagal mengunduh file PDF dari server.')
        } finally {
            setIsExportingPdf(false)
        }
    }

    const handleDelete = async (): Promise<void> => {
        if (!letter || letter.status !== 'draft') return
        const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus Representative Letter ${letter.nomor}?`)
        if (!confirmed) return

        setIsLoading(true)
        const result = await representativeLetterApi.delete(letter.id)
        if (result.success) {
            navigate('/representative-letter')
        } else {
            setIsLoading(false)
            setErrorMessage(result.message || 'Gagal menghapus Representative Letter.')
        }
    }

    const handleShare = (): void => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href)
            window.alert('Tautan dokumen berhasil disalin ke clipboard!')
        }
    }

    if (isLoading) {
        return (
            <div className="representative-letter-page-shell">
                <div className="representative-letter-state">
                    <div className="spinner-border text-primary" />
                    <span>Memuat Representative Letter...</span>
                </div>
            </div>
        )
    }

    if (letter === null) {
        return (
            <div className="representative-letter-page-shell">
                <div className="representative-letter-error">
                    <div className="alert alert-danger">
                        {errorMessage ??
                            'Representative Letter tidak ditemukan.'}
                    </div>
                    <button
                        type="button"
                        className="btn btn-light"
                        onClick={() =>
                            navigate('/representative-letter')
                        }
                    >
                        Kembali
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={`representative-letter-page-shell representative-letter-editor ${isPresentationMode ? 'presentation-mode' : ''}`}>
            {/* Top Action Bar (like Screenshot) */}
            <DocumentEditorTopBar
                title={title}
                onTitleChange={setTitle}
                onSave={() => void save()}
                isSaving={saveState === 'saving'}
                isDirty={isDirty}
                isReadOnly={letter?.status !== 'draft'}
                isExportingPdf={isExportingPdf}
                onExportPdf={() => void handleExportPdf()}
                onPresentationMode={() => setIsPresentationMode(!isPresentationMode)}
                onShare={handleShare}
                onDelete={letter?.status === 'draft' ? () => void handleDelete() : undefined}
            />

            {/* Sub-header info & Source PR toggle button */}
            <div className="doc-meta-bar">
                <div className="doc-meta-info">
                    {letter.spk?.no_spk && (
                        <span className="badge bg-light text-dark border me-2">
                            {letter.spk.no_spk}
                        </span>
                    )}
                    <span className="text-muted small">
                        Klien: <strong>{letter.client_name ? `${letter.client_name}${letter.spk?.client_code ? ` (${letter.spk.client_code})` : ""}` : (letter.spk?.client_code ?? "-")}</strong> | Periode: <strong>{letter.periode.label}</strong>
                    </span>
                </div>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setIsSourceOpen(true)}
                >
                    <i className="bi bi-list-check me-1" />
                    Source Progress Report ({letter.details.length})
                </button>
            </div>

            {errorMessage !== null && (
                <div className="alert alert-danger mx-3 mt-2">
                    {errorMessage}
                </div>
            )}

            {/* Document Workspace with Ribbon Toolbar and A4 Canvas */}
            <RepresentativeLetterDocumentWorkspace
                letter={letter}
                content={content}
                settings={settings}
                onContentChange={handleContentChange}
                onSettingsChange={handleSettingsChange}
                isDirty={isDirty}
                isSaving={saveState === 'saving'}
            />

            <RepresentativeLetterSourceDrawer
                details={letter.details}
                isOpen={isSourceOpen}
                onClose={() => setIsSourceOpen(false)}
            />

        </div>
    )
}

export default RepresentativeLetterEditorPage
