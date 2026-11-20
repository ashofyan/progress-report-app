interface RepresentativeLetterDocumentWatermarkProps {
    enabled: boolean
    opacity: number
    width: number
    imageUrl?: string | null
}

const defaultWatermarkImage = '/document/als-watermark.jpg'

const RepresentativeLetterDocumentWatermark = ({
                                                  enabled,
                                                  opacity,
                                                  width,
                                                  imageUrl,
                                              }: RepresentativeLetterDocumentWatermarkProps) => {
    if (!enabled) {
        return null
    }

    const src = (imageUrl && imageUrl.trim() !== '') ? imageUrl : defaultWatermarkImage

    return (
        <img
            className="representative-letter-document-watermark"
            src={src}
            alt=""
            aria-hidden="true"
            style={{
                opacity,
                width: `${width}mm`,
            }}
        />
    )
}

export default RepresentativeLetterDocumentWatermark
