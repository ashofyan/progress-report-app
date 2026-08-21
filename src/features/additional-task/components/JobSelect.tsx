import {
    useMemo,
    useState,
    type ChangeEvent,
} from 'react'

import type {
    MasterJob,
} from '@/features/master-job/types/master-job.types'

interface JobSelectProps {
    jobs: MasterJob[]
    selectedId: number | string | ''
    isLoading: boolean
    errorMessage: string | null
    disabled?: boolean
    onSelect: (job: MasterJob) => void
}

const JobSelect = ({
                       jobs,
                       selectedId,
                       isLoading,
                       errorMessage,
                       disabled = false,
                       onSelect,
                   }: JobSelectProps) => {
    const [isOpen, setIsOpen] =
        useState<boolean>(false)

    const [searchQuery, setSearchQuery] =
        useState<string>('')

    const selectedJob = useMemo(
        () =>
            selectedId === ''
                ? null
                : jobs.find(
                    (job) =>
                        String(job.id) ===
                        String(selectedId),
                ) ?? null,
        [
            jobs,
            selectedId,
        ],
    )

    const filteredJobs = useMemo(() => {
        const query =
            searchQuery.trim().toLowerCase()

        if (query === '') {
            return jobs
        }

        return jobs.filter((job) => {
            return (
                job.job_code
                    .toLowerCase()
                    .includes(query) ||
                job.description
                    .toLowerCase()
                    .includes(query)
            )
        })
    }, [
        jobs,
        searchQuery,
    ])

    const handleSearchChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        setSearchQuery(event.target.value)
    }

    const handleToggle = (): void => {
        if (disabled) {
            return
        }

        setIsOpen((previous) => !previous)
    }

    const handleSelect = (
        job: MasterJob,
    ): void => {
        onSelect(job)
        setSearchQuery('')
        setIsOpen(false)
    }

    return (
        <div className="job-select">
            <button
                type="button"
                className={`job-select-trigger ${
                    isOpen ? 'active' : ''
                } ${selectedId !== '' ? 'selected' : ''}`}
                disabled={disabled}
                onClick={handleToggle}
            >
               <span
                   className={
                       selectedJob === null &&
                       selectedId === ''
                           ? 'placeholder'
                           : 'selected-value'
                   }
               >
                    {selectedJob === null
                        ? selectedId === ''
                            ? 'Pilih Pekerjaan'
                            : `Pekerjaan ID ${selectedId}`
                        : `${selectedJob.description} (${selectedJob.job_code})`}
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
                <div className="job-select-dropdown">
                    <div className="job-select-search">
                        <i className="bi bi-search" />

                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Search..."
                            autoFocus
                            onChange={handleSearchChange}
                        />
                    </div>

                    <div className="job-select-options">
                        {isLoading && (
                            <div className="job-select-state">
                                <span className="spinner-border spinner-border-sm" />
                                Memuat data...
                            </div>
                        )}

                        {!isLoading &&
                            errorMessage !== null && (
                                <div className="job-select-state error">
                                    {errorMessage}
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null &&
                            filteredJobs.length === 0 && (
                                <div className="job-select-state">
                                    Data tidak ditemukan.
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null &&
                            filteredJobs.map((job) => (
                                <button
                                    key={job.id}
                                    type="button"
                                    className={`job-select-option ${
                                        String(selectedId) ===
                                        String(job.id)
                                            ? 'selected'
                                            : ''
                                    }`}
                                    onClick={() =>
                                        handleSelect(job)
                                    }
                                >
                                    <span>
                                        {job.description}
                                    </span>

                                    <span className="job-select-code">
                                        ({job.job_code})
                                    </span>
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default JobSelect
