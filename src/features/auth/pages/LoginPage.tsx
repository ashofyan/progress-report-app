import LoginForm from '@/features/auth/components/LoginForm'
import '@/features/auth/styles/login.scss'

const LoginPage = () => {
    return (
        <main className="login-wrapper">
            <div className="login-container">
                <section className="login-form-section">
                    <div className="login-form-inner">
                        {/* Brand Logo & Name */}
                        <div className="login-brand-bar">
                            <div className="login-brand-icon">
                                <i className="bi bi-pie-chart-fill" />
                            </div>
                            <div className="login-brand-details">
                                <span className="login-company-name">ALS HOLDINGS</span>
                                <span className="login-system-name">Progress Report System</span>
                            </div>
                        </div>

                        {/* Heading */}
                        <div className="login-heading-group">
                            <h1 className="login-main-title">Selamat Datang</h1>
                            <p className="login-main-desc">
                                Silakan masuk dengan akun ALS HRD Anda untuk mengakses progres report.
                            </p>
                        </div>

                        {/* Login Form */}
                        <LoginForm />

                        {/* Footer */}
                        <div className="login-form-footer">
                            <span className="login-copyright-text">
                                &copy; {new Date().getFullYear()} ALS Holdings. Hak Cipta Dilindungi.
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}

export default LoginPage
