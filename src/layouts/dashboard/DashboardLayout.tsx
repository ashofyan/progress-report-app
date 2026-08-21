import { Outlet } from 'react-router-dom'

import AppHeader from '@/layouts/dashboard/components/AppHeader'
import AppSidebar from '@/layouts/dashboard/components/AppSidebar'

import '@/layouts/dashboard/styles/dashboard-layout.scss'

const DashboardLayout = () => {
    return (
        <div className="dashboard-layout">
            <AppHeader />

            <div className="dashboard-body">
                <AppSidebar />

                <main className="dashboard-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
