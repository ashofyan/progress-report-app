import type {
    RepresentativeLetterHeaderSummary,
} from '@/features/representative-letter/types/representative-letter.types'

interface RepresentativeLetterDocumentHeaderProps {
    header: RepresentativeLetterHeaderSummary | null
    enabled: boolean
}

const RepresentativeLetterDocumentHeader = ({
                                                header,
                                                enabled,
                                            }: RepresentativeLetterDocumentHeaderProps) => {
    if (!enabled || header === null) {
        return <div className="representative-letter-document-header empty" />
    }

    return (
        <div className="representative-letter-document-header">
            <img
                src={header.image_url}
                alt={header.name}
            />
        </div>
    )
}

export default RepresentativeLetterDocumentHeader
