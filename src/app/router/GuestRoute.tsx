import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'

interface GuestRouteProps {
    children: ReactElement
}

const GuestRoute = ({
                        children,
                    }: GuestRouteProps) => {
    const {
        isAuthenticated,
        isInitializing,
    } = useAuth()

    if (isInitializing) {
        return null
    }

    if (isAuthenticated) {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        )
    }

    return children
}

export default GuestRoute
