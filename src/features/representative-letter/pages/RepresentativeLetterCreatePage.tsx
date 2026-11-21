import {
    type ReactElement,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import type { DailyProgressFormSpk } from '@/features/daily-progress/types/daily-progress.types'
import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    AvailableProgressReport,
    AvailableProgressReportTask,
    MasterJob,
    RepresentativeLetterHeader,
    RepresentativeLetterTemplate,
} from '@/features/representative-letter/types/representative-letter.types'
import {
    monthOptions,
    resolveRepresentativeLetterDocumentSettings,
} from '@/features/representative-letter/utils/documentSettings'

import '@/features/representative-letter/styles/representative-letter.scss'

const getInitialStartDate = (): string => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}-01`
}

const getInitialEndDate = (): string => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const getSpkLabel = (spk: DailyProgressFormSpk): string => {
    const description =
        spk.note ??
        spk.job?.description ??
        spk.kode_product_jasa ??
        'Tanpa deskripsi'

    return `${spk.no_spk} - ${description}`
}

const RepresentativeLetterCreatePage = (): ReactElement => {
    const navigate = useNavigate()

    // Filters: Client & Date / Periode
    const [clientCode, setClientCode] = useState<string>('')
    const [dateFilterType, setDateFilterType] = useState<'range' | 'month'>('range')
    const [startDate, setStartDate] = useState<string>(getInitialStartDate())
    const [endDate, setEndDate] = useState<string>(getInitialEndDate())
    const [selectedBulan, setSelectedBulan] = useState<number>(new Date().getMonth() + 1)
    const [selectedTahun, setSelectedTahun] = useState<number>(new Date().getFullYear())

    // Jasa Pekerjaan & SPK
    const [jobs, setJobs] = useState<MasterJob[]>([])
    const [selectedJobId, setSelectedJobId] = useState<number | ''>('')
    const [spks, setSpks] = useState<DailyProgressFormSpk[]>([])
    const [selectedSpkId, setSelectedSpkId] = useState<number | ''>('')

    // Templates & Headers
    const [templates, setTemplates] = useState<RepresentativeLetterTemplate[]>([])
    const [headers, setHeaders] = useState<RepresentativeLetterHeader[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('')
    const [selectedHeaderId, setSelectedHeaderId] = useState<number | ''>('')
    const [isLoadingLayouts, setIsLoadingLayouts] = useState<boolean>(false)
    const [showTemplatePreview, setShowTemplatePreview] = useState<boolean>(false)

    // Progress Reports & Task Selection
    const [availableReports, setAvailableReports] = useState<AvailableProgressReport[]>([])
    const [selectedDetailIds, setSelectedDetailIds] = useState<number[]>([])
    const [expandedPrIds, setExpandedPrIds] = useState<number[]>([])
    const [taskFilter, setTaskFilter] = useState<'all' | 'selesai' | 'pending'>('all')
    const [isCustomizingTasks, setIsCustomizingTasks] = useState<boolean>(false)
    const [useAiNotes, setUseAiNotes] = useState<boolean>(true)

    // Loading states
    const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false)
    const [isLoadingSpks, setIsLoadingSpks] = useState<boolean>(false)
    const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false)
    const [isGenerating, setIsGenerating] = useState<boolean>(false)

    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const selectedClient = useMemo(
        () => clients.find((c) => c.customer_code === clientCode) ?? null,
        [clientCode, clients],
    )

    const clientFullName = useMemo(
        () => (selectedClient ? (selectedClient.company_name || selectedClient.customer_name) : undefined),
        [selectedClient],
    )

    const selectedTemplate = useMemo(
        () => templates.find((t) => t.id === selectedTemplateId) ?? null,
        [selectedTemplateId, templates],
    )

    const selectedHeader = useMemo(
        () => headers.find((h) => h.id === selectedHeaderId) ?? null,
        [headers, selectedHeaderId],
    )

    // Filtered SPKs based on selected Job
    const filteredSpks = useMemo(() => {
        if (selectedJobId === '') return spks
        const job = jobs.find((j) => j.id === selectedJobId)
        if (!job) return spks
        return spks.filter(
            (s) => s.job?.id === selectedJobId || s.kode_product_jasa === job.job_code,
        )
    }, [jobs, selectedJobId, spks])

    const allTasks = useMemo<AvailableProgressReportTask[]>(() => {
        return availableReports.flatMap((pr) => pr.tasks ?? [])
    }, [availableReports])

    const selesaiTasksCount = useMemo(() => {
        return allTasks.filter((t) => t.status === 'selesai').length
    }, [allTasks])

    const pendingTasksCount = useMemo(() => {
        return allTasks.filter((t) => t.status === 'pending').length
    }, [allTasks])

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    // Load templates & headers on mount
    useEffect(() => {
        const loadLayoutOptions = async () => {
            setIsLoadingLayouts(true)
            const [tplRes, hdrRes] = await Promise.all([
                representativeLetterApi.getTemplates({ is_active: true }),
                representativeLetterApi.getHeaders(),
            ])
            setIsLoadingLayouts(false)

            if (tplRes.success && tplRes.data && tplRes.data.length > 0) {
                setTemplates(tplRes.data)
                const activeTpl = tplRes.data.find((t) => t.is_active) ?? tplRes.data[0]
                setSelectedTemplateId(activeTpl.id)
                if (activeTpl.default_header_id) {
                    setSelectedHeaderId(activeTpl.default_header_id)
                }
            }

            if (hdrRes.success && hdrRes.data && hdrRes.data.length > 0) {
                const headerData = hdrRes.data
                setHeaders(headerData)
                setSelectedHeaderId((prev) => {
                    if (prev !== '') return prev
                    const activeHdr = headerData.find((h) => h.is_active) ?? headerData[0]
                    return activeHdr ? activeHdr.id : ''
                })
            }
        }

        void loadLayoutOptions()
    }, [])

    const handleTemplateChange = (templateId: number | '') => {
        setSelectedTemplateId(templateId)
        if (templateId !== '') {
            const tpl = templates.find((t) => t.id === templateId)
            if (tpl?.default_header_id) {
                setSelectedHeaderId(tpl.default_header_id)
            }
        }
    }

    // Fetch Jobs & SPKs when client changes
    useEffect(() => {
        if (!clientCode || clientCode.trim() === '') {
            setJobs([])
            setSelectedJobId('')
            setSpks([])
            setSelectedSpkId('')
            setAvailableReports([])
            setSelectedDetailIds([])
            setExpandedPrIds([])
            return
        }

        const fetchJobsAndSpks = async () => {
            setIsLoadingJobs(true)
            setIsLoadingSpks(true)

            const [jobsRes, spksRes] = await Promise.all([
                representativeLetterApi.getJobs({ client_code: clientCode }),
                representativeLetterApi.getSpks({ client_code: clientCode }),
            ])

            setIsLoadingJobs(false)
            setIsLoadingSpks(false)

            if (jobsRes.success && jobsRes.data && jobsRes.data.length > 0) {
                setJobs(jobsRes.data)
                if (jobsRes.data.length === 1) {
                    setSelectedJobId(jobsRes.data[0].id)
                } else {
                    setSelectedJobId('')
                }
            } else {
                setJobs([])
                setSelectedJobId('')
            }

            if (spksRes.success && spksRes.data && spksRes.data.length > 0) {
                setSpks(spksRes.data)
                setSelectedSpkId('')
            } else {
                setSpks([])
                setSelectedSpkId('')
            }
        }

        void fetchJobsAndSpks()
    }, [clientCode])

    // If selected SPK is not in filteredSpks when job changes, reset it
    useEffect(() => {
        if (selectedSpkId !== '' && !filteredSpks.some((s) => s.spk_id === selectedSpkId)) {
            setSelectedSpkId('')
        }
    }, [filteredSpks, selectedSpkId])

    // Fetch available progress reports when client, dates/periode, job, or spk change
    useEffect(() => {
        const hasSource = Boolean(clientCode && clientCode.trim() !== '') || selectedSpkId !== ''
        const hasDateRange = dateFilterType === 'range' && Boolean(startDate && endDate)
        const hasMonthPeriod = dateFilterType === 'month' && Boolean(selectedBulan && selectedTahun)

        if (!hasSource || (!hasDateRange && !hasMonthPeriod)) {
            setAvailableReports([])
            setSelectedDetailIds([])
            setExpandedPrIds([])
            return
        }

        const fetchAvailable = async () => {
            setIsLoadingReports(true)
            const filters: {
                client_code?: string
                spk_id?: number
                job_id?: number
                start_date?: string
                end_date?: string
                bulan?: number
                tahun?: number
            } = {
                client_code: clientCode || undefined,
                job_id: selectedJobId === '' ? undefined : selectedJobId,
                spk_id: selectedSpkId === '' ? undefined : selectedSpkId,
            }

            if (dateFilterType === 'range') {
                filters.start_date = startDate
                filters.end_date = endDate
            } else {
                filters.bulan = selectedBulan
                filters.tahun = selectedTahun
            }

            const res = await representativeLetterApi.getAvailableProgressReports(filters)
            setIsLoadingReports(false)

            if (res.success && res.data && res.data.length > 0) {
                setAvailableReports(res.data)
                // Expand all by default
                setExpandedPrIds(res.data.map((r) => r.id))
                // Select all tasks by default
                const allDetailIds = res.data.flatMap((r) =>
                    (r.tasks ?? []).map((t) => t.progress_report_detail_id),
                )
                setSelectedDetailIds(allDetailIds)
            } else {
                setAvailableReports([])
                setSelectedDetailIds([])
                setExpandedPrIds([])
            }
        }

        void fetchAvailable()
    }, [
        clientCode,
        dateFilterType,
        startDate,
        endDate,
        selectedBulan,
        selectedTahun,
        selectedJobId,
        selectedSpkId,
    ])

    // Task selection helpers
    const handleToggleTask = (detailId: number) => {
        setSelectedDetailIds((prev) =>
            prev.includes(detailId)
                ? prev.filter((id) => id !== detailId)
                : [...prev, detailId],
        )
    }

    const handleTogglePrTasks = (pr: AvailableProgressReport) => {
        const prDetailIds = (pr.tasks ?? []).map((t) => t.progress_report_detail_id)
        const isAllSelected = prDetailIds.every((id) => selectedDetailIds.includes(id))

        if (isAllSelected) {
            setSelectedDetailIds((prev) => prev.filter((id) => !prDetailIds.includes(id)))
        } else {
            setSelectedDetailIds((prev) => Array.from(new Set([...prev, ...prDetailIds])))
        }
    }

    const handleSelectAllTasks = () => {
        const allIds = allTasks.map((t) => t.progress_report_detail_id)
        setSelectedDetailIds(allIds)
    }

    const handleSelectAllSelesai = () => {
        const selesaiIds = allTasks
            .filter((t) => t.status === 'selesai')
            .map((t) => t.progress_report_detail_id)
        setSelectedDetailIds(selesaiIds)
    }

    const handleClearAllTasks = () => {
        setSelectedDetailIds([])
    }

    const handleToggleExpandPr = (prId: number) => {
        setExpandedPrIds((prev) =>
            prev.includes(prId) ? prev.filter((id) => id !== prId) : [...prev, prId],
        )
    }

    const handleGenerate = async (): Promise<void> => {
        if ((!clientCode || clientCode.trim() === '') && selectedSpkId === '') {
            setErrorMessage('Client atau SPK sumber data wajib dipilih.')
            return
        }

        if (dateFilterType === 'range' && (!startDate || !endDate)) {
            setErrorMessage('Tanggal Mulai dan Tanggal Selesai wajib diisi.')
            return
        }

        if (dateFilterType === 'month' && (!selectedBulan || !selectedTahun)) {
            setErrorMessage('Bulan dan Tahun periode wajib dipilih.')
            return
        }

        setIsGenerating(true)
        setErrorMessage(null)

        // 1. Generate draft content
        let draftHtml: string | null = null
        let draftSettings = resolveRepresentativeLetterDocumentSettings(null)

        const draftPayload: {
            client_code?: string
            client_name?: string
            start_date?: string
            end_date?: string
            tanggal_awal?: string
            tanggal_akhir?: string
            bulan?: number
            tahun?: number
            job_id?: number
            spk_id?: number
            progress_report_detail_ids?: number[]
            template_id?: number
            header_id?: number
            use_ai_notes?: boolean
        } = {
            client_code: clientCode || undefined,
            client_name: clientFullName,
            job_id: selectedJobId === '' ? undefined : selectedJobId,
            spk_id: selectedSpkId === '' ? undefined : selectedSpkId,
            progress_report_detail_ids:
                selectedDetailIds.length > 0 ? selectedDetailIds : undefined,
            template_id: selectedTemplateId === '' ? undefined : selectedTemplateId,
            header_id: selectedHeaderId === '' ? undefined : selectedHeaderId,
            use_ai_notes: useAiNotes,
        }

        if (dateFilterType === 'range') {
            draftPayload.start_date = startDate
            draftPayload.end_date = endDate
            draftPayload.tanggal_awal = startDate
            draftPayload.tanggal_akhir = endDate
        } else {
            draftPayload.bulan = selectedBulan
            draftPayload.tahun = selectedTahun
        }

        const draftResult = await representativeLetterApi.generateDraft(draftPayload)

        if (draftResult.success && draftResult.data) {
            const data = draftResult.data
            if (typeof data.content === 'string') {
                draftHtml = data.content
            } else if (data.content && typeof data.content.html === 'string') {
                draftHtml = data.content.html
            }
            if (data.settings) {
                draftSettings = resolveRepresentativeLetterDocumentSettings(data.settings)
            }
        }

        // 2. Create the RL record
        const createPayload: {
            client_code?: string
            client_name?: string
            start_date?: string
            end_date?: string
            tanggal_awal?: string
            tanggal_akhir?: string
            bulan?: number
            tahun?: number
            job_id?: number
            spk_id?: number
            als_spk_id?: number
            header_id?: number
            template_id?: number
            progress_report_detail_ids?: number[]
        } = {
            client_code: clientCode || undefined,
            client_name: clientFullName,
            job_id: selectedJobId === '' ? undefined : selectedJobId,
            spk_id: selectedSpkId === '' ? undefined : selectedSpkId,
            als_spk_id: selectedSpkId === '' ? undefined : selectedSpkId,
            header_id: selectedHeaderId === '' ? undefined : selectedHeaderId,
            template_id: selectedTemplateId === '' ? undefined : selectedTemplateId,
            progress_report_detail_ids:
                selectedDetailIds.length > 0 ? selectedDetailIds : undefined,
        }

        if (dateFilterType === 'range') {
            createPayload.start_date = startDate
            createPayload.end_date = endDate
            createPayload.tanggal_awal = startDate
            createPayload.tanggal_akhir = endDate
        } else {
            createPayload.bulan = selectedBulan
            createPayload.tahun = selectedTahun
        }

        const result = await representativeLetterApi.create(createPayload)

        if (
            result.success &&
            result.data !== undefined
        ) {
            const finalContent =
                draftHtml !== null
                    ? draftHtml
                    : result.data.content

            const finalSettings = resolveRepresentativeLetterDocumentSettings(
                selectedTemplate?.settings
                    ? selectedTemplate.settings
                    : draftHtml !== null
                    ? draftSettings
                    : result.data.document_settings,
            )

            // If header is selected, attach its header/footer assets to document_settings
            if (selectedHeader) {
                finalSettings.header_footer = {
                    header_enabled: true,
                    footer_enabled: true,
                    header_image_url: selectedHeader.header?.url || selectedHeader.image?.url || null,
                    footer_image_url: selectedHeader.footer?.url || null,
                    footer_text: selectedHeader.footer?.text || null,
                    footer_type: selectedHeader.footer?.type || 'image',
                }
            }

            // 3. Update with initial generated draft
            const updateResult = await representativeLetterApi.update(
                result.data.id,
                {
                    content: finalContent,
                    content_format: 'html',
                    document_settings: finalSettings,
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

            {errorMessage !== null && (
                <div className="alert alert-danger shadow-sm mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-2" />
                    {errorMessage}
                </div>
            )}

            <div className="rl-form-container">
                {/* 1. Sumber Data & Periode Pekerjaan */}
                <div className="rl-form-section-card">
                    <div className="rl-section-title">
                        <i className="bi bi-building text-primary" />
                        <span>1. Sumber Data &amp; Periode Pekerjaan</span>
                    </div>

                    <div className="row g-3">
                        <div className="col-md-5">
                            <label className="form-label fw-semibold text-secondary small">
                                Client <span className="text-danger">*</span>
                            </label>
                            <ClientSelect
                                clients={clients}
                                selectedCode={clientCode}
                                isLoading={isLoadingClients}
                                errorMessage={clientErrorMessage}
                                onSearch={handleClientSearch}
                                onSelect={(client) => {
                                    setClientCode(client.customer_code)
                                    setSelectedJobId('')
                                    setSelectedSpkId('')
                                }}
                            />
                        </div>

                        <div className="col-md-7">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <label className="form-label fw-semibold text-secondary small mb-0">
                                    {dateFilterType === 'range' ? 'Rentang Tanggal Pekerjaan' : 'Periode Bulan & Tahun'}{' '}
                                    <span className="text-danger">*</span>
                                </label>
                                <div className="btn-group btn-group-sm" role="group">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${dateFilterType === 'range' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setDateFilterType('range')}
                                        style={{ fontSize: '11px', padding: '1px 8px' }}
                                    >
                                        Rentang Tanggal
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${dateFilterType === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setDateFilterType('month')}
                                        style={{ fontSize: '11px', padding: '1px 8px' }}
                                    >
                                        Bulan &amp; Tahun
                                    </button>
                                </div>
                            </div>

                            {dateFilterType === 'range' ? (
                                <div className="row g-2">
                                    <div className="col-6">
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-light text-muted" style={{ fontSize: '11px' }}>Mulai</span>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={startDate}
                                                title="Tanggal Mulai"
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                    setStartDate(e.target.value)
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-light text-muted" style={{ fontSize: '11px' }}>Selesai</span>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={endDate}
                                                title="Tanggal Selesai"
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                    setEndDate(e.target.value)
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="row g-2">
                                    <div className="col-7">
                                        <select
                                            className="form-select form-select-sm"
                                            value={selectedBulan}
                                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                                setSelectedBulan(Number(e.target.value))
                                            }}
                                        >
                                            {monthOptions.map((m) => (
                                                <option key={m.value} value={m.value}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-5">
                                        <input
                                            type="number"
                                            className="form-control form-control-sm"
                                            value={selectedTahun}
                                            min={2000}
                                            max={2100}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                setSelectedTahun(Number(e.target.value))
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Jasa Pekerjaan & SPK Row */}
                        <div className="col-md-6">
                            <label className="form-label fw-semibold text-secondary small d-flex justify-content-between mb-1">
                                <span>Jasa Pekerjaan</span>
                                {jobs.length > 1 && (
                                    <span className="text-muted fw-normal">({jobs.length} jasa tersedia)</span>
                                )}
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedJobId}
                                disabled={isLoadingJobs || jobs.length === 0}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                    const val = e.target.value === '' ? '' : Number(e.target.value)
                                    setSelectedJobId(val)
                                }}
                            >
                                <option value="">Semua Jasa Pekerjaan</option>
                                {jobs.map((job) => (
                                    <option key={job.id} value={job.id}>
                                        {job.job_code} - {job.description || 'Pekerjaan Jasa'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label fw-semibold text-secondary small d-flex justify-content-between mb-1">
                                <span>SPK (Opsional)</span>
                                {filteredSpks.length > 0 && (
                                    <span className="text-muted fw-normal">({filteredSpks.length} SPK tersedia)</span>
                                )}
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedSpkId}
                                disabled={isLoadingSpks || filteredSpks.length === 0}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                    setSelectedSpkId(
                                        e.target.value === ''
                                            ? ''
                                            : Number(e.target.value),
                                    )
                                }}
                            >
                                <option value="">Semua SPK ({filteredSpks.length})</option>
                                {filteredSpks.map((spk) => (
                                    <option key={spk.spk_id} value={spk.spk_id}>
                                        {getSpkLabel(spk)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Template Dokumen & Kop Surat */}
                <div className="rl-form-section-card">
                    <div className="rl-section-title d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-layout-text-window text-primary" />
                            <span>2. Template Layout RL &amp; Kop Surat</span>
                        </div>
                        {selectedTemplate && (
                            <button
                                type="button"
                                className="btn btn-sm btn-link p-0 text-decoration-none small text-primary"
                                onClick={() => setShowTemplatePreview((prev) => !prev)}
                            >
                                <i className={`bi ${showTemplatePreview ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`} />
                                {showTemplatePreview ? 'Tutup Preview Template' : 'Lihat Teks Pembuka & Penutup'}
                            </button>
                        )}
                    </div>

                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label small text-secondary fw-semibold mb-1">
                                Template Dokumen RL
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedTemplateId}
                                disabled={isLoadingLayouts || templates.length === 0}
                                onChange={(e) =>
                                    handleTemplateChange(
                                        e.target.value === '' ? '' : Number(e.target.value),
                                    )
                                }
                            >
                                {templates.length === 0 ? (
                                    <option value="">(Belum ada template master)</option>
                                ) : (
                                    templates.map((tpl) => (
                                        <option key={tpl.id} value={tpl.id}>
                                            {tpl.name} {tpl.is_active ? '★ (Aktif)' : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                            <div className="form-text small text-muted" style={{ fontSize: '11px' }}>
                                {selectedTemplate ? (
                                    <span className="text-success">
                                        <i className="bi bi-check-circle me-1" />
                                        Memuat bagian Pembuka, Penutup, dan Tanda Tangan otomatis
                                    </span>
                                ) : (
                                    'Template default sistem akan digunakan jika kosong.'
                                )}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="form-label small text-secondary fw-semibold mb-1">
                                Header &amp; Footer (Kop Surat)
                            </label>
                            <select
                                className="form-select form-select-sm"
                                value={selectedHeaderId}
                                disabled={isLoadingLayouts || headers.length === 0}
                                onChange={(e) =>
                                    setSelectedHeaderId(
                                        e.target.value === '' ? '' : Number(e.target.value),
                                    )
                                }
                            >
                                <option value="">Tanpa Kop / Default Template</option>
                                {headers.map((hdr) => (
                                    <option key={hdr.id} value={hdr.id}>
                                        {hdr.code} - {hdr.name} {hdr.is_active ? '★ (Aktif)' : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="form-text small text-muted" style={{ fontSize: '11px' }}>
                                {selectedHeader?.footer?.text ? (
                                    <span>
                                        Footer teks: <em>{selectedHeader.footer.text}</em>
                                    </span>
                                ) : selectedHeader?.footer?.url ? (
                                    <span>Footer gambar aktif</span>
                                ) : (
                                    'Kop atas &amp; bawah diterapkan pada PDF dan preview.'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Collapsible preview of opening & closing templates */}
                    {showTemplatePreview && selectedTemplate && (
                        <div className="mt-3 pt-3 border-top bg-light p-3 rounded border">
                            <div className="mb-2">
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-1">
                                    Template Pembuka (Opening)
                                </span>
                                <div
                                    className="small text-muted p-2 rounded bg-white border"
                                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            selectedTemplate.opening_template ||
                                            '(Menggunakan pembuka default sistem)',
                                    }}
                                />
                            </div>
                            <div>
                                <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle mb-1">
                                    Template Penutup (Closing)
                                </span>
                                <div
                                    className="small text-muted p-2 rounded bg-white border"
                                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            selectedTemplate.closing_template ||
                                            '(Menggunakan penutup default sistem)',
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Collapsible / Accordion "Kustomisasi Task (Opsional)" */}
                <div className="card border shadow-sm bg-white overflow-hidden">
                    {/* Ringkasan Singkat yang bisa di-klik */}
                    <div
                        className={`card-header py-3 px-3 d-flex flex-wrap align-items-center justify-content-between ${
                            isCustomizingTasks ? 'bg-primary-subtle border-bottom' : 'bg-light'
                        }`}
                        style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                        onClick={() => {
                            if (clientCode !== '' || selectedSpkId !== '') {
                                setIsCustomizingTasks((prev) => !prev)
                            }
                        }}
                    >
                        <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-info-circle-fill text-primary" style={{ fontSize: '18px' }} />
                            <div className="small text-dark">
                                {!clientCode && selectedSpkId === '' ? (
                                    <span className="text-muted">
                                        Pilih Klien dan Periode Pekerjaan di atas untuk memuat task Progress Report yang tersedia.
                                    </span>
                                ) : isLoadingReports ? (
                                    <span className="text-muted">
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Memeriksa ketersediaan task selesai...
                                    </span>
                                ) : allTasks.length === 0 ? (
                                    <span>
                                        Belum ditemukan task selesai pada periode ini.{' '}
                                        <span className="text-muted">
                                            (Secara default semua task selesai akan disertakan saat generate)
                                        </span>
                                    </span>
                                ) : (
                                    <span>
                                        {selectedDetailIds.length > 0 && selectedDetailIds.length !== allTasks.length ? (
                                            <>
                                                Kustomisasi aktif: <strong>{selectedDetailIds.length}</strong> dari <strong>{allTasks.length}</strong> task dipilih.
                                            </>
                                        ) : (
                                            <>
                                                Ditemukan <strong>{selesaiTasksCount} Task Selesai</strong> pada periode ini. Secara default semua task akan disertakan.
                                            </>
                                        )}
                                        <span className="ms-2 text-primary fw-semibold text-decoration-underline">
                                            {isCustomizingTasks
                                                ? '[ Tutup Kustomisasi ]'
                                                : '[ Klik untuk Kustomisasi / Pilih Task ]'}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-3">
                            <span className="badge bg-white text-dark border small">
                                {!clientCode && selectedSpkId === ''
                                    ? 'Pilih Klien'
                                    : selectedDetailIds.length > 0 && selectedDetailIds.length !== allTasks.length
                                    ? `${selectedDetailIds.length} Task Dipilih`
                                    : 'Default: Semua Selesai'}
                            </span>
                            {(clientCode !== '' || selectedSpkId !== '') && (
                                <i
                                    className={`bi ${isCustomizingTasks ? 'bi-chevron-up' : 'bi-chevron-down'} text-secondary`}
                                />
                            )}
                        </div>
                    </div>

                    {/* Jika di-klik, barulah tabel checklist task terbuka bagi user yang butuh memilah */}
                    {isCustomizingTasks && (
                        <div className="card-body p-3">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom">
                                <div>
                                    <h2 className="h6 mb-1 text-dark fw-bold d-flex align-items-center gap-2">
                                        <i className="bi bi-list-check text-primary" />
                                        Pilih Task Progress Report
                                    </h2>
                                    <p className="text-muted small mb-0">
                                        Pilih task yang akan dicantumkan secara spesifik, atau biarkan tanpa checklist untuk otomatis menyertakan seluruh task berstatus selesai.
                                    </p>
                                </div>

                        {allTasks.length > 0 && (
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                {/* Filter Tabs */}
                                <div className="btn-group btn-group-sm" role="group">
                                    <button
                                        type="button"
                                        className={`btn ${taskFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setTaskFilter('all')}
                                    >
                                        Semua ({allTasks.length})
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn ${taskFilter === 'selesai' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setTaskFilter('selesai')}
                                    >
                                        Selesai ({selesaiTasksCount})
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn ${taskFilter === 'pending' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setTaskFilter('pending')}
                                    >
                                        Pending ({pendingTasksCount})
                                    </button>
                                </div>

                                {/* Bulk Action Buttons */}
                                <div className="btn-group btn-group-sm" role="group">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={handleSelectAllTasks}
                                    >
                                        Pilih Semua
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-success"
                                        onClick={handleSelectAllSelesai}
                                    >
                                        Pilih Selesai
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        onClick={handleClearAllTasks}
                                    >
                                        Batalkan
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {isLoadingReports ? (
                        <div className="text-center py-4 text-muted">
                            <span className="spinner-border spinner-border-sm me-2" />
                            Memuat daftar Progress Report dan Task...
                        </div>
                    ) : availableReports.length === 0 ? (
                        <div className="alert alert-light border text-muted py-3">
                            <i className="bi bi-info-circle me-2" />
                            Belum ada Progress Report yang ditemukan untuk rentang tanggal dan kriteria yang dipilih.
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {availableReports.map((pr) => {
                                const prTasks = pr.tasks ?? []
                                const filteredTasks = prTasks.filter((t) => {
                                    if (taskFilter === 'selesai') return t.status === 'selesai'
                                    if (taskFilter === 'pending') return t.status === 'pending'
                                    return true
                                })

                                const prTaskIds = prTasks.map((t) => t.progress_report_detail_id)
                                const selectedInPr = prTaskIds.filter((id) =>
                                    selectedDetailIds.includes(id),
                                )
                                const isAllPrSelected =
                                    prTaskIds.length > 0 &&
                                    selectedInPr.length === prTaskIds.length
                                const isSomePrSelected =
                                    selectedInPr.length > 0 && !isAllPrSelected
                                const isExpanded = expandedPrIds.includes(pr.id)

                                return (
                                    <div
                                        key={pr.id}
                                        className={`card border shadow-sm ${selectedInPr.length > 0 ? 'border-primary-subtle' : ''}`}
                                    >
                                        {/* PR Accordion Header */}
                                        <div
                                            className={`card-header d-flex align-items-center justify-content-between p-3 ${
                                                selectedInPr.length > 0 ? 'bg-primary-subtle' : 'bg-light'
                                            }`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => handleToggleExpandPr(pr.id)}
                                        >
                                            <div className="d-flex align-items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input mt-0"
                                                    checked={isAllPrSelected}
                                                    ref={(el) => {
                                                        if (el) el.indeterminate = isSomePrSelected
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={() => handleTogglePrTasks(pr)}
                                                />

                                                <div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="fw-bold text-dark">
                                                            {pr.nomor}
                                                        </span>
                                                        <span className="text-muted small">
                                                            ({pr.tanggal})
                                                        </span>
                                                        <span
                                                            className={`badge ${
                                                                pr.status === 'selesai'
                                                                    ? 'bg-success'
                                                                    : 'bg-warning text-dark'
                                                            }`}
                                                            style={{ fontSize: '11px' }}
                                                        >
                                                            {pr.status === 'selesai' ? 'Selesai' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div className="small text-muted mt-1">
                                                        {pr.task_name}
                                                        {pr.ringkasan && (
                                                            <span> • {pr.ringkasan}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="d-flex align-items-center gap-3">
                                                <span className="badge bg-white text-dark border small">
                                                    {selectedInPr.length} dari {prTasks.length} task dipilih
                                                </span>
                                                <i
                                                    className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-muted`}
                                                />
                                            </div>
                                        </div>

                                        {/* Collapsible Task List */}
                                        {isExpanded && (
                                            <div className="card-body p-0">
                                                {filteredTasks.length === 0 ? (
                                                    <div className="p-3 text-muted small text-center">
                                                        Tidak ada task yang sesuai dengan filter ({taskFilter}).
                                                    </div>
                                                ) : (
                                                    <div className="list-group list-group-flush">
                                                        {filteredTasks.map((task) => {
                                                            const isChecked = selectedDetailIds.includes(
                                                                task.progress_report_detail_id,
                                                            )

                                                            return (
                                                                <div
                                                                    key={task.progress_report_detail_id}
                                                                    className={`list-group-item list-group-item-action p-3 ${
                                                                        isChecked ? 'bg-light' : ''
                                                                    }`}
                                                                    style={{ cursor: 'pointer' }}
                                                                    onClick={() =>
                                                                        handleToggleTask(
                                                                            task.progress_report_detail_id,
                                                                        )
                                                                    }
                                                                >
                                                                    <div className="d-flex align-items-center justify-content-between">
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="form-check-input mt-0"
                                                                                checked={isChecked}
                                                                                onChange={() =>
                                                                                    handleToggleTask(
                                                                                        task.progress_report_detail_id,
                                                                                    )
                                                                                }
                                                                                onClick={(e) =>
                                                                                    e.stopPropagation()
                                                                                }
                                                                            />
                                                                            <span className="small text-dark fw-semibold">
                                                                                {task.parent_task_name ? (
                                                                                    <>
                                                                                        <span className="text-secondary fw-normal">
                                                                                            {task.parent_task_name}
                                                                                        </span>
                                                                                        <i className="bi bi-chevron-right mx-1 text-muted" style={{ fontSize: '11px' }} />
                                                                                        <span>{task.task_name}</span>
                                                                                    </>
                                                                                ) : (
                                                                                    task.task_name
                                                                                )}
                                                                            </span>
                                                                        </div>

                                                                        <span
                                                                            className={`badge ${
                                                                                task.status === 'selesai'
                                                                                    ? 'bg-success-subtle text-success border border-success-subtle'
                                                                                    : 'bg-warning-subtle text-warning border border-warning-subtle'
                                                                            }`}
                                                                            style={{ fontSize: '11px' }}
                                                                        >
                                                                            {task.status === 'selesai'
                                                                                ? 'Selesai'
                                                                                : 'Pending'}
                                                                        </span>
                                                                    </div>

                                                                    {/* Notes / Catatan per task */}
                                                                    {task.notes && task.notes.length > 0 && (
                                                                        <div className="ps-4 mt-1">
                                                                            {task.notes.map((note) => (
                                                                                <div
                                                                                    key={note.id}
                                                                                    className="d-flex align-items-start gap-1 text-muted small"
                                                                                    style={{ fontSize: '12px' }}
                                                                                >
                                                                                    <i
                                                                                        className="bi bi-sticky text-secondary mt-1"
                                                                                        style={{ fontSize: '11px' }}
                                                                                    />
                                                                                    <span>{note.catatan}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {/* Documents & Images attached to task */}
                                                                    {task.documents && task.documents.length > 0 && (
                                                                        <div className="ps-4 mt-2 d-flex flex-wrap gap-2">
                                                                            {task.documents.map((doc) =>
                                                                                doc.is_image ? (
                                                                                    <span
                                                                                        key={doc.id}
                                                                                        className="d-inline-flex align-items-center gap-1 badge bg-light text-dark border px-2 py-1"
                                                                                        title={doc.original_name}
                                                                                        style={{ fontSize: '11px' }}
                                                                                    >
                                                                                        <i className="bi bi-image text-primary" />
                                                                                        <span className="text-truncate" style={{ maxWidth: '160px' }}>
                                                                                            {doc.original_name}
                                                                                        </span>
                                                                                    </span>
                                                                                ) : (
                                                                                    <span
                                                                                        key={doc.id}
                                                                                        className="d-inline-flex align-items-center gap-1 badge bg-light text-dark border px-2 py-1"
                                                                                        title={doc.original_name}
                                                                                        style={{ fontSize: '11px' }}
                                                                                    >
                                                                                        <i className="bi bi-paperclip text-success" />
                                                                                        <span className="text-truncate" style={{ maxWidth: '160px' }}>
                                                                                            {doc.original_name}
                                                                                        </span>
                                                                                    </span>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Temuan & Solusi (Identifikasi Masalah & Saran) */}
                                                                    {task.temuans && task.temuans.length > 0 && (
                                                                        <div className="ps-4 mt-2">
                                                                            {task.temuans.map((temuan, tIdx) => (
                                                                                <div
                                                                                    key={temuan.id ?? tIdx}
                                                                                    className="p-2 rounded bg-warning-subtle border border-warning-subtle mb-1 text-dark small"
                                                                                    style={{ fontSize: '11.5px' }}
                                                                                >
                                                                                    <div className="fw-semibold text-danger-emphasis d-flex align-items-center gap-1">
                                                                                        <i className="bi bi-exclamation-octagon-fill text-danger" style={{ fontSize: '12px' }} />
                                                                                        <span>Identifikasi Masalah:</span>
                                                                                    </div>
                                                                                    <div className="text-secondary mt-1 ps-3">{temuan.masalah}</div>
                                                                                    {temuan.saran && (
                                                                                        <>
                                                                                            <div className="fw-semibold text-success-emphasis d-flex align-items-center gap-1 mt-1">
                                                                                                <i className="bi bi-lightbulb-fill text-success" style={{ fontSize: '12px' }} />
                                                                                                <span>Saran:</span>
                                                                                            </div>
                                                                                            <div className="text-secondary mt-1 ps-3">{temuan.saran}</div>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Inside isCustomizingTasks: simple bar to close customization */}
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                        <span className="text-muted small">
                            {selectedDetailIds.length} dari {allTasks.length} task dipilih
                        </span>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setIsCustomizingTasks(false)}
                        >
                            <i className="bi bi-check-lg me-1" />
                            Selesai Kustomisasi
                        </button>
                    </div>
                </div>
            )}
        </div>

        
                {/* AI Assistant Option for initial Task Notes */}
                <div className="card border shadow-sm p-3 mb-2 bg-white">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: '38px', height: '38px', background: 'rgba(234, 179, 8, 0.15)' }}
                            >
                                <i className="bi bi-stars text-warning fs-5" />
                            </div>
                            <div>
                                <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                                    <span>Bantu Generate Catatan Setiap Task dengan AI</span>
                                    <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '11px' }}>
                                        Format Asli RL Terjaga 100%
                                    </span>
                                </div>
                                <div className="text-muted small" style={{ fontSize: '12px' }}>
                                    AI akan otomatis menyusun kalimat catatan formal dan profesional untuk setiap task pada tabel draf RL awal.
                                </div>
                            </div>
                        </div>
                        <div className="form-check form-switch m-0">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="useAiNotesSwitch"
                                checked={useAiNotes}
                                onChange={(e) => setUseAiNotes(e.target.checked)}
                                style={{ cursor: 'pointer', width: '2.5em', height: '1.25em' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Global Unified Action Footer (Always visible) */}
        <div className="card border-0 shadow-sm bg-white p-3 mt-1">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <button
                    type="button"
                    className="btn btn-light btn-sm px-3"
                    onClick={() => navigate('/representative-letter')}
                >
                    <i className="bi bi-arrow-left me-1" />
                    Batal
                </button>

                <div className="text-muted small d-flex flex-wrap align-items-center gap-2">
                    {selectedDetailIds.length > 0 && selectedDetailIds.length !== allTasks.length ? (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                            <i className="bi bi-check2-square me-1" />
                            Kustomisasi: {selectedDetailIds.length} dari {allTasks.length} Task Dipilih
                        </span>
                    ) : allTasks.length > 0 ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            <i className="bi bi-magic me-1" />
                            Default: Otomatis Semua Task Selesai ({selesaiTasksCount} Task)
                        </span>
                    ) : (
                        <span className="text-muted">
                            <i className="bi bi-info-circle me-1" />
                            Belum ada task termuat
                        </span>
                    )}

                    {selectedTemplate && (
                        <span className="badge bg-light text-secondary border px-2 py-1">
                            Template: {selectedTemplate.name}
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    className="btn btn-primary px-4 py-2 shadow-sm d-flex align-items-center gap-2"
                    disabled={
                        isGenerating ||
                        (!clientCode && selectedSpkId === '') ||
                        (dateFilterType === 'range' ? (!startDate || !endDate) : (!selectedBulan || !selectedTahun))
                    }
                    onClick={() => void handleGenerate()}
                >
                    {isGenerating && (
                        <span className="spinner-border spinner-border-sm" />
                    )}
                    <i className="bi bi-file-earmark-plus" />
                    <span className="fw-semibold">Generate Draft Representative Letter</span>
                </button>
            </div>
        </div>
    </div>
</div>
)
}

export default RepresentativeLetterCreatePage

