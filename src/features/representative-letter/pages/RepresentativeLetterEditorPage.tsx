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
import RepresentativeLetterSaveStatus from '@/features/representative-letter/components/RepresentativeLetterSaveStatus'
import RepresentativeLetterSourceDrawer from '@/features/representative-letter/components/RepresentativeLetterSourceDrawer'
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

    useEffect(() => {
        if (!isDirty || letter === null) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            void save()
        }, 1500)

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

    if (isLoading) {
        return (
            <div className="representative-letter-page-shell">
                <div className="representative-letter-state">
                    <div className="spinner-border" />
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
        <div className="representative-letter-page-shell representative-letter-editor">
            <div className="representative-letter-editor-toolbar">
                <div>
                    <button
                        type="button"
                        className="representative-letter-icon-button"
                        title="Kembali"
                        onClick={() =>
                            navigate('/representative-letter')
                        }
                    >
                        <i className="bi bi-arrow-left" />
                    </button>
                    <div>
                        <h1 className="representative-letter-title">
                            {letter.nomor}
                        </h1>
                        <span>
                            {letter.spk.no_spk} /{' '}
                            {letter.periode.label}
                        </span>
                    </div>
                </div>

                <div className="representative-letter-toolbar-actions">
                    <RepresentativeLetterSaveStatus
                        state={saveState}
                    />

                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setIsSourceOpen(true)}
                    >
                        <i className="bi bi-list-check me-1" />
                        Source Progress Report
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        disabled
                        title="Export PDF belum tersedia."
                    >
                        <i className="bi bi-filetype-pdf me-1" />
                        Export PDF
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={saveState === 'saving' || !isDirty}
                        onClick={() => void save()}
                    >
                        {saveState === 'saving' && (
                            <span className="spinner-border spinner-border-sm me-2" />
                        )}
                        Simpan
                    </button>
                </div>
            </div>

            {errorMessage !== null && (
                <div className="alert alert-danger">
                    {errorMessage}
                </div>
            )}

            <RepresentativeLetterDocumentWorkspace
                letter={letter}
                content={content}
                settings={settings}
                onContentChange={handleContentChange}
                onSettingsChange={handleSettingsChange}
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
