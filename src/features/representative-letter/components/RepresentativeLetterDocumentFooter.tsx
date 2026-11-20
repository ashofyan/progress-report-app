interface RepresentativeLetterDocumentFooterProps {
    enabled: boolean
    footerImageUrl?: string | null
    footerText?: string | null
    footerType?: 'image' | 'text' | 'both' | 'none'
}

const defaultFooterImage = '/document/als-footer.jpg'

const RepresentativeLetterDocumentFooter = ({
    enabled,
    footerImageUrl,
    footerText,
    footerType = 'image',
}: RepresentativeLetterDocumentFooterProps) => {
    if (!enabled || footerType === 'none') {
        return <div className="representative-letter-document-footer empty" />
    }

    const imageSrc = footerImageUrl && footerImageUrl.trim() !== '' ? footerImageUrl : defaultFooterImage

    return (
        <div className="representative-letter-document-footer">
            {(footerType === 'image' || footerType === 'both') && (
                <img
                    src={imageSrc}
                    alt="Footer Kop Dokumen"
                    className="footer-kop-image"
                />
            )}
            {(footerType === 'text' || footerType === 'both') && footerText && (
                <div className="footer-kop-text text-muted small text-center mt-1">
                    {footerText}
                </div>
            )}
        </div>
    )
}

export default RepresentativeLetterDocumentFooter
