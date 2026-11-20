import { Link, useNavigate } from 'react-router-dom'
import './styles/error-page.scss'

const NotFoundPage = () => {
    const navigate = useNavigate()

    return (
        <div className="error-page-container">
            <div className="error-page-card error-404">
                <div className="error-badge-wrapper">
                    <div className="error-icon-box error-404">
                        <i className="bi bi-compass" />
                    </div>
                </div>

                <div className="error-status-code">404</div>
                <h1 className="error-title">Halaman Tidak Ditemukan</h1>
                <p className="error-description">
                    Maaf, halaman yang Anda tuju tidak tersedia, telah dipindahkan,
                    atau alamat URL yang dimasukkan salah.
                </p>

                <div className="error-actions">
                    <Link to="/dashboard" className="btn btn-primary">
                        <i className="bi bi-speedometer2" />
                        <span>Ke Dashboard</span>
                    </Link>

                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => navigate(-1)}
                    >
                        <i className="bi bi-arrow-left" />
                        <span>Kembali</span>
                    </button>
                </div>

                <div className="error-quick-links">
                    <div className="quick-links-title">Tautan Cepat</div>
                    <div className="quick-links-list">
                        <Link to="/temuan">
                            <i className="bi bi-card-checklist" /> Temuan &amp; Solusi
                        </Link>
                        <Link to="/progress-report">
                            <i className="bi bi-file-earmark-bar-graph" /> Progress Report
                        </Link>
                        <Link to="/daily-progress">
                            <i className="bi bi-calendar-check" /> Daily Progress
                        </Link>
                        <Link to="/master-data/pekerjaan">
                            <i className="bi bi-briefcase" /> Master Pekerjaan
                        </Link>
                    </div>
                </div>
            </div>

            <div className="error-footer-brand">
                <i className="bi bi-shield-check" />
                <span>ALS Holdings Progress Report System</span>
            </div>
        </div>
    )
}

export default NotFoundPage
