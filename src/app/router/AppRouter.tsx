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
import DailyProgressCorrectionPage from '@/features/daily-progress/pages/DailyProgressCorrectionPage'
import DailyProgressCreatePage from '@/features/daily-progress/pages/DailyProgressCreatePage'
import DailyProgressEditPage from '@/features/daily-progress/pages/DailyProgressEditPage'
import DailyProgressPage from '@/features/daily-progress/pages/DailyProgressPage'
import MasterJobPage from '@/features/master-job/pages/MasterJobPage'
import ProgressReportCreatePage from '@/features/progress-report/pages/ProgressReportCreatePage'
import ProgressReportDetailPage from '@/features/progress-report/pages/ProgressReportDetailPage'
import ProgressReportPage from '@/features/progress-report/pages/ProgressReportPage'
import RepresentativeLetterCreatePage from '@/features/representative-letter/pages/RepresentativeLetterCreatePage'
import RepresentativeLetterEditorPage from '@/features/representative-letter/pages/RepresentativeLetterEditorPage'
import RepresentativeLetterHeaderListPage from '@/features/representative-letter/pages/RepresentativeLetterHeaderListPage'
import RepresentativeLetterListPage from '@/features/representative-letter/pages/RepresentativeLetterListPage'
import SolusiFormPage from '@/features/solusi/pages/SolusiFormPage'
import TemuanFormPage from '@/features/temuan/pages/TemuanFormPage'
import TemuanPage from '@/features/temuan/pages/TemuanPage'

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
                        path="/daily-progress/:id/edit-form"
                        element={<DailyProgressCorrectionPage />}
                    />

                    <Route
                        path="/daily-progress/:id/koreksi"
                        element={<DailyProgressCorrectionPage />}
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
                        path="/progress-report/:id"
                        element={<ProgressReportDetailPage />}
                    />

                    <Route
                        path="/temuan"
                        element={<TemuanPage />}
                    />

                    <Route
                        path="/temuan/tambah"
                        element={<TemuanFormPage />}
                    />

                    <Route
                        path="/temuan/:id/edit"
                        element={<TemuanFormPage />}
                    />

                    <Route
                        path="/solusi"
                        element={<Navigate to="/temuan" replace />}
                    />

                    <Route
                        path="/solusi/tambah"
                        element={<SolusiFormPage />}
                    />

                    <Route
                        path="/solusi/:id/edit"
                        element={<SolusiFormPage />}
                    />

                    <Route
                        path="/representative-letter"
                        element={<RepresentativeLetterListPage />}
                    />

                    <Route
                        path="/representative-letter/create"
                        element={<RepresentativeLetterCreatePage />}
                    />

                    <Route
                        path="/representative-letter/header"
                        element={<RepresentativeLetterHeaderListPage />}
                    />

                    <Route
                        path="/representative-letter/:id"
                        element={<RepresentativeLetterEditorPage />}
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
