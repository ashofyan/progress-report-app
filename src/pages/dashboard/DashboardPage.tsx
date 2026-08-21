import { useAuth } from '@/features/auth/hooks/useAuth'

const DashboardPage = () => {
    const {
        employee,
        logout,
    } = useAuth()

    const handleLogout = async (): Promise<void> => {
        await logout()
    }

    return (
        <main className="container py-5">
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <h1>
                        Welcome, {employee?.employee_name}
                    </h1>

                    <p className="mb-0 text-secondary">
                        {employee?.jabatan.nama_jabatan}
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </div>
        </main>
    )
}

export default DashboardPage
