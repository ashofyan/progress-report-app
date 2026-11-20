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

    // Filters: Client & Date Range
    const [clientCode, setClientCode] = useState<string>('')
    const [startDate, setStartDate] = useState<string>(getInitialStartDate())
    const [endDate, setEndDate] = useState<string>(getInitialEndDate())

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

    // Fetch available progress reports when client, dates, job, or spk change
    useEffect(() => {
        if (!clientCode || clientCode.trim() === '' || !startDate || !endDate) {
            setAvailableReports([])
            setSelectedDetailIds([])
            setExpandedPrIds([])
            return
        }

        const fetchAvailable = async () => {
            setIsLoadingReports(true)
            const res = await representativeLetterApi.getAvailableProgressReports({
                client_code: clientCode,
                start_date: startDate,
                end_date: endDate,
                job_id: selectedJobId === '' ? undefined : selectedJobId,
                spk_id: selectedSpkId === '' ? undefined : selectedSpkId,
            })
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
    }, [clientCode, startDate, endDate, selectedJobId, selectedSpkId])

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
        if (!clientCode || clientCode.trim() === '' || !startDate || !endDate) {
            setErrorMessage('Client dan Range Tanggal wajib diisi.')
            return
        }

        if (selectedDetailIds.length === 0) {
            setErrorMessage('Pilih minimal satu Task Progress Report untuk draf Representative Letter.')
            return
        }

        setIsGenerating(true)
        setErrorMessage(null)

        // 1. Generate draft content
        let draftHtml: string | null = null
        let draftSettings = resolveRepresentativeLetterDocumentSettings(null)

        const draftResult = await representativeLetterApi.generateDraft({
            client_code: clientCode,
            client_name: clientFullName,
            start_date: startDate,
            end_date: endDate,
            job_id: selectedJobId === '' ? undefined : selectedJobId,
            spk_id: selectedSpkId === '' ? undefined : selectedSpkId,
            progress_report_detail_ids: selectedDetailIds,
            template_id: selectedTemplateId === '' ? undefined : selectedTemplateId,
            header_id: selectedHeaderId === '' ? undefined : selectedHeaderId,
        })

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
        const result = await representativeLetterApi.create({
            client_code: clientCode,
            client_name: clientFullName,
            start_date: startDate,
            end_date: endDate,
            tanggal_awal: startDate,
            tanggal_akhir: endDate,
            job_id: selectedJobId === '' ? undefined : selectedJobId,
            spk_id: selectedSpkId === '' ? undefined : selectedSpkId,
            als_spk_id: selectedSpkId === '' ? undefined : selectedSpkId,
            header_id: selectedHeaderId === '' ? undefined : selectedHeaderId,
            template_id: selectedTemplateId === '' ? undefined : selectedTemplateId,
            progress_report_detail_ids: selectedDetailIds,
        })

        if (
            result.success &&
            result.data !== undefined
        ) {
            const finalContent =
                draftHtml !== null
                    ? draftHtml
                    : result.data.content

            const finalSettings = resolveRepresentativeLetterDocumentSettings(
                draftHtml !== null ? draftSettings : result.data.document_settings,
            )

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

            <section className="representative-letter-form-page">
                {errorMessage !== null && (
                    <div className="alert alert-danger mb-3">
                        <i className="bi bi-exclamation-triangle me-2" />
                        {errorMessage}
                    </div>
                )}

                <div className="row g-3">
                    <div className="col-md-4">
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

                    <div className="col-md-4">
                        <label className="form-label fw-semibold text-secondary small">
                            Tanggal Mulai <span className="text-danger">*</span>
                        </label>
                        <input
                            type="date"
                            className="form-control"
                            value={startDate}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setStartDate(e.target.value)
                            }}
                        />
                    </div>

                    <div className="col-md-4">
                        <label className="form-label fw-semibold text-secondary small">
                            Tanggal Selesai <span className="text-danger">*</span>
                        </label>
                        <input
                            type="date"
                            className="form-control"
                            value={endDate}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setEndDate(e.target.value)
                            }}
                        />
                    </div>

                    {/* Jasa Pekerjaan & SPK Row */}
                    <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary small d-flex justify-content-between">
                            <span>Jasa Pekerjaan</span>
                            {jobs.length > 1 && (
                                <span className="text-muted fw-normal">({jobs.length} jasa tersedia)</span>
                            )}
                        </label>
                        <select
                            className="form-select"
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
                        <div className="form-text small text-muted" style={{ fontSize: '11px' }}>
                            {isLoadingJobs
                                ? 'Memuat daftar jasa...'
                                : jobs.length > 1
                                ? 'Opsional: pilih jasa tertentu atau biarkan "Semua Jasa Pekerjaan".'
                                : 'Jasa pekerjaan terkait klien ini.'}
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label fw-semibold text-secondary small d-flex justify-content-between">
                            <span>SPK (Opsional)</span>
                            {filteredSpks.length > 0 && (
                                <span className="text-muted fw-normal">({filteredSpks.length} SPK tersedia)</span>
                            )}
                        </label>
                        <select
                            className="form-select"
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
                        <div className="form-text small text-muted" style={{ fontSize: '11px' }}>
                            {isLoadingSpks
                                ? 'Memuat SPK...'
                                : 'Default mencakup semua SPK klien. Pilih satu SPK jika ingin dibatasi.'}
                        </div>
                    </div>
                </div>

                {/* Master Layout & Template RL Section */}
                <div className="card border-0 shadow-sm mt-3 bg-light-subtle">
                    <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom">
                            <div className="d-flex align-items-center gap-2">
                                <i className="bi bi-layout-text-window text-primary" />
                                <span className="fw-bold text-dark small">
                                    Template Layout RL (Kop & Template Pembuka/Penutup)
                                </span>
                            </div>
                            {selectedTemplate && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link p-0 text-decoration-none small"
                                    onClick={() => setShowTemplatePreview((prev) => !prev)}
                                >
                                    <i className={`bi ${showTemplatePreview ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`} />
                                    {showTemplatePreview ? 'Sembunyikan Preview Template' : 'Lihat Teks Pembuka & Penutup'}
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
                                    Header & Footer (Kop Surat)
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
                                        'Kop atas & bawah diterapkan pada PDF dan preview.'
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Collapsible preview of opening & closing templates */}
                        {showTemplatePreview && selectedTemplate && (
                            <div className="mt-3 pt-3 border-top bg-white p-3 rounded border">
                                <div className="mb-2">
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-1">
                                        Template Pembuka (Opening)
                                    </span>
                                    <div
                                        className="small text-muted p-2 rounded bg-light border"
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
                                        className="small text-muted p-2 rounded bg-light border"
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
                </div>

                <div className="representative-letter-form-footer mt-3">
                    <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => navigate('/representative-letter')}
                    >
                        Batal
                    </button>
                </div>
            </section>

            {/* Task Selection Section */}
            {clientCode !== '' && (
                <section className="representative-letter-form-page mt-3">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom">
                        <div>
                            <h2 className="h6 mb-1 text-dark fw-bold d-flex align-items-center gap-2">
                                <i className="bi bi-list-check text-primary" />
                                Pilih Task Progress Report
                            </h2>
                            <p className="text-muted small mb-0">
                                Pilih task yang akan dicantumkan dalam hierarki Dokumen Representative Letter.
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

                    {/* Footer Actions */}
                    <div className="representative-letter-form-footer mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                        <span className="text-muted small">
                            <strong>{selectedDetailIds.length}</strong> dari <strong>{allTasks.length}</strong> Task dipilih
                            {selectedTemplate && (
                                <span className="ms-2 badge bg-light text-secondary border">
                                    Template: {selectedTemplate.name}
                                </span>
                            )}
                        </span>

                        <button
                            type="button"
                            className="btn btn-primary px-4"
                            disabled={
                                isGenerating ||
                                (allTasks.length > 0 && selectedDetailIds.length === 0)
                            }
                            onClick={() => void handleGenerate()}
                        >
                            {isGenerating && (
                                <span className="spinner-border spinner-border-sm me-2" />
                            )}
                            <i className="bi bi-file-earmark-plus me-1" />
                            Generate Draft Representative Letter
                        </button>
                    </div>
                </section>
            )}
        </div>
    )
}

export default RepresentativeLetterCreatePage
