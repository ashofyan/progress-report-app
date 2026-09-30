export interface KaryawanItem {
    id: number
    text: string
    asal_pt: string
    code_employee: string
}

export interface KaryawanSearchResponse {
    incomplete_results: boolean
    items: KaryawanItem[]
    total: number
}
