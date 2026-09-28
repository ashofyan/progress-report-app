import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import ClientSelect from '@/features/additional-task/components/ClientSelect'
import { useMarketingClients } from '@/features/additional-task/hooks/useMarketingClients'
import SolusiDetailModal from '@/features/solusi/components/SolusiDetailModal'
import { useSolusis } from '@/features/solusi/hooks/useSolusis'

import type {
    Solusi,
    SolusiFilters,
    SolusiSource,
} from '@/features/solusi/types/solusi.types'

import '@/features/temuan/styles/temuan.scss'

const ITEMS_PER_PAGE = 10

const sourceLabels: Record<SolusiSource, string> = {
    menu: 'Menu',
    progress_report: 'Progress Report',
}

const SolusiPage = () => {
    const navigate = useNavigate()

    const {
        solusis,
        isLoading,
        errorMessage,
        fetchSolusis,
    } = useSolusis()

    const [clientCode, setClientCode] =
        useState<string>('')
    const [source, setSource] =
        useState<SolusiSource | ''>('')
    const [searchQuery, setSearchQuery] =
        useState<string>('')
    const [currentPage, setCurrentPage] =
        useState<number>(1)
    const [solusiToView, setSolusiToView] =
        useState<Solusi | null>(null)

    const {
        clients,
        isLoading: isLoadingClients,
        errorMessage: clientErrorMessage,
        searchClients,
    } = useMarketingClients()

    const filters = useMemo<SolusiFilters>(
        () => ({
            client_code:
                clientCode.trim() === ''
                    ? undefined
                    : clientCode.trim(),
            source: source === '' ? undefined : source,
        }),
        [
            clientCode,
            source,
        ],
    )

    const handleClientSearch = useCallback(
        (query: string): void => {
            void searchClients(query)
        },
        [searchClients],
    )

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchSolusis(filters)
        }, 250)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [
        fetchSolusis,
        filters,
    ])

    const filteredSolusis = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()

        if (query === '') {
            return solusis
        }

        return solusis.filter((solusi) => {
            return (
                solusi.temuan.nomor.toLowerCase().includes(query) ||
                solusi.temuan.client_code
                    .toLowerCase()
                    .includes(query) ||
                (solusi.temuan.spk?.no_spk ?? '')
                    .toLowerCase()
                    .includes(query) ||
                (solusi.temuan.job?.description ?? '')
                    .toLowerCase()
                    .includes(query) ||
                solusi.note.note.toLowerCase().includes(query) ||
                solusi.solution.toLowerCase().includes(query)
            )
        })
    }, [
        searchQuery,
        solusis,
    ])

    const totalPages = Math.max(
        1,
        Math.ceil(filteredSolusis.length / ITEMS_PER_PAGE),
    )

    const paginatedSolusis = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return filteredSolusis.slice(
            start,
            start + ITEMS_PER_PAGE,
        )
    }, [
        currentPage,
        filteredSolusis,
    ])

    return (
        <div className="temuan-page">
            <div className="temuan-heading">
                <h1 className="temuan-title">Solusi</h1>

                <div className="temuan-breadcrumb">
                    <span className="active">Progress</span>
                    <span>/</span>
                    <span>Solusi</span>
                </div>
            </div>

            <section className="temuan-board">
                <div className="temuan-board-header">
                    <div className="temuan-filter-grid solusi-filter-grid">
                        <ClientSelect
                            clients={clients}
                            selectedCode={clientCode}
                            isLoading={isLoadingClients}
                            errorMessage={clientErrorMessage}
                            onSearch={handleClientSearch}
                            onSelect={(client) => {
                                setClientCode(client.customer_code)
                                setCurrentPage(1)
                            }}
                        />

                        <select
                            className="form-select"
                            value={source}
                            onChange={(
                                event: ChangeEvent<HTMLSelectElement>,
                            ) => {
                                setSource(
                                    event.target.value as
                                        | SolusiSource
                                        | '',
                                )
                                setCurrentPage(1)
                            }}
                        >
                            <option value="">Semua source</option>
                            <option value="menu">Menu</option>
                            <option value="progress_report">
                                Progress Report
                            </option>
                        </select>

                        <button
                            type="button"
                            className="btn btn-light"
                            onClick={() => {
                                setClientCode('')
                                setSource('')
                                setSearchQuery('')
                                setCurrentPage(1)
                            }}
                        >
                            Reset
                        </button>
                    </div>

                    <div className="temuan-actions">
                        <div className="temuan-search">
                            <i className="bi bi-search" />
                            <input
                                type="text"
                                value={searchQuery}
                                placeholder="Cari solusi..."
                                onChange={(event) => {
                                    setSearchQuery(
                                        event.target.value,
                                    )
                                    setCurrentPage(1)
                                }}
                            />
                        </div>

                        <button
                            type="button"
                            className="temuan-add-button"
                            onClick={() => navigate('/solusi/tambah')}
                        >
                            <i className="bi bi-plus-lg" />
                            <span>Tambah</span>
                        </button>
                    </div>
                </div>

                {isLoading && (
                    <div className="temuan-loading">
                        <div className="spinner-border" />
                        <span>Memuat data...</span>
                    </div>
                )}

                {!isLoading &&
                    errorMessage !== null && (
                        <div className="temuan-error">
                            <div
                                className="alert alert-danger"
                                role="alert"
                            >
                                {errorMessage}
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() =>
                                    void fetchSolusis(filters)
                                }
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    filteredSolusis.length === 0 && (
                        <div className="temuan-empty">
                            <i className="bi bi-inbox" />
                            <span>Belum ada solusi.</span>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    filteredSolusis.length > 0 && (
                        <div className="table-responsive">
                            <table className="table temuan-table">
                                <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Temuan</th>
                                    <th>Tanggal</th>
                                    <th>Client</th>
                                    <th>SPK</th>
                                    <th>Pekerjaan</th>
                                    <th>Source</th>
                                    <th>Solusi</th>
                                    <th>File</th>
                                    <th className="text-center">
                                        Aksi
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {paginatedSolusis.map(
                                    (solusi, index) => (
                                        <tr
                                            key={solusi.id}
                                            className="temuan-clickable-row"
                                            onClick={() =>
                                                setSolusiToView(
                                                    solusi,
                                                )
                                            }
                                        >
                                            <td>
                                                {(currentPage - 1) *
                                                    ITEMS_PER_PAGE +
                                                    index +
                                                    1}
                                            </td>
                                            <td>
                                                <strong>
                                                    {solusi.temuan.nomor}
                                                </strong>
                                            </td>
                                            <td>
                                                {solusi.temuan.tanggal}
                                            </td>
                                            <td>
                                                {
                                                    solusi.temuan
                                                        .client_code
                                                }
                                            </td>
                                            <td>
                                                {solusi.temuan.spk
                                                    ?.no_spk ?? '-'}
                                            </td>
                                            <td>
                                                {solusi.temuan.job
                                                    ?.description ?? '-'}
                                            </td>
                                            <td>
                                                {
                                                    sourceLabels[
                                                        solusi.source
                                                    ]
                                                }
                                            </td>
                                            <td>
                                                <span className="temuan-note-preview">
                                                    {solusi.solution}
                                                </span>
                                            </td>
                                            <td>
                                                {(solusi.files ?? []).length}
                                            </td>
                                            <td>
                                                <div className="temuan-row-actions">
                                                    <button
                                                        type="button"
                                                        className="temuan-action-button"
                                                        title="Lihat"
                                                        onClick={(
                                                            event,
                                                        ) => {
                                                            event.stopPropagation()
                                                            setSolusiToView(
                                                                solusi,
                                                            )
                                                        }}
                                                    >
                                                        <i className="bi bi-eye" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="temuan-action-button edit"
                                                        title="Edit"
                                                        onClick={(
                                                            event,
                                                        ) => {
                                                            event.stopPropagation()
                                                            navigate(
                                                                `/solusi/${solusi.id}/edit`,
                                                            )
                                                        }}
                                                    >
                                                        <i className="bi bi-pencil-square" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    filteredSolusis.length > 0 && (
                        <div className="temuan-pagination">
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    setCurrentPage((previous) =>
                                        Math.max(
                                            1,
                                            previous - 1,
                                        ),
                                    )
                                }
                            >
                                <i className="bi bi-caret-left-fill" />
                            </button>
                            <span className="temuan-page-info">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={
                                    currentPage >= totalPages
                                }
                                onClick={() =>
                                    setCurrentPage((previous) =>
                                        Math.min(
                                            totalPages,
                                            previous + 1,
                                        ),
                                    )
                                }
                            >
                                <i className="bi bi-caret-right-fill" />
                            </button>
                        </div>
                    )}
            </section>

            <SolusiDetailModal
                solusi={solusiToView}
                onClose={() => setSolusiToView(null)}
            />
        </div>
    )
}

export default SolusiPage
