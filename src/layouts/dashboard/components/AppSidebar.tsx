import { useState } from 'react'
import {
    NavLink,
    useLocation,
} from 'react-router-dom'

const AppSidebar = () => {
    const location = useLocation()

    const isMasterDataActive =
        location.pathname.startsWith('/master-data')

    const [isMasterDataOpen, setIsMasterDataOpen] =
        useState<boolean>(isMasterDataActive)

    const handleToggleMasterData = (): void => {
        setIsMasterDataOpen((previous) => !previous)
    }

    return (
        <aside className="app-sidebar">
            <nav className="app-sidebar-nav">
                <NavLink
                    to="/dashboard"
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
                                    ? 'bi-caret-down-fill'
                                    : 'bi-caret-right-fill'
                            } app-sidebar-arrow`}
                        />
                    </button>

                    {isMasterDataOpen && (
                        <div className="app-sidebar-submenu">
                            <NavLink
                                to="/master-data/pekerjaan"
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
                    to="/representative-letter"
                    className={({ isActive }) =>
                        `app-sidebar-link ${
                            isActive ? 'active' : ''
                        }`
                    }
                >
                    <i className="bi bi-file-earmark-text-fill" />

                    <span>Representative Letter</span>
                </NavLink>
            </nav>
        </aside>
    )
}

export default AppSidebar
