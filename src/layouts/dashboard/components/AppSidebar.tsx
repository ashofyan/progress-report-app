import { useState } from 'react'
import {
    NavLink,
    useLocation,
} from 'react-router-dom'

interface AppSidebarProps {
    isOpen?: boolean
    onClose?: () => void
}

const AppSidebar = ({ isOpen = false, onClose }: AppSidebarProps) => {
    const location = useLocation()

    const isMasterDataActive =
        location.pathname.startsWith('/master-data')

    const [isMasterDataOpen, setIsMasterDataOpen] =
        useState<boolean>(isMasterDataActive)

    const isRepresentativeLetterActive =
        location.pathname.startsWith('/representative-letter')

    const [
        isRepresentativeLetterOpen,
        setIsRepresentativeLetterOpen,
    ] = useState<boolean>(isRepresentativeLetterActive)

    const isToolsActive =
        location.pathname.startsWith('/notes')

    const [isToolsOpen, setIsToolsOpen] =
        useState<boolean>(isToolsActive)

    const handleToggleMasterData = (): void => {
        setIsMasterDataOpen((previous) => !previous)
    }

    const handleToggleRepresentativeLetter = (): void => {
        setIsRepresentativeLetterOpen((previous) => !previous)
    }

    const handleToggleTools = (): void => {
        setIsToolsOpen((previous) => !previous)
    }

    const handleLinkClick = (): void => {
        if (onClose) {
            onClose()
        }
    }

    return (
        <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
            <div className="app-sidebar-header-mobile">
                <span className="app-sidebar-mobile-title">Menu Navigasi</span>
                {onClose && (
                    <button
                        type="button"
                        className="app-sidebar-close-button"
                        onClick={onClose}
                        aria-label="Tutup menu"
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                )}
            </div>

            <nav className="app-sidebar-nav">
                <NavLink
                    to="/dashboard"
                    onClick={handleLinkClick}
                    className={({ isActive }) =>
                        `app-sidebar-link ${
                            isActive ? 'active' : ''
                        }`
                    }
                >
                    <i className="bi bi-speedometer2" />
                    <span>Dashboard</span>
                </NavLink>

                <div className="app-sidebar-group">
                    <button
                        type="button"
                        className={`app-sidebar-link app-sidebar-button ${
                            isMasterDataActive ? 'active' : ''
                        }`}
                        onClick={handleToggleMasterData}
                    >
                        <div className="app-sidebar-link-content">
                            <i className="bi bi-database-gear" />
                            <span>Master Data</span>
                        </div>

                        <i
                            className={`bi ${
                                isMasterDataOpen
                                    ? 'bi-chevron-down'
                                    : 'bi-chevron-right'
                            } app-sidebar-arrow`}
                        />
                    </button>

                    {isMasterDataOpen && (
                        <div className="app-sidebar-submenu">
                            <NavLink
                                to="/master-data/pekerjaan"
                                onClick={handleLinkClick}
                                className={({ isActive }) =>
                                    `app-sidebar-submenu-link ${
                                        isActive ? 'active' : ''
                                    }`
                                }
                            >
                                Pekerjaan
                            </NavLink>

                            <NavLink
                                to="/master-data/task"
                                onClick={handleLinkClick}
                                className={({ isActive }) =>
                                    `app-sidebar-submenu-link ${
                                        isActive ? 'active' : ''
                                    }`
                                }
                            >
                                Pekerjaan Tambahan
                            </NavLink>
                        </div>
                    )}
                </div>

                <NavLink
                    to="/daily-progress"
                    onClick={handleLinkClick}
                    className={({ isActive }) =>
                        `app-sidebar-link ${
                            isActive ? 'active' : ''
                        }`
                    }
                >
                    <i className="bi bi-calendar3" />
                    <span>Daily Progress</span>
                </NavLink>

                <NavLink
                    to="/progress-report"
                    onClick={handleLinkClick}
                    className={({ isActive }) =>
                        `app-sidebar-link ${
                            isActive ? 'active' : ''
                        }`
                    }
                >
                    <i className="bi bi-clipboard-data" />
                    <span>Progress Report</span>
                </NavLink>

                <NavLink
                    to="/temuan"
                    onClick={handleLinkClick}
                    className={({ isActive }) =>
                        `app-sidebar-link ${
                            isActive || location.pathname.startsWith('/solusi')
                                ? 'active'
                                : ''
                        }`
                    }
                >
                    <i className="bi bi-check2-square" />
                    <span>Temuan & Solusi</span>
                </NavLink>

                <div className="app-sidebar-group">
                    <button
                        type="button"
                        className={`app-sidebar-link app-sidebar-button ${
                            isRepresentativeLetterActive
                                ? 'active'
                                : ''
                        }`}
                        onClick={handleToggleRepresentativeLetter}
                    >
                        <div className="app-sidebar-link-content">
                            <i className="bi bi-file-earmark-text-fill" />
                            <span>Representative Letter</span>
                        </div>

                        <i
                            className={`bi ${
                                isRepresentativeLetterOpen
                                    ? 'bi-chevron-down'
                                    : 'bi-chevron-right'
                            } app-sidebar-arrow`}
                        />
                    </button>

                    {isRepresentativeLetterOpen && (
                        <div className="app-sidebar-submenu">
                            <NavLink
                                to="/representative-letter"
                                end
                                onClick={handleLinkClick}
                                className={({ isActive }) =>
                                    `app-sidebar-submenu-link ${
                                        isActive ? 'active' : ''
                                    }`
                                }
                            >
                                Dokumen
                            </NavLink>

                            <NavLink
                                to="/representative-letter/header"
                                onClick={handleLinkClick}
                                className={({ isActive }) =>
                                    `app-sidebar-submenu-link ${
                                        isActive ? 'active' : ''
                                    }`
                                }
                            >
                                Header Kop Surat
                            </NavLink>
                        </div>
                    )}
                </div>

                <div className="app-sidebar-group">
                    <button
                        type="button"
                        className={`app-sidebar-link app-sidebar-button ${
                            isToolsActive
                                ? 'active'
                                : ''
                        }`}
                        onClick={handleToggleTools}
                    >
                        <div className="app-sidebar-link-content">
                            <i className="bi bi-tools" />
                            <span>Tools</span>
                        </div>

                        <i
                            className={`bi ${
                                isToolsOpen
                                    ? 'bi-chevron-down'
                                    : 'bi-chevron-right'
                            } app-sidebar-arrow`}
                        />
                    </button>

                    {isToolsOpen && (
                        <div className="app-sidebar-submenu">
                            <NavLink
                                to="/notes"
                                onClick={handleLinkClick}
                                className={({ isActive }) =>
                                    `app-sidebar-submenu-link ${
                                        isActive ? 'active' : ''
                                    }`
                                }
                            >
                                Notes
                            </NavLink>
                        </div>
                    )}
                </div>
            </nav>
        </aside>
    )
}

export default AppSidebar
