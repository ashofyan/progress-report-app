import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth.ts'

interface AppHeaderProps {
    onToggleSidebar?: () => void
}

const AppHeader = ({ onToggleSidebar }: AppHeaderProps) => {
    const { employee, logout, isAuthenticated } = useAuth()
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true })
        }
    }, [isAuthenticated, navigate])

    const handleToggleMenu = (): void => {
        setIsMenuOpen((previous) => !previous)
    }

    const handleLogout = async (): Promise<void> => {
        setIsMenuOpen(false)
        await logout()
        navigate('/login', { replace: true })
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false)
            }
        }

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isMenuOpen])

    const getInitial = (): string => {
        if (!employee?.employee_name) return ''
        return employee.employee_name.trim().charAt(0).toUpperCase()
    }

    return (
        <header className="app-header">
            <div className="app-header-left">
                {onToggleSidebar && (
                    <button
                        type="button"
                        className="app-header-menu-toggle"
                        onClick={onToggleSidebar}
                        aria-label="Toggle navigation menu"
                    >
                        <i className="bi bi-list" />
                    </button>
                )}

                <div className="app-header-brand">
                    <div className="app-header-logo">
                        <i className="bi bi-pie-chart-fill" />
                    </div>

                    <span className="app-header-title">Progress Report</span>
                </div>
            </div>

            <div className="app-header-user" ref={menuRef}>
                <button
                    type="button"
                    className="app-header-user-button"
                    onClick={handleToggleMenu}
                    aria-expanded={isMenuOpen}
                >
                    <span className="app-header-user-avatar">
                        {getInitial()}
                    </span>

                    <span className="app-header-user-name">
                        {employee?.employee_name ?? ''}
                    </span>

                    <i
                        className={`bi ${
                            isMenuOpen
                                ? 'bi-chevron-up'
                                : 'bi-chevron-down'
                        } app-header-chevron`}
                    />
                </button>

                {isMenuOpen && (
                    <div className="app-header-dropdown">
                        <div className="app-header-dropdown-profile">
                            <strong>{employee?.employee_name ?? ''}</strong>
                            <span>{employee?.email ?? ''}</span>
                        </div>

                        <div className="app-header-dropdown-divider" />

                        <button
                            type="button"
                            className="app-header-dropdown-item"
                            onClick={() => void handleLogout()}
                        >
                            <i className="bi bi-box-arrow-right" />
                            <span>Keluar</span>
                        </button>
                    </div>
                )}
            </div>
        </header>
    )
}

export default AppHeader
