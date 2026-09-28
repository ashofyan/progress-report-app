import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    RepresentativeLetterListItem,
    RepresentativeLetterMeta,
} from '@/features/representative-letter/types/representative-letter.types'
import {
    monthOptions,
} from '@/features/representative-letter/utils/documentSettings'

import '@/features/representative-letter/styles/representative-letter.scss'

const defaultMeta: RepresentativeLetterMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
}

const RepresentativeLetterListPage = () => {
    const navigate = useNavigate()

    const [letters, setLetters] =
        useState<RepresentativeLetterListItem[]>([])
    const [meta, setMeta] =
        useState<RepresentativeLetterMeta>(defaultMeta)
    const [spkId, setSpkId] = useState<string>('')
    const [bulan, setBulan] = useState<string>('')
    const [tahun, setTahun] = useState<string>('')
    const [currentPage, setCurrentPage] =
        useState<number>(1)
    const [isLoading, setIsLoading] =
        useState<boolean>(false)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const filters = useMemo(
        () => ({
            als_spk_id:
                spkId.trim() === ''
                    ? undefined
                    : Number(spkId),
            bulan:
                bulan === '' ? undefined : Number(bulan),
            tahun:
                tahun.trim() === ''
                    ? undefined
                    : Number(tahun),
            page: currentPage,
            per_page: 20,
        }),
        [
            bulan,
            currentPage,
            spkId,
            tahun,
        ],
    )

    const fetchLetters = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setErrorMessage(null)

        const result =
            await representativeLetterApi.getAll(filters)

        if (
            result.success &&
            result.data !== undefined
        ) {
            setLetters(result.data)
            setMeta(result.meta ?? defaultMeta)
            setIsLoading(false)
            return
        }

        setLetters([])
        setMeta(defaultMeta)
        setErrorMessage(result.message)
        setIsLoading(false)
    }, [filters])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchLetters()
        }, 250)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [fetchLetters])

    const resetPage = (): void => {
        setCurrentPage(1)
    }

    return (
        <div className="representative-letter-page-shell">
            <div className="representative-letter-heading">
                <h1 className="representative-letter-title">
                    Representative Letter
                </h1>

                <div className="representative-letter-breadcrumb">
                    <span className="active">Progress</span>
                    <span>/</span>
                    <span>Representative Letter</span>
                </div>
            </div>

            <section className="representative-letter-board">
                <div className="representative-letter-board-header">
                    <div className="representative-letter-filter-grid">
                        <label className="form-label">
                            SPK ID
                            <input
                                type="number"
                                min="1"
                                className="form-control"
                                value={spkId}
                                onChange={(
                                    event: ChangeEvent<HTMLInputElement>,
                                ) => {
                                    setSpkId(event.target.value)
                                    resetPage()
                                }}
                            />
                        </label>

                        <label className="form-label">
                            Bulan
                            <select
                                className="form-select"
                                value={bulan}
                                onChange={(
                                    event: ChangeEvent<HTMLSelectElement>,
                                ) => {
                                    setBulan(event.target.value)
                                    resetPage()
                                }}
                            >
                                <option value="">Semua</option>
                                {monthOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="form-label">
                            Tahun
                            <input
                                type="number"
                                className="form-control"
                                value={tahun}
                                onChange={(
                                    event: ChangeEvent<HTMLInputElement>,
                                ) => {
                                    setTahun(event.target.value)
                                    resetPage()
                                }}
                            />
                        </label>
                    </div>

                    <div className="representative-letter-actions">
                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={() =>
                                navigate(
                                    '/representative-letter/header',
                                )
                            }
                        >
                            <i className="bi bi-image me-1" />
                            Kelola Kop Surat
                        </button>

                        <button
                            type="button"
                            className="representative-letter-add-button"
                            onClick={() =>
                                navigate(
                                    '/representative-letter/create',
                                )
                            }
                        >
                            <i className="bi bi-plus-lg" />
                            <span>Buat Representative Letter</span>
                        </button>
                    </div>
                </div>

                {isLoading && (
                    <div className="representative-letter-state">
                        <div className="spinner-border" />
                        <span>Memuat data...</span>
                    </div>
                )}

                {!isLoading &&
                    errorMessage !== null && (
                        <div className="representative-letter-error">
                            <div className="alert alert-danger">
                                {errorMessage}
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => void fetchLetters()}
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    letters.length === 0 && (
                        <div className="representative-letter-state">
                            <i className="bi bi-inbox" />
                            <span>
                                Belum ada Representative Letter.
                            </span>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    letters.length > 0 && (
                        <div className="table-responsive">
                            <table className="table representative-letter-table">
                                <thead>
                                <tr>
                                    <th>Nomor RL</th>
                                    <th>No SPK</th>
                                    <th>Client</th>
                                    <th>Pekerjaan</th>
                                    <th>Periode</th>
                                    <th>Total Detail</th>
                                    <th>Dibuat Oleh</th>
                                    <th>Tanggal Dibuat</th>
                                    <th className="text-center">
                                        Action
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {letters.map((letter) => (
                                    <tr key={letter.id}>
                                        <td>
                                            <strong>
                                                {letter.nomor}
                                            </strong>
                                        </td>
                                        <td>
                                            {letter.spk.no_spk}
                                        </td>
                                        <td>
                                            {
                                                letter.spk
                                                    .client_code
                                            }
                                        </td>
                                        <td>
                                            {
                                                letter.job
                                                    .description
                                            }
                                        </td>
                                        <td>
                                            {
                                                letter.periode
                                                    .label
                                            }
                                        </td>
                                        <td>
                                            {letter.total_detail}
                                        </td>
                                        <td>
                                            {letter.created_by}
                                        </td>
                                        <td>
                                            {letter.created_at ?? '-'}
                                        </td>
                                        <td>
                                            <div className="representative-letter-row-actions">
                                                <button
                                                    type="button"
                                                    className="representative-letter-action-button"
                                                    title="Buka / Edit"
                                                    onClick={() =>
                                                        navigate(
                                                            `/representative-letter/${letter.id}`,
                                                        )
                                                    }
                                                >
                                                    <i className="bi bi-pencil-square" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                {!isLoading &&
                    errorMessage === null &&
                    letters.length > 0 && (
                        <div className="representative-letter-pagination">
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
                            <span className="representative-letter-page-info">
                                {meta.current_page} /{' '}
                                {meta.last_page}
                            </span>
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={
                                    currentPage >= meta.last_page
                                }
                                onClick={() =>
                                    setCurrentPage((previous) =>
                                        Math.min(
                                            meta.last_page,
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
        </div>
    )
}

export default RepresentativeLetterListPage
