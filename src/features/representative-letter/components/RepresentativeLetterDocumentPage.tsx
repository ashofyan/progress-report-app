import RepresentativeLetterContentEditor from '@/features/representative-letter/components/RepresentativeLetterContentEditor'
import RepresentativeLetterDocumentFooter from '@/features/representative-letter/components/RepresentativeLetterDocumentFooter'
import RepresentativeLetterDocumentHeader from '@/features/representative-letter/components/RepresentativeLetterDocumentHeader'
import RepresentativeLetterDocumentWatermark from '@/features/representative-letter/components/RepresentativeLetterDocumentWatermark'
import type {
    RepresentativeLetterDocumentSettings,
    RepresentativeLetterHeaderSummary,
} from '@/features/representative-letter/types/representative-letter.types'

interface RepresentativeLetterDocumentPageProps {
    header: RepresentativeLetterHeaderSummary | null
    content: string
    settings: RepresentativeLetterDocumentSettings
    onContentChange: (value: string) => void
}

const RepresentativeLetterDocumentPage = ({
                                              header,
                                              content,
                                              settings,
                                              onContentChange,
                                          }: RepresentativeLetterDocumentPageProps) => {
    const pageClassName =
        settings.page.orientation === 'landscape'
            ? 'representative-letter-page landscape'
            : 'representative-letter-page portrait'

    return (
        <div className={pageClassName}>
            <RepresentativeLetterDocumentWatermark
                enabled={settings.watermark.enabled}
                opacity={settings.watermark.opacity}
                width={settings.watermark.width}
            />

            <RepresentativeLetterDocumentHeader
                header={header}
                enabled={settings.header.enabled}
            />

            <div
                className="representative-letter-body"
                style={{
                    paddingTop: `${settings.page.margin_top}mm`,
                    paddingRight: `${settings.page.margin_right}mm`,
                    paddingBottom: `${settings.page.margin_bottom}mm`,
                    paddingLeft: `${settings.page.margin_left}mm`,
                }}
            >
                <RepresentativeLetterContentEditor
                    value={content}
                    onChange={onContentChange}
                />
            </div>

            <RepresentativeLetterDocumentFooter
                enabled={settings.footer.enabled}
            />
        </div>
    )
}

export default RepresentativeLetterDocumentPage
