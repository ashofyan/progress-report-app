import {
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'

import type {
    DailyProgress,
} from '@/features/daily-progress/types/daily-progress.types'

interface DailyProgressSelectProps {
    progresses: DailyProgress[]
    selectedId: number | ''
    isLoading: boolean
    errorMessage: string | null
    onSelect: (progress: DailyProgress) => void
}

const DailyProgressSelect = ({
                                 progresses,
                                 selectedId,
                                 isLoading,
                                 errorMessage,
                                 onSelect,
                             }: DailyProgressSelectProps) => {
    const [isOpen, setIsOpen] =
        useState<boolean>(false)

    const [searchQuery, setSearchQuery] =
        useState<string>('')

    const selectedProgress = useMemo(
        () =>
            selectedId === ''
                ? null
                : progresses.find(
                    (progress) =>
                        progress.id === selectedId,
                ) ?? null,
        [
            progresses,
            selectedId,
        ],
    )

    const filteredProgresses = useMemo(() => {
        const query =
            searchQuery.trim().toLowerCase()

        if (query === '') {
            return progresses
        }

        return progresses.filter((progress) => {
            return (
                progress.nomor
                    .toLowerCase()
                    .includes(query) ||
                progress.client_code
                    .toLowerCase()
                    .includes(query) ||
                progress.tanggal.includes(query)
            )
        })
    }, [
        progresses,
        searchQuery,
    ])

    const handleSearchChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        setSearchQuery(event.target.value)
    }

    const handleSelect = (
        progress: DailyProgress,
    ): void => {
        onSelect(progress)
        setSearchQuery('')
        setIsOpen(false)
    }

    return (
        <div className="daily-progress-select">
            <button
                type="button"
                className={`daily-progress-select-trigger ${
                    isOpen ? 'active' : ''
                } ${
                    selectedId !== '' ? 'selected' : ''
                }`}
                onClick={() =>
                    setIsOpen((previous) => !previous)
                }
            >
                <span
                    className={
                        selectedProgress === null
                            ? 'placeholder'
                            : ''
                    }
                >
                    {selectedProgress === null
                        ? 'Pilih Nomor Daily Progress'
                        : `${selectedProgress.nomor} - ${selectedProgress.tanggal} (${selectedProgress.client_code})`}
                </span>

                <i
                    className={`bi ${
                        isOpen
                            ? 'bi-chevron-up'
                            : 'bi-chevron-down'
                    }`}
                />
            </button>

            {isOpen && (
                <div className="daily-progress-select-dropdown">
                    <div className="daily-progress-select-search">
                        <i className="bi bi-search" />

                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Search..."
                            autoFocus
                            onChange={handleSearchChange}
                        />
                    </div>

                    <div className="daily-progress-select-options">
                        {isLoading && (
                            <div className="daily-progress-select-state">
                                <span className="spinner-border spinner-border-sm" />
                                Memuat data...
                            </div>
                        )}

                        {!isLoading &&
                            errorMessage !== null && (
                                <div className="daily-progress-select-state error">
                                    {errorMessage}
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null &&
                            filteredProgresses.length === 0 && (
                                <div className="daily-progress-select-state">
                                    Data tidak ditemukan.
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null &&
                            filteredProgresses.map(
                                (progress) => (
                                    <button
                                        key={progress.id}
                                        type="button"
                                        className={`daily-progress-select-option ${
                                            selectedId ===
                                            progress.id
                                                ? 'selected'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            handleSelect(
                                                progress,
                                            )
                                        }
                                    >
                                        <span>
                                            {progress.nomor}
                                        </span>

                                        <span className="daily-progress-select-code">
                                            {progress.tanggal} /{' '}
                                            {
                                                progress.client_code
                                            }
                                        </span>
                                    </button>
                                ),
                            )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default DailyProgressSelect
