import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/app/App'
import AppProviders from '@/app/providers/AppProviders'

import '@/styles/main.scss'

const rootElement = document.getElementById('root')

if (rootElement === null) {
    throw new Error('Root element not found.')
}

createRoot(rootElement).render(
    <StrictMode>
        <AppProviders>
            <App />
        </AppProviders>
    </StrictMode>,
)
