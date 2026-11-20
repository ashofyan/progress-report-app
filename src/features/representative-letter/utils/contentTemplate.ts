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

/**
 * Builds hierarchical Progress Report HTML representation:
 *
 * <p><strong><u>Nama Jasa</u></strong></p>
 * <ol>
 *   <li>Nama Task
 *     <ol type="a">
 *       <li>Sub Task
 *         <p>note subtask1</p>
 *         <p>note subtask2</p>
 *       </li>
 *     </ol>
 *   </li>
 *   <li>Nama Task 2</li>
 * </ol>
 */
export const buildProgressReportHierarchicalHtml = (
    jasaName: string,
    tasks: RepresentativeLetterPreviewTask[],
): string => {
    const taskMap = new Map<string, Map<string, string[]>>()

    tasks.forEach((item) => {
        const parentTaskName =
            item.parent?.task_name?.trim() ||
            item.task?.task_name?.trim() ||
            'Pekerjaan / Task'
        const subTaskName =
            item.parent?.task_name &&
            item.parent.task_name !== item.task.task_name
                ? item.task.task_name.trim()
                : ''

        if (!taskMap.has(parentTaskName)) {
            taskMap.set(parentTaskName, new Map<string, string[]>())
        }

        const subMap = taskMap.get(parentTaskName)!
        const subKey = subTaskName || '__none__'

        if (!subMap.has(subKey)) {
            subMap.set(subKey, [])
        }

        const noteList = subMap.get(subKey)!
        item.notes.forEach((note) => {
            const txt = note.catatan.trim()
            if (txt && !noteList.includes(txt)) {
                noteList.push(txt)
            }
        })
    })

    if (taskMap.size === 0) {
        return `
            <p style="margin-bottom: 6px;"><strong><u>${escapeHtml(jasaName)}</u></strong></p>
            <p><em>(Belum ada data task selesai)</em></p>
        `
    }

    let html = `<p style="margin-bottom: 6px;"><strong><u>${escapeHtml(jasaName)}</u></strong></p>`
    html += '<ol style="margin-top: 4px; margin-bottom: 16px; padding-left: 24px;">'

    taskMap.forEach((subMap, taskName) => {
        html += `<li style="margin-bottom: 6px;">${escapeHtml(taskName)}`

        const hasSubtasks = Array.from(subMap.keys()).some((k) => k !== '__none__')

        if (hasSubtasks) {
            html += '<ol type="a" style="margin-top: 4px; margin-bottom: 6px; padding-left: 20px;">'
            subMap.forEach((notes, subName) => {
                if (subName === '__none__') return
                html += `<li style="margin-bottom: 4px;">${escapeHtml(subName)}`
                notes.forEach((noteText) => {
                    html += `<p style="margin: 2px 0 2px 0; color: #333;">${escapeHtml(noteText)}</p>`
                })
                html += '</li>'
            })
            html += '</ol>'
        } else {
            const directNotes = subMap.get('__none__') ?? []
            directNotes.forEach((noteText) => {
                html += `<p style="margin: 2px 0 2px 0; color: #333;">${escapeHtml(noteText)}</p>`
            })
        }

        html += '</li>'
    })

    html += '</ol>'

    return html
}

export const buildRepresentativeLetterContentFromPreview = (
    preview: RepresentativeLetterPreview,
    createdAt: Date,
): string => {
    const clientName = escapeHtml(preview.client_name || preview.spk?.client_code || "")
    const jasaName = preview.job?.description || 'Pekerjaan Jasa'
    const progressReportContent = buildProgressReportHierarchicalHtml(
        jasaName,
        preview.tasks,
    )

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
        ${progressReportContent}
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
