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
import DailyProgressDetailPage from '@/features/daily-progress/pages/DailyProgressDetailPage'
import DailyProgressEditPage from '@/features/daily-progress/pages/DailyProgressEditPage'
import DailyProgressPage from '@/features/daily-progress/pages/DailyProgressPage'
import MasterJobPage from '@/features/master-job/pages/MasterJobPage'
import NoteCreatePage from '@/features/notes/pages/NoteCreatePage'
import NoteDetailPage from '@/features/notes/pages/NoteDetailPage'
import NotesListPage from '@/features/notes/pages/NotesListPage'
import NotulenCreatePage from '@/features/notes/pages/NotulenCreatePage'
import NotulenDetailPage from '@/features/notes/pages/NotulenDetailPage'
import NotulenListPage from '@/features/notes/pages/NotulenListPage'
import ProgressReportCreatePage from '@/features/progress-report/pages/ProgressReportCreatePage'
import ProgressReportDetailPage from '@/features/progress-report/pages/ProgressReportDetailPage'
import ProgressReportEditPage from '@/features/progress-report/pages/ProgressReportEditPage'
import ProgressReportPage from '@/features/progress-report/pages/ProgressReportPage'
import RepresentativeLetterCreatePage from '@/features/representative-letter/pages/RepresentativeLetterCreatePage'
import RepresentativeLetterEditorPage from '@/features/representative-letter/pages/RepresentativeLetterEditorPage'
import RepresentativeLetterHeaderListPage from '@/features/representative-letter/pages/RepresentativeLetterHeaderListPage'
import RepresentativeLetterListPage from '@/features/representative-letter/pages/RepresentativeLetterListPage'
import SolusiFormPage from '@/features/solusi/pages/SolusiFormPage'
import TemuanFormPage from '@/features/temuan/pages/TemuanFormPage'
import TemuanPage from '@/features/temuan/pages/TemuanPage'

import UnderDevelopmentPage from '@/shared/components/UnderDevelopmentPage'

import DashboardLayout from '@/layouts/dashboard/DashboardLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'

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
                        path="/progress-report/:id/edit"
                        element={<ProgressReportEditPage />}
                    />

                    <Route
                        path="/dashboard"
                        element={<DashboardPage />}
                    />

                    <Route
                        path="/master-data/pekerjaan"
                        element={<MasterJobPage />}
                    />

                    <Route
                        path="/master-data/custom-pekerjaan"
                        element={<AdditionalTaskPage defaultType="custom" />}
                    />

                    <Route
                        path="/master-data/custom-pekerjaan/tambah"
                        element={<AdditionalTaskCreatePage defaultType="custom" />}
                    />

                    <Route
                        path="/data-legalitas"
                        element={<UnderDevelopmentPage title="Data Perusahaan" />}
                    />

                    <Route
                        path="/legalitas"
                        element={<Navigate to="/data-legalitas" replace />}
                    />

                    <Route
                        path="/pekerjaan-tambahan"
                        element={<AdditionalTaskPage defaultType="tambahan" />}
                    />

                    <Route
                        path="/pekerjaan-tambahan/tambah"
                        element={<AdditionalTaskCreatePage defaultType="tambahan" />}
                    />

                    <Route
                        path="/master-data/task"
                        element={<Navigate to="/pekerjaan-tambahan" replace />}
                    />

                    <Route
                        path="/master-data/task/tambah"
                        element={<Navigate to="/pekerjaan-tambahan/tambah" replace />}
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
                        path="/daily-progress/create"
                        element={<DailyProgressCreatePage />}
                    />

                    <Route
                        path="/daily-progress/:id"
                        element={<DailyProgressDetailPage />}
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
                        path="/progress-report/create"
                        element={<ProgressReportCreatePage />}
                    />

                    <Route
                        path="/progress-report/:id"
                        element={<ProgressReportDetailPage />}
                    />

                    <Route
                        path="/progress-report/:id/edit"
                        element={<ProgressReportEditPage />}
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

                    {/* Tools - Notes */}
                    <Route
                        path="/notes"
                        element={<NotesListPage />}
                    />

                    <Route
                        path="/notes/tambah"
                        element={<NoteCreatePage />}
                    />

                    <Route
                        path="/notes/create"
                        element={<Navigate to="/notes/tambah" replace />}
                    />

                    <Route
                        path="/notes/:id"
                        element={<NoteDetailPage />}
                    />

                    {/* Tools - Notulen */}
                    <Route
                        path="/notulen"
                        element={<NotulenListPage />}
                    />

                    <Route
                        path="/notulen/tambah"
                        element={<NotulenCreatePage />}
                    />

                    <Route
                        path="/notulen/create"
                        element={<Navigate to="/notulen/tambah" replace />}
                    />

                    <Route
                        path="/notulen/:id"
                        element={<NotulenDetailPage />}
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
