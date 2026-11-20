import type {
    AvailableProgressReportDocument,
    AvailableProgressReportTemuan,
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

interface SubtaskDetailData {
    notes: string[]
    documents: AvailableProgressReportDocument[]
    temuans: AvailableProgressReportTemuan[]
}

const renderSubtaskDetailHtml = (subData: SubtaskDetailData): string => {
    let html = ''

    // 1. Catatan per subtask
    subData.notes.forEach((noteText) => {
        html += `<p style="margin: 2px 0 2px 0; color: #333;">${escapeHtml(noteText)}</p>`
    })

    // 2. Hasil Gambar Langsung di Bawah Catatan per Subtask
    const images = subData.documents.filter((d) => d.is_image)
    if (images.length > 0) {
        html += '<div class="subtask-images" style="margin: 6px 0 8px 0;">'
        images.forEach((img) => {
            html += `<div style="margin: 4px 0 6px 0;"><img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.original_name)}" style="max-width: 100%; max-height: 280px; object-fit: contain; border-radius: 4px; display: block;" /></div>`
        })
        html += '</div>'
    }

    // 3. Dokumen Non-Gambar (Link / Shortlink)
    const nonImages = subData.documents.filter((d) => !d.is_image)
    if (nonImages.length > 0) {
        html += '<div class="subtask-documents" style="margin: 4px 0 6px 0;">'
        nonImages.forEach((doc) => {
            html += `<p style="margin: 2px 0; font-size: 9pt;">📎 <a href="${escapeHtml(doc.url)}" target="_blank" style="color: #2563eb; text-decoration: underline;">${escapeHtml(doc.original_name)}</a></p>`
        })
        html += '</div>'
    }

    // 4. Temuan & Solusi (Identifikasi Masalah & Saran)
    if (subData.temuans && subData.temuans.length > 0) {
        html += '<div class="subtask-findings" style="margin-top: 8px; margin-bottom: 8px;">'
        subData.temuans.forEach((t) => {
            html += '<p style="margin: 6px 0 2px 0; font-weight: bold; color: #111827;">&bull;&nbsp;Identifikasi Masalah</p>'
            html += `<p style="margin: 2px 0 6px 14px; color: #374151; line-height: 1.45;">${escapeHtml(t.masalah)}</p>`
            if (t.saran) {
                html += '<p style="margin: 6px 0 2px 0; font-weight: bold; color: #111827;">&bull;&nbsp;Saran</p>'
                html += `<p style="margin: 2px 0 6px 14px; color: #374151; line-height: 1.45;">${escapeHtml(t.saran)}</p>`
            }
        })
        html += '</div>'
    }

    return html
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
 *         <div class="subtask-images"><img ... /></div>
 *         <div class="subtask-documents">📎 <a ...>...</a></div>
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
    const taskMap = new Map<string, Map<string, SubtaskDetailData>>()

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
            taskMap.set(parentTaskName, new Map<string, SubtaskDetailData>())
        }

        const subMap = taskMap.get(parentTaskName)!
        const subKey = subTaskName || '__none__'

        if (!subMap.has(subKey)) {
            subMap.set(subKey, { notes: [], documents: [], temuans: [] })
        }

        const subData = subMap.get(subKey)!
        item.notes.forEach((note) => {
            const txt = note.catatan.trim()
            if (txt && !subData.notes.includes(txt)) {
                subData.notes.push(txt)
            }
        })

        if (item.documents && Array.isArray(item.documents)) {
            item.documents.forEach((doc) => {
                if (!subData.documents.some((d) => d.path === doc.path)) {
                    subData.documents.push(doc)
                }
            })
        }

        if (item.temuans && Array.isArray(item.temuans)) {
            item.temuans.forEach((t) => {
                if (!subData.temuans.some((x) => x.masalah === t.masalah)) {
                    subData.temuans.push(t)
                }
            })
        }
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
            subMap.forEach((subData, subName) => {
                if (subName === '__none__') return
                html += `<li style="margin-bottom: 4px;">${escapeHtml(subName)}`
                html += renderSubtaskDetailHtml(subData)
                html += '</li>'
            })
            html += '</ol>'
        } else {
            const directData = subMap.get('__none__') ?? { notes: [], documents: [], temuans: [] }
            html += renderSubtaskDetailHtml(directData)
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
