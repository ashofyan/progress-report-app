import { useState } from 'react'

import { useAuth } from '@/features/auth/hooks/useAuth.ts'

const AppHeader = () => {
    const { employee, logout } = useAuth()

    const [isMenuOpen, setIsMenuOpen] =
        useState<boolean>(false)

    const handleToggleMenu = (): void => {
        setIsMenuOpen((previous) => !previous)
    }

    const handleLogout = async (): Promise<void> => {
        setIsMenuOpen(false)

        await logout()
    }

    return (
        <header className="app-header">
            <div className="app-header-brand">
                <div className="app-header-logo">
                    <i className="bi bi-pie-chart-fill" />
                </div>

                <span className="app-header-title">
          Progress Report
        </span>
            </div>

            <div className="app-header-user">
                <button
                    type="button"
                    className="app-header-user-button"
                    onClick={handleToggleMenu}
                >
          <span>
            Hi, {employee?.employee_name ?? 'Employee'}
          </span>

                    <i
                        className={`bi ${
                            isMenuOpen
                                ? 'bi-caret-up-fill'
                                : 'bi-caret-down-fill'
                        }`}
                    />
                </button>

                {isMenuOpen && (
                    <div className="app-header-dropdown">
                        <div className="app-header-dropdown-profile">
                            <strong>
                                {employee?.employee_name}
                            </strong>

                            <span>
                {employee?.email}
              </span>
                        </div>

                        <div className="app-header-dropdown-divider" />

                        <button
                            type="button"
                            className="app-header-dropdown-item"
                            onClick={() => void handleLogout()}
                        >
                            <i className="bi bi-box-arrow-right" />

                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    )
}

export default AppHeader
