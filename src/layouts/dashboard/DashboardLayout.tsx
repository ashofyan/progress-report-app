import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import AppHeader from '@/layouts/dashboard/components/AppHeader'
import AppSidebar from '@/layouts/dashboard/components/AppSidebar'

import '@/layouts/dashboard/styles/dashboard-layout.scss'

const DashboardLayout = () => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false)
    const location = useLocation()
    const [prevPathname, setPrevPathname] = useState<string>(location.pathname)

    if (prevPathname !== location.pathname) {
        setPrevPathname(location.pathname)
        setIsMobileSidebarOpen(false)
    }

    const handleToggleMobileSidebar = (): void => {
        setIsMobileSidebarOpen((previous) => !previous)
    }

    const handleCloseMobileSidebar = (): void => {
        setIsMobileSidebarOpen(false)
    }

    return (
        <div className="dashboard-layout">
            <AppHeader onToggleSidebar={handleToggleMobileSidebar} />

            <div className="dashboard-body">
                <div
                    className={`app-sidebar-backdrop ${
                        isMobileSidebarOpen ? 'show' : ''
                    }`}
                    onClick={handleCloseMobileSidebar}
                    aria-hidden="true"
                />

                <AppSidebar
                    isOpen={isMobileSidebarOpen}
                    onClose={handleCloseMobileSidebar}
                />

                <main className="dashboard-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
