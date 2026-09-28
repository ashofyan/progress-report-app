interface RepresentativeLetterDocumentWatermarkProps {
    enabled: boolean
    opacity: number
    width: number
}

const watermarkImage = '/document/als-watermark.jpg'

const RepresentativeLetterDocumentWatermark = ({
                                                  enabled,
                                                  opacity,
                                                  width,
                                              }: RepresentativeLetterDocumentWatermarkProps) => {
    if (!enabled) {
        return null
    }

    return (
        <img
            className="representative-letter-document-watermark"
            src={watermarkImage}
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
