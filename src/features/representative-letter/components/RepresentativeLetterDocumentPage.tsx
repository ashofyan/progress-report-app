import type { Editor } from '@tiptap/react'
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
    editor: Editor | null
    settings: RepresentativeLetterDocumentSettings
}

const RepresentativeLetterDocumentPage = ({
    header,
    editor,
    settings,
}: RepresentativeLetterDocumentPageProps) => {
    const pageClassName =
        settings.page.orientation === 'landscape'
            ? 'representative-letter-page landscape'
            : 'representative-letter-page portrait'

    const footerImageUrl = header?.footer_image_url || settings.header_footer?.footer_image_url
    const footerText = header?.footer_text || settings.header_footer?.footer_text
    const footerType = header?.footer_type || settings.header_footer?.footer_type || 'image'

    return (
        <div className={pageClassName}>
            <RepresentativeLetterDocumentWatermark
                enabled={settings.watermark.enabled}
                opacity={settings.watermark.opacity}
                width={settings.watermark.width}
                imageUrl={settings.watermark.image_url}
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
                    editor={editor}
                />
            </div>

            <RepresentativeLetterDocumentFooter
                enabled={settings.footer.enabled}
                footerImageUrl={footerImageUrl}
                footerText={footerText}
                footerType={footerType}
            />
        </div>
    )
}

export default RepresentativeLetterDocumentPage
