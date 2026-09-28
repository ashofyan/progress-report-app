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

export const resolveRepresentativeLetterDocumentSettings = (
    settings: RepresentativeLetterDocumentSettings | null,
): RepresentativeLetterDocumentSettings => {
    if (settings === null) {
        return defaultRepresentativeLetterDocumentSettings
    }

    return {
        page: {
            ...defaultRepresentativeLetterDocumentSettings.page,
            ...settings.page,
        },
        header: {
            ...defaultRepresentativeLetterDocumentSettings.header,
            ...settings.header,
        },
        footer: {
            ...defaultRepresentativeLetterDocumentSettings.footer,
            ...settings.footer,
        },
        watermark: {
            ...defaultRepresentativeLetterDocumentSettings.watermark,
            ...settings.watermark,
        },
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
