const removeTrailingSlash = (value: string): string => {
    return value.replace(/\/+$/, '')
}

export const buildServiceSearchUrl = (
    asalPt: string,
): string => {
    const normalizedAsalPt = asalPt.trim()

    if (
        normalizedAsalPt.startsWith('http://') ||
        normalizedAsalPt.startsWith('https://')
    ) {
        return `${removeTrailingSlash(normalizedAsalPt)}/api/services/search`
    }

    return `https://${removeTrailingSlash(normalizedAsalPt)}/api/services/search`
}
