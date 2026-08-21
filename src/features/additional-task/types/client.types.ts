export interface MarketingClient {
    id: number
    company_name: string
    customer_code: string
    customer_name: string
    npwp: string
    email: string
    address: string
    phone: string
    note: string
    piutang_max: number
    photo: string
    status_customer: number
    created_at: string | null
    created_by: number | string | null
    update_at: string | null
    update_by: number | string | null
    aging: string
    status_pkp: string | null
    tanggal_pkp: string
    no_pkp: string
    jumlah_durasi: number
    durasi_aging: string
    no_ktp: string
    jenis_badan: string
    relasi_id: number
    ptkp_id: number
    jenis_kelamin: string
    password: string
}
