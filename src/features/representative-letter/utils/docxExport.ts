import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'

export const exportHtmlToDocx = async (
    title: string,
    htmlContent: string,
): Promise<void> => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    const body = doc.body

    const docElements: (Paragraph | Table)[] = []

    const parseInlineNodes = (node: Node): TextRun[] => {
        const runs: TextRun[] = []

        const traverse = (
            currentNode: Node,
            styles: { bold?: boolean; italics?: boolean; underline?: Record<string, unknown>; color?: string },
        ) => {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                const text = currentNode.textContent || ''
                if (text) {
                    runs.push(
                        new TextRun({
                            text,
                            bold: styles.bold,
                            italics: styles.italics,
                            underline: styles.underline,
                            color: styles.color,
                            font: 'Arial',
                            size: 22, // 11pt
                        }),
                    )
                }
                return
            }

            if (currentNode.nodeType === Node.ELEMENT_NODE) {
                const el = currentNode as HTMLElement
                const tag = el.tagName.toLowerCase()
                const isLink = tag === 'a'

                const newStyles = {
                    ...styles,
                    bold: styles.bold || tag === 'strong' || tag === 'b',
                    italics: styles.italics || tag === 'em' || tag === 'i',
                    underline: styles.underline || (tag === 'u' || isLink ? {} : undefined),
                    color: isLink ? '2563EB' : styles.color,
                }

                currentNode.childNodes.forEach((child) =>
                    traverse(child, newStyles),
                )
            }
        }

        traverse(node, {})
        return runs
    }

    body.childNodes.forEach((child) => {
        if (child.nodeType !== Node.ELEMENT_NODE) return
        const el = child as HTMLElement
        const tag = el.tagName.toLowerCase()

        if (tag === 'h1') {
            docElements.push(
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: parseInlineNodes(el),
                    spacing: { before: 240, after: 120 },
                }),
            )
        } else if (tag === 'h2') {
            docElements.push(
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: parseInlineNodes(el),
                    spacing: { before: 200, after: 100 },
                }),
            )
        } else if (tag === 'h3') {
            docElements.push(
                new Paragraph({
                    heading: HeadingLevel.HEADING_3,
                    children: parseInlineNodes(el),
                    spacing: { before: 160, after: 80 },
                }),
            )
        } else if (tag === 'ul' || tag === 'ol') {
            const isOrdered = tag === 'ol'
            el.querySelectorAll('li').forEach((li, idx) => {
                docElements.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: isOrdered ? `${idx + 1}. ` : '• ',
                                bold: isOrdered,
                                font: 'Arial',
                            }),
                            ...parseInlineNodes(li),
                        ],
                        spacing: { after: 80 },
                    }),
                )
            })
        } else if (tag === 'table') {
            const rows: TableRow[] = []
            el.querySelectorAll('tr').forEach((tr) => {
                const cells: TableCell[] = []
                tr.querySelectorAll('td, th').forEach((cell) => {
                    cells.push(
                        new TableCell({
                            children: [
                                new Paragraph({
                                    children: parseInlineNodes(cell),
                                }),
                            ],
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                                right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                            },
                        }),
                    )
                })
                if (cells.length > 0) {
                    rows.push(new TableRow({ children: cells }))
                }
            })

            if (rows.length > 0) {
                docElements.push(
                    new Table({
                        rows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                )
            }
        } else {
            // Standard paragraph
            docElements.push(
                new Paragraph({
                    children: parseInlineNodes(el),
                    spacing: { after: 120 },
                }),
            )
        }
    })

    const document = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440, // 1 inch / 25mm
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                children: docElements.length > 0 ? docElements : [new Paragraph({ text: '' })],
            },
        ],
    })

    const blob = await Packer.toBlob(document)
    const cleanFilename = (title || 'document').replace(/[^\w\d-_ ]+/g, '').trim() || 'document'
    saveAs(blob, `${cleanFilename}.docx`)
}
