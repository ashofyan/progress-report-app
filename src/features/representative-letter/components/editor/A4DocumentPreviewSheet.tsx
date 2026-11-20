import type {
    RepresentativeLetterHeader,
    RepresentativeLetterHeaderSummary,
} from '@/features/representative-letter/types/representative-letter.types'

interface A4DocumentPreviewSheetProps {
    openingHtml: string
    closingHtml: string
    pageSize?: 'A4'
    pageOrientation?: 'portrait' | 'landscape'
    marginTop?: number
    marginRight?: number
    marginBottom?: number
    marginLeft?: number
    watermarkEnabled?: boolean
    watermarkOpacity?: number
    watermarkUrl?: string | null
    header?: RepresentativeLetterHeader | RepresentativeLetterHeaderSummary | null
    scale?: number
}

export const A4DocumentPreviewSheet = ({
    openingHtml,
    closingHtml,
    pageOrientation = 'portrait',
    marginTop = 25,
    marginRight = 20,
    marginBottom = 25,
    marginLeft = 20,
    watermarkEnabled = false,
    watermarkOpacity = 0.15,
    watermarkUrl = '',
    header = null,
    scale = 1,
}: A4DocumentPreviewSheetProps) => {
    const isLandscape = pageOrientation === 'landscape'
    const sheetWidth = isLandscape ? '297mm' : '210mm'
    const sheetMinHeight = isLandscape ? '210mm' : '297mm'

    const resolvedHeader = header as (RepresentativeLetterHeader & RepresentativeLetterHeaderSummary) | null | undefined
    const headerImageUrl =
        resolvedHeader?.header?.url ||
        resolvedHeader?.image?.url ||
        resolvedHeader?.header_image_url ||
        resolvedHeader?.image_url

    const footerImageUrl =
        resolvedHeader?.footer?.url ||
        resolvedHeader?.footer_image_url

    const footerText =
        resolvedHeader?.footer?.text ||
        resolvedHeader?.footer_text

    return (
        <div className="a4-preview-container d-flex justify-content-center p-3 bg-secondary-subtle rounded">
            <div
                className="a4-preview-sheet shadow-lg bg-white position-relative"
                style={{
                    width: sheetWidth,
                    minHeight: sheetMinHeight,
                    paddingTop: `${marginTop}mm`,
                    paddingRight: `${marginRight}mm`,
                    paddingBottom: `${marginBottom}mm`,
                    paddingLeft: `${marginLeft}mm`,
                    transform: scale !== 1 ? `scale(${scale})` : undefined,
                    transformOrigin: 'top center',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                {/* Watermark Overlay */}
                {watermarkEnabled && watermarkUrl && (
                    <div
                        className="a4-watermark-overlay position-absolute top-50 start-50 translate-middle pointer-events-none"
                        style={{
                            opacity: watermarkOpacity,
                            zIndex: 0,
                            maxWidth: '60%',
                        }}
                    >
                        <img
                            src={watermarkUrl}
                            alt="Watermark"
                            style={{ width: '100%', objectFit: 'contain' }}
                        />
                    </div>
                )}

                {/* Header Kop Surat */}
                {headerImageUrl && (
                    <div className="a4-header-image mb-3 text-center border-bottom pb-2">
                        <img
                            src={headerImageUrl}
                            alt="Kop Surat"
                            style={{ maxWidth: '100%', maxHeight: '110px', objectFit: 'contain' }}
                        />
                    </div>
                )}

                {/* Content Document Flow */}
                <div className="position-relative" style={{ zIndex: 1 }}>
                    {/* Bagian Pembuka */}
                    <div
                        className="representative-letter-opening-rendered mb-3"
                        style={{ fontSize: '12pt', lineHeight: 1.5 }}
                        dangerouslySetInnerHTML={{
                            __html: openingHtml || '<p><em>(Bagian Pembuka kosong)</em></p>',
                        }}
                    />

                    {/* Format {{index_content}} - Injeksi Progress Report */}
                    <div
                        className="my-3 p-3 rounded"
                        style={{
                            backgroundColor: '#f8fafc',
                            border: '1.5px dashed #3b82f6',
                        }}
                    >
                        <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom">
                            <span className="badge bg-primary px-2 py-1" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                <i className="bi bi-file-earmark-spreadsheet me-1" />
                                {"{{index_content}}"}
                            </span>
                            <span className="text-secondary small fw-medium" style={{ fontSize: '11px' }}>
                                Injeksi Otomatis Konten Rekapitulasi Progress Report
                            </span>
                        </div>

                        {/* Hierarchical preview representation */}
                        <div style={{ fontSize: '10.5pt', color: '#1e293b' }}>
                            <p style={{ margin: '0 0 4px 0' }}>
                                <strong><u>Jasa Audit &amp; Konsultasi Manajemen</u></strong>
                            </p>
                            <ol style={{ margin: '0 0 8px 0', paddingLeft: '22px' }}>
                                <li>
                                    Data Utang &amp; Piutang
                                    <ol type="a" style={{ marginTop: '2px', paddingLeft: '20px' }}>
                                        <li>
                                            Utang Lokal
                                            <p style={{ margin: '2px 0 2px 0', color: '#475569', fontSize: '9.5pt' }}>
                                                Berdasarkan laporan rekening koran dan mutasi kas yang telah diverifikasi...
                                            </p>
                                            <div style={{ margin: '4px 0', fontSize: '9pt', color: '#2563eb' }}>
                                                📎 <span style={{ textDecoration: 'underline' }}>berkas-pendukung.pdf</span>
                                            </div>
                                            {/* Temuan & Saran Box */}
                                            <div
                                                style={{
                                                    margin: '6px 0',
                                                    padding: '6px 10px',
                                                    backgroundColor: '#fffbeb',
                                                    border: '1px solid #fef3c7',
                                                    borderRadius: '4px',
                                                    fontSize: '9pt',
                                                }}
                                            >
                                                <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', color: '#991b1b' }}>
                                                    &bull;&nbsp;Identifikasi Masalah:
                                                </p>
                                                <p style={{ margin: '0 0 4px 10px', color: '#374151' }}>
                                                    Terdapat selisih pencatatan mutasi kas tanggal 14 Maret...
                                                </p>
                                                <p style={{ margin: '2px 0 2px 0', fontWeight: 'bold', color: '#065f46' }}>
                                                    &bull;&nbsp;Saran:
                                                </p>
                                                <p style={{ margin: '0 0 2px 10px', color: '#374151' }}>
                                                    Akan dilakukan konfirmasi fisik dengan pihak bank saat rekonsiliasi.
                                                </p>
                                            </div>
                                        </li>
                                    </ol>
                                </li>
                            </ol>
                        </div>
                    </div>

                    {/* Bagian Penutup */}
                    <div
                        className="representative-letter-closing-rendered mt-3"
                        style={{ fontSize: '12pt', lineHeight: 1.5 }}
                        dangerouslySetInnerHTML={{
                            __html: closingHtml || '<p><em>(Bagian Penutup kosong)</em></p>',
                        }}
                    />
                </div>

                {/* Footer Kop Surat */}
                {footerImageUrl && (
                    <div className="a4-footer-image mt-4 text-center border-top pt-2">
                        <img
                            src={footerImageUrl}
                            alt="Footer Kop Surat"
                            style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }}
                        />
                    </div>
                )}
                {footerText && (
                    <div className="a4-footer-text mt-3 text-center text-muted small border-top pt-2" style={{ fontSize: '9pt' }}>
                        {footerText}
                    </div>
                )}
            </div>
        </div>
    )
}
