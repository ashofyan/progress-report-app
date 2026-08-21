import {
    useMemo,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import AdditionalTaskDeleteModal from '@/features/additional-task/components/AdditionalTaskDeleteModal'
import AdditionalTaskFormModal from '@/features/additional-task/components/AdditionalTaskFormModal'
import AdditionalTaskTable from '@/features/additional-task/components/AdditionalTaskTable'

import { useAdditionalTasks } from '@/features/additional-task/hooks/useAdditionalTasks'

import type {
    AdditionalTask,
} from '@/features/additional-task/types/additional-task.types'

const ITEMS_PER_PAGE = 10

const AdditionalTaskBoard = () => {
    const navigate = useNavigate()

    const {
        tasks,
        isLoading,
        errorMessage,
        fetchTasks,
        createTask,
        updateTask,
        deleteTask,
    } = useAdditionalTasks()

    const [searchQuery, setSearchQuery] =
        useState<string>('')

    const [currentPage, setCurrentPage] =
        useState<number>(1)

    const [isFormOpen, setIsFormOpen] =
        useState<boolean>(false)

    const [selectedTask, setSelectedTask] =
        useState<AdditionalTask | null>(null)

    const [taskToDelete, setTaskToDelete] =
        useState<AdditionalTask | null>(null)

    const filteredTasks = useMemo(() => {
        const query =
            searchQuery.trim().toLowerCase()

        if (query === '') {
            return tasks
        }

        return tasks.filter((task) => {
            return (
                task.nomor
                    .toLowerCase()
                    .includes(query) ||
                task.client_code
                    .toLowerCase()
                    .includes(query) ||
                task.job.job_code
                    .toLowerCase()
                    .includes(query) ||
                task.job.description
                    .toLowerCase()
                    .includes(query)
            )
        })
    }, [tasks, searchQuery])

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredTasks.length /
            ITEMS_PER_PAGE,
        ),
    )

    const paginatedTasks = useMemo(() => {
        const start =
            (currentPage - 1) *
            ITEMS_PER_PAGE

        const end =
            start + ITEMS_PER_PAGE

        return filteredTasks.slice(
            start,
            end,
        )
    }, [
        filteredTasks,
        currentPage,
    ])

    const handleAdd = (): void => {
        navigate('/master-data/task/tambah')
    }

    const handleEdit = (
        task: AdditionalTask,
    ): void => {
        setSelectedTask(task)
        setIsFormOpen(true)
    }

    const handleCloseForm = (): void => {
        setSelectedTask(null)
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
            <section className="additional-task-board">
                <div className="additional-task-board-header">
                    <div className="additional-task-search">
                        <i className="bi bi-search" />

                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Cari task..."
                            onChange={(event) =>
                                handleSearchChange(
                                    event.target.value,
                                )
                            }
                        />
                    </div>

                    <button
                        type="button"
                        className="additional-task-add-button"
                        onClick={handleAdd}
                    >
                        <i className="bi bi-plus-lg" />

                        <span>Tambah</span>
                    </button>
                </div>

                <div className="additional-task-board-content">
                    {isLoading && (
                        <div className="additional-task-loading">
                            <div
                                className="spinner-border"
                                role="status"
                            />

                            <span>Memuat data...</span>
                        </div>
                    )}

                    {!isLoading &&
                        errorMessage !== null && (
                            <div className="additional-task-error">
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
                                        void fetchTasks()
                                    }
                                >
                                    Coba Lagi
                                </button>
                            </div>
                        )}

                    {!isLoading &&
                        errorMessage === null && (
                            <AdditionalTaskTable
                                tasks={paginatedTasks}
                                onEdit={handleEdit}
                                onDelete={
                                    setTaskToDelete
                                }
                            />
                        )}
                </div>

                {!isLoading &&
                    errorMessage === null &&
                    filteredTasks.length > 0 && (
                        <div className="additional-task-pagination">
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

                            <span className="additional-task-page-info">
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

            <AdditionalTaskFormModal
                isOpen={isFormOpen}
                task={selectedTask}
                onClose={handleCloseForm}
                onCreate={createTask}
                onUpdate={updateTask}
            />

            <AdditionalTaskDeleteModal
                task={taskToDelete}
                onClose={() =>
                    setTaskToDelete(null)
                }
                onDelete={deleteTask}
            />
        </>
    )
}

export default AdditionalTaskBoard
