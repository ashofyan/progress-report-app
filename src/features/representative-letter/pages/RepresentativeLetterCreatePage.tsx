import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import { dailyProgressApi } from '@/features/daily-progress/api/dailyProgressApi'
import type {
    DailyProgressFormSpk,
} from '@/features/daily-progress/types/daily-progress.types'
import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import RepresentativeLetterPreview from '@/features/representative-letter/components/RepresentativeLetterPreview'
import type {
    RepresentativeLetterPreview as PreviewData,
} from '@/features/representative-letter/types/representative-letter.types'
import {
    buildRepresentativeLetterContentFromPreview,
} from '@/features/representative-letter/utils/contentTemplate'
import {
    monthOptions,
    resolveRepresentativeLetterDocumentSettings,
} from '@/features/representative-letter/utils/documentSettings'

import '@/features/representative-letter/styles/representative-letter.scss'

const getCurrentYear = (): number => {
    return new Date().getFullYear()
}

const getCurrentMonth = (): number => {
    return new Date().getMonth() + 1
}

const getSpkLabel = (
    spk: DailyProgressFormSpk,
): string => {
    const description =
        spk.note ??
        spk.job?.description ??
        spk.kode_product_jasa ??
        'Tanpa deskripsi'

    return `${spk.no_spk} - ${description}`
}

const RepresentativeLetterCreatePage = () => {
    const navigate = useNavigate()

    const [clientCode, setClientCode] =
        useState<string>('')
    const [bulan, setBulan] =
        useState<number | ''>(getCurrentMonth())
    const [tahun, setTahun] =
        useState<number | ''>(getCurrentYear())
    const [spks, setSpks] =
        useState<DailyProgressFormSpk[]>([])
    const [selectedSpkId, setSelectedSpkId] =
        useState<number | ''>('')
    const [preview, setPreview] =
        useState<PreviewData | null>(null)
    const [isLoadingSpks, setIsLoadingSpks] =
        useState<boolean>(false)
    const [isLoadingPreview, setIsLoadingPreview] =
        useState<boolean>(false)
    const [isGenerating, setIsGenerating] =
        useState<boolean>(false)
    const [spkErrorMessage, setSpkErrorMessage] =
        useState<string | null>(null)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const selectedSpk = useMemo(
        () =>
            spks.find(
                (spk) => spk.spk_id === selectedSpkId,
            ) ?? null,
        [
            selectedSpkId,
            spks,
        ],
    )

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    useEffect(() => {
        if (
            clientCode.trim() === '' ||
            bulan === '' ||
            tahun === ''
        ) {
            queueMicrotask(() => {
                setSpks([])
                setSelectedSpkId('')
                setPreview(null)
            })
            return
        }

        queueMicrotask(() => {
            const fetchSpks = async (): Promise<void> => {
                setIsLoadingSpks(true)
                setSpkErrorMessage(null)

                const result =
                    await dailyProgressApi.getFormData({
                        client_code: clientCode,
                        bulan,
                        tahun,
                    })

                if (
                    result.success &&
                    result.data !== undefined
                ) {
                    setSpks(result.data.spks)
                    setSelectedSpkId('')
                    setPreview(null)
                    setIsLoadingSpks(false)
                    return
                }

                setSpks([])
                setSelectedSpkId('')
                setPreview(null)
                setSpkErrorMessage(result.message)
                setIsLoadingSpks(false)
            }

            void fetchSpks()
        })
    }, [
        bulan,
        clientCode,
        tahun,
    ])

    const handlePreview = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (
            selectedSpk === null ||
            bulan === '' ||
            tahun === ''
        ) {
            setErrorMessage('SPK, bulan, dan tahun wajib diisi.')
            return
        }

        setIsLoadingPreview(true)

        const result = await representativeLetterApi.preview({
            als_spk_id: selectedSpk.spk_id,
            bulan,
            tahun,
        })

        setIsLoadingPreview(false)

        if (
            result.success &&
            result.data !== undefined
        ) {
            setPreview(result.data)
            return
        }

        setPreview(null)
        setErrorMessage(result.message)
    }

    const handleGenerate = async (): Promise<void> => {
        if (
            selectedSpk === null ||
            bulan === '' ||
            tahun === ''
        ) {
            return
        }

        setIsGenerating(true)
        setErrorMessage(null)

        const result = await representativeLetterApi.create({
            als_spk_id: selectedSpk.spk_id,
            bulan,
            tahun,
        })

        if (
            result.success &&
            result.data !== undefined
        ) {
            const templateContent =
                preview === null
                    ? result.data.content
                    : buildRepresentativeLetterContentFromPreview(
                        preview,
                        new Date(),
                    )
            const templateSettings =
                resolveRepresentativeLetterDocumentSettings(
                    result.data.document_settings,
                )
            const updateResult =
                await representativeLetterApi.update(
                    result.data.id,
                    {
                        content: templateContent,
                        content_format: 'html',
                        document_settings: templateSettings,
                    },
                )

            if (!updateResult.success) {
                setIsGenerating(false)
                setErrorMessage(updateResult.message)
                return
            }

            setIsGenerating(false)
            navigate(`/representative-letter/${result.data.id}`)
            return
        }

        setIsGenerating(false)
        setErrorMessage(result.message)
    }

    return (
        <div className="representative-letter-page-shell">
            <div className="representative-letter-heading">
                <h1 className="representative-letter-title">
                    Buat Representative Letter
                </h1>

                <div className="representative-letter-breadcrumb">
                    <span className="active">Progress</span>
                    <span>/</span>
                    <span>Representative Letter</span>
                    <span>/</span>
                    <span>Buat</span>
                </div>
            </div>

            <section className="representative-letter-form-page">
                <form onSubmit={handlePreview}>
                    {errorMessage !== null && (
                        <div className="alert alert-danger">
                            {errorMessage}
                        </div>
                    )}

                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">
                                Client
                            </label>
                            <ClientSelect
                                clients={clients}
                                selectedCode={clientCode}
                                isLoading={isLoadingClients}
                                errorMessage={
                                    clientErrorMessage
                                }
                                onSearch={handleClientSearch}
                                onSelect={(client) => {
                                    setClientCode(
                                        client.customer_code,
                                    )
                                    setSelectedSpkId('')
                                    setPreview(null)
                                }}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">
                                Bulan
                            </label>
                            <select
                                className="form-select"
                                value={bulan}
                                onChange={(
                                    event: ChangeEvent<HTMLSelectElement>,
                                ) => {
                                    setBulan(
                                        event.target.value === ''
                                            ? ''
                                            : Number(
                                                event.target.value,
                                            ),
                                    )
                                    setPreview(null)
                                }}
                            >
                                <option value="">
                                    Pilih bulan
                                </option>
                                {monthOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-2">
                            <label className="form-label">
                                Tahun
                            </label>
                            <input
                                type="number"
                                className="form-control"
                                value={tahun}
                                onChange={(
                                    event: ChangeEvent<HTMLInputElement>,
                                ) => {
                                    setTahun(
                                        event.target.value === ''
                                            ? ''
                                            : Number(
                                                event.target.value,
                                            ),
                                    )
                                    setPreview(null)
                                }}
                            />
                        </div>

                        <div className="col-md-4">
                            <label className="form-label">
                                SPK
                            </label>
                            <select
                                className="form-select"
                                value={selectedSpkId}
                                disabled={
                                    isLoadingSpks ||
                                    spks.length === 0
                                }
                                onChange={(
                                    event: ChangeEvent<HTMLSelectElement>,
                                ) => {
                                    setSelectedSpkId(
                                        event.target.value ===
                                            ''
                                            ? ''
                                            : Number(
                                                event.target
                                                    .value,
                                            ),
                                    )
                                    setPreview(null)
                                }}
                            >
                                <option value="">
                                    Pilih SPK
                                </option>
                                {spks.map((spk) => (
                                    <option
                                        key={spk.spk_id}
                                        value={spk.spk_id}
                                    >
                                        {getSpkLabel(spk)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isLoadingSpks && (
                        <div className="representative-letter-state compact mt-3">
                            Memuat SPK...
                        </div>
                    )}

                    {!isLoadingSpks &&
                        spkErrorMessage !== null && (
                            <div className="representative-letter-state error compact mt-3">
                                {spkErrorMessage}
                            </div>
                        )}

                    <div className="representative-letter-form-footer">
                        <button
                            type="button"
                            className="btn btn-light"
                            disabled={isLoadingPreview}
                            onClick={() =>
                                navigate('/representative-letter')
                            }
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={
                                isLoadingPreview ||
                                selectedSpk === null
                            }
                        >
                            {isLoadingPreview && (
                                <span className="spinner-border spinner-border-sm me-2" />
                            )}
                            Preview
                        </button>
                    </div>
                </form>
            </section>

            {preview !== null && (
                <section className="representative-letter-form-page mt-3">
                    <RepresentativeLetterPreview preview={preview} />

                    <div className="representative-letter-form-footer">
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={
                                isGenerating ||
                                preview.summary
                                    .total_task_selesai === 0
                            }
                            onClick={() => void handleGenerate()}
                        >
                            {isGenerating && (
                                <span className="spinner-border spinner-border-sm me-2" />
                            )}
                            Generate Representative Letter
                        </button>
                    </div>
                </section>
            )}
        </div>
    )
}

export default RepresentativeLetterCreatePage
