export interface LoginRequest {
    username: string
    password: string
}

export interface JobPosition {
    id: number
    kode_jabatan: string
    nama_jabatan: string
    gaji_pokok: number
    coa_gaji_pokok: string | null
    tingkat: string | null
    is_show_absen: boolean
    department_id: number
}

export interface Employee {
    id?: number
    employee_name: string
    employee_code: string
    email: string
    phone: string
    asal_pt: string
    jabatan: JobPosition
}

export interface LoginData {
    token_type: 'Bearer'
    token: string
    employee: Employee
}

export interface LoginSuccessResponse {
    success: true
    message: string
    data: LoginData
}

export interface MeSuccessResponse {
    success: true
    message: string
    data: Employee
}

export interface LogoutSuccessResponse {
    success: true
    message: string
}

export interface ApiErrorResponse {
    success: false
    message: string
}

export interface AuthApiResult<T> {
    success: boolean
    data?: T
    message: string
    status: number
}

export interface AuthContextValue {
    employee: Employee | null
    isAuthenticated: boolean
    isInitializing: boolean
    login: (credentials: LoginRequest) => Promise<AuthApiResult<Employee>>
    logout: () => Promise<void>
}
