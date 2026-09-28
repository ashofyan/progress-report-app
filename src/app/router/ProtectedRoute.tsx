import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'

interface ProtectedRouteProps {
    children: ReactElement
}

const ProtectedRoute = ({
                            children,
                        }: ProtectedRouteProps) => {
    const {
        isAuthenticated,
        isInitializing,
    } = useAuth()

    if (isInitializing) {
        return (
            <div
                className="
          d-flex
          justify-content-center
          align-items-center
          min-vh-100
        "
            >
                <div
                    className="spinner-border"
                    role="status"
                >
          <span className="visually-hidden">
            Loading...
          </span>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                replace
            />
        )
    }

    return children
}

export default ProtectedRoute
