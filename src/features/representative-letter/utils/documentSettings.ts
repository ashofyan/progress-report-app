import type {
    RepresentativeLetterDocumentSettings,
} from '@/features/representative-letter/types/representative-letter.types'

export const defaultRepresentativeLetterDocumentSettings: RepresentativeLetterDocumentSettings =
    {
        page: {
            size: 'A4',
            orientation: 'portrait',
            margin_top: 20,
            margin_right: 20,
            margin_bottom: 20,
            margin_left: 20,
        },
        header: {
            enabled: true,
        },
        footer: {
            enabled: true,
        },
        watermark: {
            enabled: true,
            opacity: 0.08,
            width: 150,
        },
    }

const parseMarginNumber = (value: unknown, fallback: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ''))
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }
    return fallback
}

export const resolveRepresentativeLetterDocumentSettings = (
    settings: unknown,
): RepresentativeLetterDocumentSettings => {
    if (!settings || typeof settings !== 'object') {
        return defaultRepresentativeLetterDocumentSettings
    }

    const s = settings as Record<string, any>

    // Check if s has s.page or s.paper_size / s.margin
    const pageSize = s.page?.size ?? s.paper_size ?? defaultRepresentativeLetterDocumentSettings.page.size
    const pageOrientation = s.page?.orientation ?? s.orientation ?? defaultRepresentativeLetterDocumentSettings.page.orientation

    const marginTop = parseMarginNumber(
        s.page?.margin_top ?? s.margin?.top,
        defaultRepresentativeLetterDocumentSettings.page.margin_top,
    )
    const marginRight = parseMarginNumber(
        s.page?.margin_right ?? s.margin?.right,
        defaultRepresentativeLetterDocumentSettings.page.margin_right,
    )
    const marginBottom = parseMarginNumber(
        s.page?.margin_bottom ?? s.margin?.bottom,
        defaultRepresentativeLetterDocumentSettings.page.margin_bottom,
    )
    const marginLeft = parseMarginNumber(
        s.page?.margin_left ?? s.margin?.left,
        defaultRepresentativeLetterDocumentSettings.page.margin_left,
    )

    const headerEnabled =
        typeof s.header?.enabled === 'boolean'
            ? s.header.enabled
            : typeof s.header_footer?.header_enabled === 'boolean'
            ? s.header_footer.header_enabled
            : defaultRepresentativeLetterDocumentSettings.header.enabled

    const footerEnabled =
        typeof s.footer?.enabled === 'boolean'
            ? s.footer.enabled
            : typeof s.header_footer?.footer_enabled === 'boolean'
            ? s.header_footer.footer_enabled
            : defaultRepresentativeLetterDocumentSettings.footer.enabled

    const watermarkEnabled =
        typeof s.watermark?.enabled === 'boolean'
            ? s.watermark.enabled
            : defaultRepresentativeLetterDocumentSettings.watermark.enabled

    const watermarkOpacity =
        typeof s.watermark?.opacity === 'number'
            ? s.watermark.opacity
            : defaultRepresentativeLetterDocumentSettings.watermark.opacity

    const watermarkWidth =
        typeof s.watermark?.width === 'number'
            ? s.watermark.width
            : defaultRepresentativeLetterDocumentSettings.watermark.width

    const watermarkImageUrl =
        typeof s.watermark?.image_url === 'string'
            ? s.watermark.image_url
            : undefined

    return {
        page: {
            size: pageSize === 'landscape' || pageSize === 'portrait' ? 'A4' : pageSize,
            orientation: pageOrientation === 'landscape' ? 'landscape' : 'portrait',
            margin_top: marginTop,
            margin_right: marginRight,
            margin_bottom: marginBottom,
            margin_left: marginLeft,
        },
        header: {
            enabled: headerEnabled,
        },
        footer: {
            enabled: footerEnabled,
        },
        watermark: {
            enabled: watermarkEnabled,
            opacity: watermarkOpacity,
            width: watermarkWidth,
            image_url: watermarkImageUrl,
        },
        header_footer: s.header_footer
            ? {
                  header_enabled: headerEnabled,
                  footer_enabled: footerEnabled,
                  header_image_url: s.header_footer.header_image_url ?? null,
                  footer_image_url: s.header_footer.footer_image_url ?? null,
                  footer_text: s.header_footer.footer_text ?? null,
                  footer_type: s.header_footer.footer_type ?? 'image',
              }
            : undefined,
    }
}

export const monthOptions: Array<{
    value: number
    label: string
}> = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
]
