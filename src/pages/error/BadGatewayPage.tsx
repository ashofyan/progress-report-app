import { Link } from 'react-router-dom'
import './styles/error-page.scss'

const BadGatewayPage = () => {
    const handleReload = (): void => {
        window.location.reload()
    }

    return (
        <div className="error-page-container">
            <div className="error-page-card error-502">
                <div className="error-badge-wrapper">
                    <div className="error-icon-box error-502">
                        <i className="bi bi-cloud-slash" />
                    </div>
                </div>

                <div className="error-status-code">502</div>
                <h1 className="error-title">Bad Gateway / Layanan Bermasalah</h1>
                <p className="error-description">
                    Server web tidak dapat terhubung ke server backend atau layanan API
                    sedang dalam proses pemeliharaan.
                </p>

                <div className="error-info-box">
                    <div className="error-info-title">
                        <i className="bi bi-info-circle-fill text-warning me-1" />
                        Saran Penyelesaian:
                    </div>
                    <ul>
                        <li>Periksa kestabilan koneksi internet pada perangkat Anda.</li>
                        <li>Layanan server API backend mungkin sedang dimulai ulang atau dalam maintenance.</li>
                        <li>Tunggu beberapa saat, lalu klik tombol muat ulang di bawah.</li>
                    </ul>
                </div>

                <div className="error-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleReload}
                    >
                        <i className="bi bi-arrow-clockwise" />
                        <span>Coba Muat Ulang</span>
                    </button>

                    <Link to="/dashboard" className="btn btn-outline-secondary">
                        <i className="bi bi-speedometer2" />
                        <span>Ke Dashboard</span>
                    </Link>
                </div>

                <div className="error-quick-links">
                    <div className="quick-links-title">Akses Alternatif</div>
                    <div className="quick-links-list">
                        <Link to="/login">
                            <i className="bi bi-box-arrow-in-right" /> Halaman Login
                        </Link>
                        <Link to="/master-data/pekerjaan">
                            <i className="bi bi-briefcase" /> Beranda Pekerjaan
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

export default BadGatewayPage
