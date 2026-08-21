import type { ReactNode } from 'react'

import { AuthProvider } from '@/features/auth/providers/AuthProvider'

interface AppProvidersProps {
    children: ReactNode
}

const AppProviders = ({
                          children,
                      }: AppProvidersProps) => {
    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    )
}

export default AppProviders
