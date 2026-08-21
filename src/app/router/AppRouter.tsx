import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from 'react-router-dom'

import GuestRoute from '@/app/router/GuestRoute'
import ProtectedRoute from '@/app/router/ProtectedRoute'

import LoginPage from '@/features/auth/pages/LoginPage'
import AdditionalTaskCreatePage from '@/features/additional-task/pages/AdditionalTaskCreatePage'
import AdditionalTaskPage from '@/features/additional-task/pages/AdditionalTaskPage'
import DailyProgressCreatePage from '@/features/daily-progress/pages/DailyProgressCreatePage'
import DailyProgressEditPage from '@/features/daily-progress/pages/DailyProgressEditPage'
import DailyProgressPage from '@/features/daily-progress/pages/DailyProgressPage'
import MasterJobPage from '@/features/master-job/pages/MasterJobPage'
import ProgressReportCreatePage from '@/features/progress-report/pages/ProgressReportCreatePage'
import ProgressReportPage from '@/features/progress-report/pages/ProgressReportPage'

import DashboardLayout from '@/layouts/dashboard/DashboardLayout'
import UnderDevelopmentPage from '@/shared/components/UnderDevelopmentPage'

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <GuestRoute>
                            <LoginPage />
                        </GuestRoute>
                    }
                />

                <Route
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path="/"
                        element={
                            <Navigate
                                to="/master-data/pekerjaan"
                                replace
                            />
                        }
                    />

                    <Route
                        path="/dashboard"
                        element={
                            <UnderDevelopmentPage title="Dashboard" />
                        }
                    />

                    <Route
                        path="/master-data/pekerjaan"
                        element={<MasterJobPage />}
                    />

                    <Route
                        path="/master-data/task"
                        element={<AdditionalTaskPage />}
                    />

                    <Route
                        path="/master-data/task/tambah"
                        element={<AdditionalTaskCreatePage />}
                    />

                    <Route
                        path="/daily-progress"
                        element={<DailyProgressPage />}
                    />

                    <Route
                        path="/daily-progress/tambah"
                        element={<DailyProgressCreatePage />}
                    />

                    <Route
                        path="/daily-progress/:id/edit"
                        element={<DailyProgressEditPage />}
                    />

                    <Route
                        path="/progress-report"
                        element={<ProgressReportPage />}
                    />

                    <Route
                        path="/progress-report/tambah"
                        element={<ProgressReportCreatePage />}
                    />

                    <Route
                        path="/representative-letter"
                        element={
                            <UnderDevelopmentPage title="Representative Letter" />
                        }
                    />
                </Route>

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/master-data/pekerjaan"
                            replace
                        />
                    }
                />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRouter
