interface RepresentativeLetterDocumentFooterProps {
    enabled: boolean
}

const footerImage = '/document/als-footer.jpg'

const RepresentativeLetterDocumentFooter = ({
                                                enabled,
                                            }: RepresentativeLetterDocumentFooterProps) => {
    if (!enabled) {
        return <div className="representative-letter-document-footer empty" />
    }

    return (
        <div className="representative-letter-document-footer">
            <img
                src={footerImage}
                alt="Trusted Growth Partner"
            />
        </div>
    )
}

export default RepresentativeLetterDocumentFooter
