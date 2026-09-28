import type {
    RepresentativeLetterPreview,
    RepresentativeLetterPreviewTask,
} from '@/features/representative-letter/types/representative-letter.types'
import {
    monthOptions,
} from '@/features/representative-letter/utils/documentSettings'

const escapeHtml = (value: string): string => {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')
}

const formatIndonesianDate = (date: Date): string => {
    const day = date.getDate()
    const monthLabel =
        monthOptions.find(
            (month) => month.value === date.getMonth() + 1,
        )?.label ?? ''
    const year = date.getFullYear()

    return `${day} ${monthLabel} ${year}`
}

const groupTasks = (
    tasks: RepresentativeLetterPreviewTask[],
): Array<{
    parentName: string
    tasks: RepresentativeLetterPreviewTask[]
}> => {
    const grouped = new Map<string, RepresentativeLetterPreviewTask[]>()

    tasks.forEach((task) => {
        const parentName = task.parent.task_name
        const current = grouped.get(parentName) ?? []

        grouped.set(parentName, [
            ...current,
            task,
        ])
    })

    return Array.from(grouped.entries()).map(
        ([parentName, groupedTasks]) => ({
            parentName,
            tasks: groupedTasks,
        }),
    )
}

const renderNotes = (
    task: RepresentativeLetterPreviewTask,
): string => {
    if (task.notes.length === 0) {
        return '<p><em>Tidak ada note Progress Report.</em></p>'
    }

    return `<ul>${task.notes
        .map(
            (note) =>
                `<li>${escapeHtml(note.catatan)}</li>`,
        )
        .join('')}</ul>`
}

export const buildRepresentativeLetterContentFromPreview = (
    preview: RepresentativeLetterPreview,
    createdAt: Date,
): string => {
    const clientName = escapeHtml(preview.spk.client_code)
    const groups = groupTasks(preview.tasks)
        .map(
            (group) => `
                <h3>${escapeHtml(group.parentName)}</h3>
                ${group.tasks
                    .map(
                        (task) => `
                            <p>
                                <strong>${escapeHtml(task.task.task_name)}</strong><br>
                                ${escapeHtml(task.progress_report.nomor)} / ${escapeHtml(task.progress_report.tanggal)} / ${escapeHtml(task.employee.name)}
                            </p>
                            <p><strong>Note Progress Report:</strong></p>
                            ${renderNotes(task)}
                        `,
                    )
                    .join('')}
            `,
        )
        .join('')

    return `
        <p><strong>Representative letter</strong></p>
        <p style="text-align:right;">Surabaya, ${formatIndonesianDate(createdAt)}</p>
        <p>
            Kepada Yth,<br>
            <strong><u>${clientName}</u></strong>
        </p>
        <p>Dengan hormat,</p>
        <p>
            Melalui surat ini, terdapat beberapa hal yang ingin kami sampaikan kepada Direksi
            terkait hasil progress report yang ada pada <strong>${clientName}</strong>.
            Hal ini bertujuan agar Direksi mengetahui kondisi badan usaha saat ini.
        </p>
        <p>Beberapa hal yang ingin kami sampaikan, yaitu:</p>
        <p><strong>Progress Report:</strong></p>
        ${groups}
        <p>
            Akhir kata, kami dari ALS AccounTax Management Consultant ingin mengucapkan
            terima kasih yang sebesar-besarnya atas kerja sama yang baik yang telah terjalin
            selama ini.
        </p>
        <p>
            Semoga dengan kehadiran kami, dapat membawa dampak dan perubahan yang baik bagi
            <strong>${clientName}</strong>.
        </p>
    `
}
