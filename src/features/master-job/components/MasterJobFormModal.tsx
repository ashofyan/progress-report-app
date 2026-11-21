import {
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'

import type {
    CreateMasterJobRequest,
    MasterJob,
    MasterJobApiResult,
    UpdateMasterJobRequest,
} from '@/features/master-job/types/master-job.types'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useServiceProducts } from '@/features/master-job/hooks/useServiceProducts'

import ServiceSelect from '@/features/master-job/components/ServiceSelect'

interface MasterJobFormModalProps {
    isOpen: boolean
    job: MasterJob | null

    onClose: () => void

    onCreate: (
        payload: CreateMasterJobRequest,
    ) => Promise<MasterJobApiResult<MasterJob>>

    onUpdate: (
        id: number,
        payload: UpdateMasterJobRequest,
    ) => Promise<MasterJobApiResult<MasterJob>>
}

interface FormSubTask {
    uid: string
    id?: number
    task_name: string
}

interface FormTask {
    uid: string
    id?: number
    task_name: string
    children: FormSubTask[]
}

interface MasterJobFormData {
    job_code: string
    description: string
    tasks: FormTask[]
}

let uidSequence = 0
const generateUid = (prefix = 'item'): string =>
    `${prefix}-${Date.now()}-${++uidSequence}-${Math.random().toString(36).substring(2, 7)}`

const createInitialForm = (): MasterJobFormData => ({
    job_code: '',
    description: '',
    tasks: [],
})

const MasterJobFormModal = ({
                                isOpen,
                                job,
                                onClose,
                                onCreate,
                                onUpdate,
                            }: MasterJobFormModalProps) => {
    const [formData, setFormData] =
        useState<MasterJobFormData>(
            createInitialForm(),
        )

    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)

    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    // Drag and drop states for sub-tasks
    const [draggedSubTask, setDraggedSubTask] = useState<{
        taskIndex: number
        childIndex: number
    } | null>(null)

    const [draggableSubTaskId, setDraggableSubTaskId] =
        useState<string | null>(null)

    const [dropTarget, setDropTarget] = useState<{
        taskIndex: number
        childIndex?: number
        position: 'top' | 'bottom' | 'card'
    } | null>(null)

    // Quick move-to-task menu state
    const [activeMoveMenu, setActiveMoveMenu] = useState<{
        taskIndex: number
        childIndex: number
    } | null>(null)

    const { employee } = useAuth()

    const {
        services,
        isLoading: isLoadingServices,
        errorMessage: serviceErrorMessage,
    } = useServiceProducts(
        employee?.asal_pt ?? null,
    )

    useEffect(() => {
        if (!isOpen) {
            return
        }

        setErrorMessage(null)
        setDraggedSubTask(null)
        setDropTarget(null)
        setDraggableSubTaskId(null)
        setActiveMoveMenu(null)

        if (job === null) {
            setFormData(createInitialForm())

            return
        }

        setFormData({
            job_code: job.job_code,
            description: job.description,

            tasks: job.tasks.map((task) => ({
                uid: generateUid('task'),
                id: task.id,
                task_name: task.task_name,

                children: task.children.map(
                    (child) => ({
                        uid: generateUid('subtask'),
                        id: child.id,
                        task_name: child.task_name,
                    }),
                ),
            })),
        })
    }, [isOpen, job])

    useEffect(() => {
        if (!activeMoveMenu) {
            return
        }

        const handleClickOutside = (event: MouseEvent): void => {
            const target = event.target as HTMLElement | null
            if (target && !target.closest('.master-job-move-menu-container')) {
                setActiveMoveMenu(null)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [activeMoveMenu])

    if (!isOpen) {
        return null
    }

    const handleFieldChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        const { name, value } = event.target

        if (name === 'job_code') {
            setFormData((previous) => ({
                ...previous,
                job_code: value,
            }))

            return
        }

        if (name === 'description') {
            setFormData((previous) => ({
                ...previous,
                description: value,
            }))
        }
    }

    const handleAddTask = (): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: [
                ...previous.tasks,
                {
                    uid: generateUid('task'),
                    task_name: '',
                    children: [],
                },
            ],
        }))
    }

    const handleTaskChange = (
        taskIndex: number,
        value: string,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.map(
                (task, index) =>
                    index === taskIndex
                        ? {
                            ...task,
                            task_name: value,
                        }
                        : task,
            ),
        }))
    }

    const handleRemoveTask = (
        taskIndex: number,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.filter(
                (_, index) => index !== taskIndex,
            ),
        }))
    }

    const handleAddSubTask = (
        taskIndex: number,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.map(
                (task, index) =>
                    index === taskIndex
                        ? {
                            ...task,

                            children: [
                                ...task.children,
                                {
                                    uid: generateUid('subtask'),
                                    task_name: '',
                                },
                            ],
                        }
                        : task,
            ),
        }))
    }

    const handleSubTaskChange = (
        taskIndex: number,
        childIndex: number,
        value: string,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.map(
                (task, currentTaskIndex) => {
                    if (
                        currentTaskIndex !== taskIndex
                    ) {
                        return task
                    }

                    return {
                        ...task,

                        children: task.children.map(
                            (child, currentChildIndex) =>
                                currentChildIndex === childIndex
                                    ? {
                                        ...child,
                                        task_name: value,
                                    }
                                    : child,
                        ),
                    }
                },
            ),
        }))
    }

    const handleRemoveSubTask = (
        taskIndex: number,
        childIndex: number,
    ): void => {
        setFormData((previous) => ({
            ...previous,

            tasks: previous.tasks.map(
                (task, currentTaskIndex) => {
                    if (
                        currentTaskIndex !== taskIndex
                    ) {
                        return task
                    }

                    return {
                        ...task,

                        children: task.children.filter(
                            (_, currentChildIndex) =>
                                currentChildIndex !== childIndex,
                        ),
                    }
                },
            ),
        }))
    }

    const handleMoveSubTask = (
        fromTaskIndex: number,
        fromChildIndex: number,
        toTaskIndex: number,
        toChildIndex?: number,
        insertPosition: 'top' | 'bottom' | 'append' = 'append',
    ): void => {
        setFormData((previous) => {
            const newTasks = previous.tasks.map((task) => ({
                ...task,
                children: [...task.children],
            }))

            const sourceTask = newTasks[fromTaskIndex]
            const targetTask = newTasks[toTaskIndex]
            if (!sourceTask || !targetTask) {
                return previous
            }

            const [movedItem] = sourceTask.children.splice(fromChildIndex, 1)
            if (!movedItem) {
                return previous
            }

            if (fromTaskIndex === toTaskIndex) {
                if (toChildIndex !== undefined && insertPosition !== 'append') {
                    const targetUid =
                        previous.tasks[fromTaskIndex].children[toChildIndex]?.uid
                    const currentTargetIndex = sourceTask.children.findIndex(
                        (c) => c.uid === targetUid,
                    )

                    if (currentTargetIndex !== -1) {
                        const insertIdx =
                            insertPosition === 'top'
                                ? currentTargetIndex
                                : currentTargetIndex + 1
                        sourceTask.children.splice(insertIdx, 0, movedItem)
                    } else {
                        sourceTask.children.push(movedItem)
                    }
                } else {
                    sourceTask.children.push(movedItem)
                }
            } else {
                if (toChildIndex !== undefined && insertPosition !== 'append') {
                    const insertIdx =
                        insertPosition === 'top'
                            ? toChildIndex
                            : toChildIndex + 1
                    targetTask.children.splice(insertIdx, 0, movedItem)
                } else {
                    targetTask.children.push(movedItem)
                }
            }

            return {
                ...previous,
                tasks: newTasks,
            }
        })
    }

    const handleMoveSubTaskStep = (
        taskIndex: number,
        childIndex: number,
        direction: 'up' | 'down',
    ): void => {
        setFormData((previous) => {
            const newTasks = previous.tasks.map((task, tIndex) => {
                if (tIndex !== taskIndex) {
                    return task
                }

                const newChildren = [...task.children]
                const targetIndex =
                    direction === 'up' ? childIndex - 1 : childIndex + 1

                if (targetIndex < 0 || targetIndex >= newChildren.length) {
                    return task
                }

                const temp = newChildren[childIndex]
                newChildren[childIndex] = newChildren[targetIndex]
                newChildren[targetIndex] = temp

                return {
                    ...task,
                    children: newChildren,
                }
            })

            return {
                ...previous,
                tasks: newTasks,
            }
        })
    }

    const handleMoveTaskStep = (
        taskIndex: number,
        direction: 'up' | 'down',
    ): void => {
        setFormData((previous) => {
            const targetIndex =
                direction === 'up' ? taskIndex - 1 : taskIndex + 1

            if (targetIndex < 0 || targetIndex >= previous.tasks.length) {
                return previous
            }

            const newTasks = [...previous.tasks]
            const temp = newTasks[taskIndex]
            newTasks[taskIndex] = newTasks[targetIndex]
            newTasks[targetIndex] = temp

            return {
                ...previous,
                tasks: newTasks,
            }
        })
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()

        setErrorMessage(null)

        if (formData.job_code.trim() === '') {
            setErrorMessage(
                'Kode pekerjaan wajib diisi.',
            )

            return
        }

        if (formData.description.trim() === '') {
            setErrorMessage(
                'Deskripsi pekerjaan wajib diisi.',
            )

            return
        }

        const hasInvalidTask =
            formData.tasks.some(
                (task) =>
                    task.task_name.trim() === '' ||
                    task.children.some(
                        (child) =>
                            child.task_name.trim() === '',
                    ),
            )

        if (hasInvalidTask) {
            setErrorMessage(
                'Task dan sub task tidak boleh kosong.',
            )

            return
        }

        setIsSubmitting(true)

        const payload: CreateMasterJobRequest = {
            job_code: formData.job_code.trim(),
            description:
                formData.description.trim(),

            tasks: formData.tasks.map(
                (task) => ({
                    ...(task.id !== undefined ? { id: task.id } : {}),
                    task_name: task.task_name.trim(),

                    children: task.children.map(
                        (child) => ({
                            ...(child.id !== undefined ? { id: child.id } : {}),
                            task_name:
                                child.task_name.trim(),
                        }),
                    ),
                }),
            ),
        }

        const result =
            job === null
                ? await onCreate(payload)
                : await onUpdate(
                    job.id,
                    payload,
                )

        setIsSubmitting(false)

        if (!result.success) {
            setErrorMessage(result.message)

            return
        }

        onClose()
    }

    return (
        <div className="master-job-modal-backdrop">
            <div className="master-job-modal">
                <div className="master-job-modal-header">
                    <h2>
                        {job === null
                            ? 'Tambah Pekerjaan'
                            : 'Edit Pekerjaan'}
                    </h2>

                    <button
                        type="button"
                        className="master-job-modal-close"
                        onClick={onClose}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="master-job-modal-body">
                        {errorMessage !== null && (
                            <div
                                className="alert alert-danger"
                                role="alert"
                            >
                                {errorMessage}
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="form-label">
                                Nama Jasa
                            </label>

                            <ServiceSelect
                                services={services}
                                selectedCode={formData.job_code}
                                isLoading={isLoadingServices}
                                errorMessage={serviceErrorMessage}
                                onSelect={(service) => {
                                    setFormData((previous) => ({
                                        ...previous,
                                        job_code: service.product_code,
                                    }))
                                }}
                            />
                        </div>

                        <div className="mb-4">
                            <label
                                htmlFor="description"
                                className="form-label"
                            >
                                Deskripsi
                            </label>

                            <input
                                id="description"
                                name="description"
                                type="text"
                                value={formData.description}
                                className="form-control"
                                maxLength={256}
                                onChange={handleFieldChange}
                            />
                        </div>

                        <div className="master-job-task-section">
                            <div className="master-job-task-heading">
                                <h3>Task</h3>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={handleAddTask}
                                >
                                    <i className="bi bi-plus-lg me-1" />

                                    Tambah Task
                                </button>
                            </div>

                            {formData.tasks.length === 0 && (
                                <div className="master-job-task-empty">
                                    Belum ada task.
                                </div>
                            )}

                            {formData.tasks.map(
                                (task, taskIndex) => {
                                    const isTargetTaskCard =
                                        dropTarget?.taskIndex === taskIndex &&
                                        dropTarget?.position === 'card'

                                    return (
                                        <div
                                            className={`master-job-task-card ${
                                                isTargetTaskCard
                                                    ? 'drop-target-task-card'
                                                    : ''
                                            }`}
                                            key={task.uid}
                                            onDragOver={(event) => {
                                                if (!draggedSubTask) {
                                                    return
                                                }
                                                if (
                                                    draggedSubTask.taskIndex !==
                                                    taskIndex
                                                ) {
                                                    event.preventDefault()
                                                    setDropTarget({
                                                        taskIndex,
                                                        position: 'card',
                                                    })
                                                }
                                            }}
                                            onDragLeave={(event) => {
                                                if (
                                                    !event.currentTarget.contains(
                                                        event.relatedTarget as Node,
                                                    )
                                                ) {
                                                    if (
                                                        dropTarget?.taskIndex ===
                                                            taskIndex &&
                                                        dropTarget?.position ===
                                                            'card'
                                                    ) {
                                                        setDropTarget(null)
                                                    }
                                                }
                                            }}
                                            onDrop={(event) => {
                                                if (!draggedSubTask) {
                                                    return
                                                }
                                                if (
                                                    draggedSubTask.taskIndex !==
                                                    taskIndex
                                                ) {
                                                    event.preventDefault()
                                                    event.stopPropagation()
                                                    handleMoveSubTask(
                                                        draggedSubTask.taskIndex,
                                                        draggedSubTask.childIndex,
                                                        taskIndex,
                                                        undefined,
                                                        'append',
                                                    )
                                                    setDraggedSubTask(null)
                                                    setDropTarget(null)
                                                    setDraggableSubTaskId(null)
                                                }
                                            }}
                                        >
                                            <div className="master-job-task-row">
                                                <span className="master-job-task-badge">
                                                    Task {taskIndex + 1}
                                                </span>

                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={task.task_name}
                                                    maxLength={256}
                                                    placeholder="Nama task"
                                                    onChange={(event) =>
                                                        handleTaskChange(
                                                            taskIndex,
                                                            event.target.value,
                                                        )
                                                    }
                                                />

                                                <div className="master-job-task-actions">
                                                    <button
                                                        type="button"
                                                        className="master-job-subtask-btn"
                                                        disabled={
                                                            taskIndex === 0
                                                        }
                                                        title="Geser task ke atas"
                                                        onClick={() =>
                                                            handleMoveTaskStep(
                                                                taskIndex,
                                                                'up',
                                                            )
                                                        }
                                                    >
                                                        <i className="bi bi-arrow-up" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="master-job-subtask-btn"
                                                        disabled={
                                                            taskIndex ===
                                                            formData.tasks
                                                                .length -
                                                                1
                                                        }
                                                        title="Geser task ke bawah"
                                                        onClick={() =>
                                                            handleMoveTaskStep(
                                                                taskIndex,
                                                                'down',
                                                            )
                                                        }
                                                    >
                                                        <i className="bi bi-arrow-down" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm"
                                                        title="Hapus task"
                                                        onClick={() =>
                                                            handleRemoveTask(
                                                                taskIndex,
                                                            )
                                                        }
                                                    >
                                                        <i className="bi bi-trash3" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="master-job-subtasks">
                                                {task.children.length ===
                                                    0 && (
                                                    <div
                                                        className={`master-job-subtask-empty-dropzone ${
                                                            isTargetTaskCard
                                                                ? 'active'
                                                                : ''
                                                        }`}
                                                    >
                                                        <i className="bi bi-box-arrow-in-down" />
                                                        Tarik sub-task ke sini
                                                        atau klik Tambah Sub
                                                        Task
                                                    </div>
                                                )}

                                                {task.children.map(
                                                    (child, childIndex) => {
                                                        const isDraggingCurrent =
                                                            draggedSubTask?.taskIndex ===
                                                                taskIndex &&
                                                            draggedSubTask?.childIndex ===
                                                                childIndex

                                                        const isTargetTop =
                                                            dropTarget?.taskIndex ===
                                                                taskIndex &&
                                                            dropTarget?.childIndex ===
                                                                childIndex &&
                                                            dropTarget?.position ===
                                                                'top'

                                                        const isTargetBottom =
                                                            dropTarget?.taskIndex ===
                                                                taskIndex &&
                                                            dropTarget?.childIndex ===
                                                                childIndex &&
                                                            dropTarget?.position ===
                                                                'bottom'

                                                        const isMoveMenuOpen =
                                                            activeMoveMenu?.taskIndex ===
                                                                taskIndex &&
                                                            activeMoveMenu?.childIndex ===
                                                                childIndex

                                                        return (
                                                            <div
                                                                className={`master-job-subtask-row ${
                                                                    isDraggingCurrent
                                                                        ? 'is-dragging'
                                                                        : ''
                                                                } ${
                                                                    isTargetTop
                                                                        ? 'drop-target-top'
                                                                        : ''
                                                                } ${
                                                                    isTargetBottom
                                                                        ? 'drop-target-bottom'
                                                                        : ''
                                                                }`}
                                                                key={child.uid}
                                                                draggable={
                                                                    draggableSubTaskId ===
                                                                    child.uid
                                                                }
                                                                onDragStart={(
                                                                    event,
                                                                ) => {
                                                                    setDraggedSubTask(
                                                                        {
                                                                            taskIndex,
                                                                            childIndex,
                                                                        },
                                                                    )
                                                                    event.dataTransfer.effectAllowed =
                                                                        'move'
                                                                    event.dataTransfer.setData(
                                                                        'text/plain',
                                                                        `${taskIndex}:${childIndex}`,
                                                                    )
                                                                }}
                                                                onDragEnd={() => {
                                                                    setDraggedSubTask(
                                                                        null,
                                                                    )
                                                                    setDropTarget(
                                                                        null,
                                                                    )
                                                                    setDraggableSubTaskId(
                                                                        null,
                                                                    )
                                                                }}
                                                                onDragOver={(
                                                                    event,
                                                                ) => {
                                                                    event.preventDefault()
                                                                    event.stopPropagation()
                                                                    if (
                                                                        !draggedSubTask
                                                                    ) {
                                                                        return
                                                                    }
                                                                    if (
                                                                        draggedSubTask.taskIndex ===
                                                                            taskIndex &&
                                                                        draggedSubTask.childIndex ===
                                                                            childIndex
                                                                    ) {
                                                                        return
                                                                    }

                                                                    const rect =
                                                                        event.currentTarget.getBoundingClientRect()
                                                                    const position =
                                                                        event.clientY <
                                                                        rect.top +
                                                                            rect.height /
                                                                                2
                                                                            ? 'top'
                                                                            : 'bottom'

                                                                    if (
                                                                        dropTarget?.taskIndex !==
                                                                            taskIndex ||
                                                                        dropTarget?.childIndex !==
                                                                            childIndex ||
                                                                        dropTarget?.position !==
                                                                            position
                                                                    ) {
                                                                        setDropTarget(
                                                                            {
                                                                                taskIndex,
                                                                                childIndex,
                                                                                position,
                                                                            },
                                                                        )
                                                                    }
                                                                }}
                                                                onDrop={(
                                                                    event,
                                                                ) => {
                                                                    event.preventDefault()
                                                                    event.stopPropagation()
                                                                    if (
                                                                        !draggedSubTask
                                                                    ) {
                                                                        return
                                                                    }

                                                                    const position =
                                                                        dropTarget?.position ===
                                                                        'top'
                                                                            ? 'top'
                                                                            : 'bottom'

                                                                    handleMoveSubTask(
                                                                        draggedSubTask.taskIndex,
                                                                        draggedSubTask.childIndex,
                                                                        taskIndex,
                                                                        childIndex,
                                                                        position,
                                                                    )

                                                                    setDraggedSubTask(
                                                                        null,
                                                                    )
                                                                    setDropTarget(
                                                                        null,
                                                                    )
                                                                    setDraggableSubTaskId(
                                                                        null,
                                                                    )
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="master-job-subtask-drag-handle"
                                                                    title="Tahan dan geser untuk ubah urutan atau pindah task"
                                                                    onMouseDown={() =>
                                                                        setDraggableSubTaskId(
                                                                            child.uid,
                                                                        )
                                                                    }
                                                                    onMouseUp={() =>
                                                                        setDraggableSubTaskId(
                                                                            null,
                                                                        )
                                                                    }
                                                                >
                                                                    <i className="bi bi-grip-vertical" />
                                                                </button>

                                                                <i className="bi bi-arrow-return-right text-muted" />

                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    value={
                                                                        child.task_name
                                                                    }
                                                                    maxLength={
                                                                        256
                                                                    }
                                                                    placeholder="Nama sub task"
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        handleSubTaskChange(
                                                                            taskIndex,
                                                                            childIndex,
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                />

                                                                <div className="master-job-subtask-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="master-job-subtask-btn"
                                                                        disabled={
                                                                            childIndex ===
                                                                            0
                                                                        }
                                                                        title="Geser ke atas"
                                                                        onClick={() =>
                                                                            handleMoveSubTaskStep(
                                                                                taskIndex,
                                                                                childIndex,
                                                                                'up',
                                                                            )
                                                                        }
                                                                    >
                                                                        <i className="bi bi-chevron-up" />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="master-job-subtask-btn"
                                                                        disabled={
                                                                            childIndex ===
                                                                            task
                                                                                .children
                                                                                .length -
                                                                                1
                                                                        }
                                                                        title="Geser ke bawah"
                                                                        onClick={() =>
                                                                            handleMoveSubTaskStep(
                                                                                taskIndex,
                                                                                childIndex,
                                                                                'down',
                                                                            )
                                                                        }
                                                                    >
                                                                        <i className="bi bi-chevron-down" />
                                                                    </button>

                                                                    {formData
                                                                        .tasks
                                                                        .length >
                                                                        1 && (
                                                                        <div className="master-job-move-menu-container">
                                                                            <button
                                                                                type="button"
                                                                                className={`master-job-subtask-btn move-task ${
                                                                                    isMoveMenuOpen
                                                                                        ? 'active'
                                                                                        : ''
                                                                                }`}
                                                                                title="Pindahkan ke Task lain"
                                                                                onClick={() =>
                                                                                    setActiveMoveMenu(
                                                                                        isMoveMenuOpen
                                                                                            ? null
                                                                                            : {
                                                                                                  taskIndex,
                                                                                                  childIndex,
                                                                                              },
                                                                                    )
                                                                                }
                                                                            >
                                                                                <i className="bi bi-arrow-left-right" />
                                                                            </button>

                                                                            {isMoveMenuOpen && (
                                                                                <div className="master-job-move-menu-dropdown">
                                                                                    <div className="master-job-move-menu-header">
                                                                                        Pindahkan
                                                                                        ke:
                                                                                    </div>

                                                                                    <div className="master-job-move-menu-list">
                                                                                        {formData.tasks.map(
                                                                                            (
                                                                                                otherTask,
                                                                                                otherIndex,
                                                                                            ) => {
                                                                                                if (
                                                                                                    otherIndex ===
                                                                                                    taskIndex
                                                                                                ) {
                                                                                                    return null
                                                                                                }

                                                                                                const label =
                                                                                                    otherTask.task_name.trim() ||
                                                                                                    `Task ${
                                                                                                        otherIndex +
                                                                                                        1
                                                                                                    }`

                                                                                                return (
                                                                                                    <button
                                                                                                        key={
                                                                                                            otherTask.uid
                                                                                                        }
                                                                                                        type="button"
                                                                                                        className="master-job-move-menu-item"
                                                                                                        onClick={() => {
                                                                                                            handleMoveSubTask(
                                                                                                                taskIndex,
                                                                                                                childIndex,
                                                                                                                otherIndex,
                                                                                                                undefined,
                                                                                                                'append',
                                                                                                            )
                                                                                                            setActiveMoveMenu(
                                                                                                                null,
                                                                                                            )
                                                                                                        }}
                                                                                                    >
                                                                                                        <span className="badge bg-light text-dark border me-1.5">
                                                                                                            {otherIndex +
                                                                                                                1}
                                                                                                        </span>

                                                                                                        <span className="text-truncate">
                                                                                                            {label}
                                                                                                        </span>
                                                                                                    </button>
                                                                                                )
                                                                                            },
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <button
                                                                        type="button"
                                                                        className="master-job-subtask-btn delete"
                                                                        title="Hapus sub task"
                                                                        onClick={() =>
                                                                            handleRemoveSubTask(
                                                                                taskIndex,
                                                                                childIndex,
                                                                            )
                                                                        }
                                                                    >
                                                                        <i className="bi bi-x-lg" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    },
                                                )}

                                                <button
                                                    type="button"
                                                    className="master-job-add-subtask"
                                                    onClick={() =>
                                                        handleAddSubTask(
                                                            taskIndex,
                                                        )
                                                    }
                                                >
                                                    <i className="bi bi-plus-lg" />

                                                    Tambah Sub Task
                                                </button>
                                            </div>
                                        </div>
                                    )
                                },
                            )}
                        </div>
                    </div>

                    <div className="master-job-modal-footer">
                        <button
                            type="button"
                            className="btn btn-light"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && (
                                <span className="spinner-border spinner-border-sm me-2" />
                            )}

                            {job === null
                                ? 'Simpan'
                                : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default MasterJobFormModal
