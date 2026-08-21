import {
    useMemo,
    useState,
} from 'react'

import MasterJobDeleteModal from '@/features/master-job/components/MasterJobDeleteModal'
import MasterJobFormModal from '@/features/master-job/components/MasterJobFormModal'
import MasterJobTable from '@/features/master-job/components/MasterJobTable'

import { useMasterJobs } from '@/features/master-job/hooks/useMasterJobs'

import type {
    MasterJob,
} from '@/features/master-job/types/master-job.types'

const ITEMS_PER_PAGE = 10

const MasterJobBoard = () => {
    const {
        jobs,
        isLoading,
        errorMessage,
        createJob,
        updateJob,
        deleteJob,
        fetchJobs,
    } = useMasterJobs()

    const [searchQuery, setSearchQuery] =
        useState<string>('')

    const [currentPage, setCurrentPage] =
        useState<number>(1)

    const [isFormOpen, setIsFormOpen] =
        useState<boolean>(false)

    const [selectedJob, setSelectedJob] =
        useState<MasterJob | null>(null)

    const [jobToDelete, setJobToDelete] =
        useState<MasterJob | null>(null)

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
    }, [jobs, searchQuery])

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredJobs.length /
            ITEMS_PER_PAGE,
        ),
    )

    const paginatedJobs = useMemo(() => {
        const start =
            (currentPage - 1) *
            ITEMS_PER_PAGE

        const end =
            start + ITEMS_PER_PAGE

        return filteredJobs.slice(
            start,
            end,
        )
    }, [
        filteredJobs,
        currentPage,
    ])

    const handleAdd = (): void => {
        setSelectedJob(null)
        setIsFormOpen(true)
    }

    const handleEdit = (
        job: MasterJob,
    ): void => {
        setSelectedJob(job)
        setIsFormOpen(true)
    }

    const handleCloseForm = (): void => {
        setSelectedJob(null)
        setIsFormOpen(false)
    }

    const handleSearchChange = (
        value: string,
    ): void => {
        setSearchQuery(value)
        setCurrentPage(1)
    }

    const handlePreviousPage = (): void => {
        setCurrentPage((previous) =>
            Math.max(1, previous - 1),
        )
    }

    const handleNextPage = (): void => {
        setCurrentPage((previous) =>
            Math.min(
                totalPages,
                previous + 1,
            ),
        )
    }

    return (
        <>
            <section className="master-job-board">
                <div className="master-job-board-header">
                    <div className="master-job-search">
                        <i className="bi bi-search" />

                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Cari pekerjaan..."
                            onChange={(event) =>
                                handleSearchChange(
                                    event.target.value,
                                )
                            }
                        />
                    </div>

                    <button
                        type="button"
                        className="master-job-add-button"
                        onClick={handleAdd}
                    >
                        <i className="bi bi-plus-lg" />

                        <span>Tambah</span>
                    </button>
                </div>

                <div className="master-job-board-content">
                    {isLoading && (
                        <div className="master-job-loading">
                            <div
                                className="spinner-border"
                                role="status"
                            />

                            <span>
                Memuat data...
              </span>
                        </div>
                    )}

                    {!isLoading &&
                        errorMessage !== null && (
                            <div className="master-job-error">
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
                                        void fetchJobs()
                                    }
                                >
                                    Coba Lagi
                                </button>
                            </div>
                        )}

                    {!isLoading &&
                        errorMessage === null && (
                            <MasterJobTable
                                jobs={paginatedJobs}
                                onEdit={handleEdit}
                                onDelete={
                                    setJobToDelete
                                }
                            />
                        )}
                </div>

                {!isLoading &&
                    errorMessage === null &&
                    filteredJobs.length > 0 && (
                        <div className="master-job-pagination">
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={
                                    currentPage === 1
                                }
                                onClick={
                                    handlePreviousPage
                                }
                            >
                                <i className="bi bi-caret-left-fill" />
                            </button>

                            <span className="master-job-page-info">
                {currentPage} / {totalPages}
              </span>

                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={
                                    currentPage ===
                                    totalPages
                                }
                                onClick={handleNextPage}
                            >
                                <i className="bi bi-caret-right-fill" />
                            </button>
                        </div>
                    )}
            </section>

            <MasterJobFormModal
                isOpen={isFormOpen}
                job={selectedJob}
                onClose={handleCloseForm}
                onCreate={createJob}
                onUpdate={updateJob}
            />

            <MasterJobDeleteModal
                job={jobToDelete}
                onClose={() =>
                    setJobToDelete(null)
                }
                onDelete={deleteJob}
            />
        </>
    )
}

export default MasterJobBoard
