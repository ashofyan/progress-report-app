import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import RepresentativeLetterHeaderListPage from '@/features/representative-letter/pages/RepresentativeLetterHeaderListPage'
import RepresentativeLetterTemplateListPage from '@/features/representative-letter/pages/RepresentativeLetterTemplateListPage'

import '@/features/representative-letter/styles/representative-letter.scss'

interface RepresentativeLetterMasterLayoutPageProps {
    defaultTab?: 'template' | 'header'
}

const RepresentativeLetterMasterLayoutPage = ({
    defaultTab = 'template',
}: RepresentativeLetterMasterLayoutPageProps = {}) => {
    const [searchParams, setSearchParams] = useSearchParams()
    const queryTab = searchParams.get('tab')

    const initialTab =
        queryTab === 'header' || queryTab === 'kop-surat'
            ? 'header'
            : defaultTab === 'header'
            ? 'header'
            : 'template'

    const [activeTab, setActiveTab] = useState<'template' | 'header'>(initialTab)

    useEffect(() => {
        if (queryTab === 'header' || queryTab === 'kop-surat') {
            setActiveTab('header')
        } else if (queryTab === 'template' || queryTab === 'layout') {
            setActiveTab('template')
        }
    }, [queryTab])

    const handleSelectTab = (tab: 'template' | 'header') => {
        setActiveTab(tab)
        setSearchParams({ tab })
    }

    return (
        <div className="representative-letter-page-shell">
            <div className="representative-letter-heading">
                <div>
                    <h1 className="representative-letter-title">
                        Master Layout RL
                    </h1>
                    <p className="text-muted small mb-0">
                        Pusat pengelolaan tata letak dokumen Representative Letter, template konten dinamis, margin halaman, watermark, serta Header &amp; Footer Kop Surat resmi.
                    </p>
                </div>

                <div className="representative-letter-breadcrumb">
                    <span className="active">Progress</span>
                    <span>/</span>
                    <span>Representative Letter</span>
                    <span>/</span>
                    <span>Master Layout RL</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white border-bottom p-0">
                    <ul className="nav nav-tabs border-0 px-3 pt-2">
                        <li className="nav-item">
                            <button
                                type="button"
                                className={`nav-link border-0 px-4 py-3 fw-semibold d-flex align-items-center gap-2 ${
                                    activeTab === 'template'
                                        ? 'active border-bottom border-primary border-3 text-primary bg-transparent'
                                        : 'text-muted'
                                }`}
                                onClick={() => handleSelectTab('template')}
                            >
                                <i className="bi bi-layout-text-window-reverse" />
                                <span>Master Template &amp; Layout RL</span>
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                type="button"
                                className={`nav-link border-0 px-4 py-3 fw-semibold d-flex align-items-center gap-2 ${
                                    activeTab === 'header'
                                        ? 'active border-bottom border-primary border-3 text-primary bg-transparent'
                                        : 'text-muted'
                                }`}
                                onClick={() => handleSelectTab('header')}
                            >
                                <i className="bi bi-card-heading" />
                                <span>Header Kop Surat</span>
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="card-body p-4">
                    {activeTab === 'template' && (
                        <RepresentativeLetterTemplateListPage
                            embedded={true}
                            onSwitchToHeaderTab={() => handleSelectTab('header')}
                        />
                    )}

                    {activeTab === 'header' && (
                        <RepresentativeLetterHeaderListPage
                            embedded={true}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default RepresentativeLetterMasterLayoutPage
