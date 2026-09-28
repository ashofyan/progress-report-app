import { useMemo } from 'react'

import type {
    RepresentativeLetterPreview as PreviewData,
    RepresentativeLetterPreviewTask,
} from '@/features/representative-letter/types/representative-letter.types'

interface RepresentativeLetterPreviewProps {
    preview: PreviewData
}

interface TaskGroup {
    parentName: string
    tasks: RepresentativeLetterPreviewTask[]
}

const RepresentativeLetterPreview = ({
                                         preview,
                                     }: RepresentativeLetterPreviewProps) => {
    const groups = useMemo<TaskGroup[]>(() => {
        const grouped = new Map<string, RepresentativeLetterPreviewTask[]>()

        preview.tasks.forEach((task) => {
            const parentName = task.parent.task_name
            const current = grouped.get(parentName) ?? []

            grouped.set(parentName, [
                ...current,
                task,
            ])
        })

        return Array.from(grouped.entries()).map(
            ([parentName, tasks]) => ({
                parentName,
                tasks,
            }),
        )
    }, [preview.tasks])

    return (
        <div className="representative-letter-preview">
            <div className="representative-letter-preview-grid">
                <div>
                    <span>SPK</span>
                    <strong>{preview.spk.no_spk}</strong>
                </div>
                <div>
                    <span>Client</span>
                    <strong>{preview.spk.client_code}</strong>
                </div>
                <div>
                    <span>Pekerjaan</span>
                    <strong>{preview.job.description}</strong>
                </div>
                <div>
                    <span>Periode</span>
                    <strong>{preview.periode.label}</strong>
                </div>
            </div>

            <div className="representative-letter-summary">
                <div>
                    <span>Total Progress Report</span>
                    <strong>
                        {preview.summary.total_progress_report}
                    </strong>
                </div>
                <div>
                    <span>Total Task Selesai</span>
                    <strong>
                        {preview.summary.total_task_selesai}
                    </strong>
                </div>
                <div>
                    <span>Total Employee</span>
                    <strong>
                        {preview.summary.total_employee}
                    </strong>
                </div>
            </div>

            {preview.summary.total_task_selesai === 0 && (
                <div className="alert alert-warning mb-0">
                    Tidak terdapat task Progress Report selesai pada periode tersebut.
                </div>
            )}

            <div className="representative-letter-task-list">
                {groups.map((group) => (
                    <div
                        className="representative-letter-task-group"
                        key={group.parentName}
                    >
                        <h3>{group.parentName}</h3>

                        {group.tasks.map((task) => (
                            <div
                                className="representative-letter-task-item"
                                key={`${task.progress_report.id}-${task.type}-${task.task.id}`}
                            >
                                <div>
                                    <strong>
                                        {task.task.task_name}
                                    </strong>
                                    <span>
                                        {task.progress_report.nomor} /{' '}
                                        {
                                            task.progress_report
                                                .tanggal
                                        }{' '}
                                        / {task.employee.name}
                                    </span>
                                </div>

                                <span className="representative-letter-status selesai">
                                    Selesai
                                </span>

                                {task.notes.length > 0 && (
                                    <p>
                                        {task.notes
                                            .map(
                                                (note) =>
                                                    note.catatan,
                                            )
                                            .join('\n')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default RepresentativeLetterPreview
