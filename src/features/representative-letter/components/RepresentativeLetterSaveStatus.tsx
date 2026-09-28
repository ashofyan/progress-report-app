import type {
    RepresentativeLetterSaveState,
} from '@/features/representative-letter/types/representative-letter.types'

interface RepresentativeLetterSaveStatusProps {
    state: RepresentativeLetterSaveState
}

const labels: Record<RepresentativeLetterSaveState, string> = {
    saved: 'Saved',
    saving: 'Saving...',
    unsaved: 'Unsaved',
    failed: 'Save Failed',
}

const icons: Record<RepresentativeLetterSaveState, string> = {
    saved: 'bi-check-circle',
    saving: 'bi-arrow-repeat',
    unsaved: 'bi-dot',
    failed: 'bi-exclamation-circle',
}

const RepresentativeLetterSaveStatus = ({
                                            state,
                                        }: RepresentativeLetterSaveStatusProps) => {
    return (
        <span
            className={`representative-letter-save-status ${state}`}
        >
            <i className={`bi ${icons[state]}`} />
            {labels[state]}
        </span>
    )
}

export default RepresentativeLetterSaveStatus
