import { useContext } from 'react'

import { AuthContext } from '@/features/auth/context/AuthContext'

import type {
    AuthContextValue,
} from '@/features/auth/types/auth.types'

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext)

    if (context === null) {
        throw new Error(
            'useAuth harus digunakan di dalam AuthProvider.',
        )
    }

    return context
}
