export const monthOptions = [
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

export const getPeriodeLabel = (
    bulan?: number | null,
    tahun?: number | null,
    tanggal?: string | null,
): string => {
    let b = bulan
    let t = tahun

    if ((!b || !t) && tanggal) {
        b = Number(tanggal.slice(5, 7))
        t = Number(tanggal.slice(0, 4))
    }

    const monthObj = monthOptions.find((m) => m.value === b)
    if (monthObj && t) {
        return `${monthObj.label} ${t}`
    }

    if (b && t) {
        return `${b}/${t}`
    }

    return '-'
}
