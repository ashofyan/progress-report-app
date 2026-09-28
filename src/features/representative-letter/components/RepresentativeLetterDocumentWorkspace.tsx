import RepresentativeLetterDocumentPage from '@/features/representative-letter/components/RepresentativeLetterDocumentPage'
import RepresentativeLetterDocumentSettings from '@/features/representative-letter/components/RepresentativeLetterDocumentSettings'
import type {
    RepresentativeLetter,
    RepresentativeLetterDocumentSettings as DocumentSettings,
} from '@/features/representative-letter/types/representative-letter.types'

interface RepresentativeLetterDocumentWorkspaceProps {
    letter: RepresentativeLetter
    content: string
    settings: DocumentSettings
    onContentChange: (value: string) => void
    onSettingsChange: (settings: DocumentSettings) => void
}

const RepresentativeLetterDocumentWorkspace = ({
                                                   letter,
                                                   content,
                                                   settings,
                                                   onContentChange,
                                                   onSettingsChange,
                                               }: RepresentativeLetterDocumentWorkspaceProps) => {
    return (
        <div className="representative-letter-workspace">
            <div className="representative-letter-paper-scroll">
                {letter.header === null &&
                    settings.header.enabled && (
                        <div className="representative-letter-warning">
                            Representative Letter ini belum memiliki header kop surat.
                        </div>
                    )}

                <RepresentativeLetterDocumentPage
                    header={letter.header}
                    content={content}
                    settings={settings}
                    onContentChange={onContentChange}
                />
            </div>

            <RepresentativeLetterDocumentSettings
                settings={settings}
                onChange={onSettingsChange}
            />
        </div>
    )
}

export default RepresentativeLetterDocumentWorkspace
