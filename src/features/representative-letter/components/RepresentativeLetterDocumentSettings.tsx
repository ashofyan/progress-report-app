import type {
    RepresentativeLetterDocumentSettings as DocumentSettings,
} from '@/features/representative-letter/types/representative-letter.types'

interface RepresentativeLetterDocumentSettingsProps {
    settings: DocumentSettings
    onChange: (settings: DocumentSettings) => void
}

const RepresentativeLetterDocumentSettings = ({
                                                  settings,
                                                  onChange,
                                              }: RepresentativeLetterDocumentSettingsProps) => {
    const update = (
        nextSettings: DocumentSettings,
    ): void => {
        onChange(nextSettings)
    }

    const updatePageNumber = (
        key:
            | 'margin_top'
            | 'margin_right'
            | 'margin_bottom'
            | 'margin_left',
        value: string,
    ): void => {
        update({
            ...settings,
            page: {
                ...settings.page,
                [key]: Math.max(0, Number(value)),
            },
        })
    }

    return (
        <aside className="representative-letter-settings">
            <div className="representative-letter-settings-section">
                <h2>Page</h2>

                <label className="form-label">
                    Size
                    <select
                        className="form-select"
                        value={settings.page.size}
                        disabled
                    >
                        <option value="A4">A4</option>
                    </select>
                </label>

                <label className="form-label">
                    Orientation
                    <select
                        className="form-select"
                        value={settings.page.orientation}
                        onChange={(event) =>
                            update({
                                ...settings,
                                page: {
                                    ...settings.page,
                                    orientation:
                                        event.target.value ===
                                        'landscape'
                                            ? 'landscape'
                                            : 'portrait',
                                },
                            })
                        }
                    >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </label>

                <div className="representative-letter-margin-grid">
                    <label className="form-label">
                        Top (mm)
                        <input
                            type="number"
                            min="0"
                            className="form-control"
                            value={settings.page.margin_top}
                            onChange={(event) =>
                                updatePageNumber(
                                    'margin_top',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label className="form-label">
                        Right (mm)
                        <input
                            type="number"
                            min="0"
                            className="form-control"
                            value={settings.page.margin_right}
                            onChange={(event) =>
                                updatePageNumber(
                                    'margin_right',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label className="form-label">
                        Bottom (mm)
                        <input
                            type="number"
                            min="0"
                            className="form-control"
                            value={settings.page.margin_bottom}
                            onChange={(event) =>
                                updatePageNumber(
                                    'margin_bottom',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label className="form-label">
                        Left (mm)
                        <input
                            type="number"
                            min="0"
                            className="form-control"
                            value={settings.page.margin_left}
                            onChange={(event) =>
                                updatePageNumber(
                                    'margin_left',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                </div>
            </div>

            <div className="representative-letter-settings-section">
                <h2>Header</h2>
                <label className="form-check form-switch">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={settings.header.enabled}
                        onChange={(event) =>
                            update({
                                ...settings,
                                header: {
                                    enabled: event.target.checked,
                                },
                            })
                        }
                    />
                    <span className="form-check-label">
                        Tampilkan Header
                    </span>
                </label>
            </div>

            <div className="representative-letter-settings-section">
                <h2>Footer</h2>
                <label className="form-check form-switch">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={settings.footer.enabled}
                        onChange={(event) =>
                            update({
                                ...settings,
                                footer: {
                                    enabled: event.target.checked,
                                },
                            })
                        }
                    />
                    <span className="form-check-label">
                        Tampilkan Footer
                    </span>
                </label>
            </div>

            <div className="representative-letter-settings-section">
                <h2>Watermark</h2>
                <label className="form-check form-switch">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={settings.watermark.enabled}
                        onChange={(event) =>
                            update({
                                ...settings,
                                watermark: {
                                    ...settings.watermark,
                                    enabled: event.target.checked,
                                },
                            })
                        }
                    />
                    <span className="form-check-label">
                        Tampilkan Watermark
                    </span>
                </label>

                <label className="form-label">
                    Opacity
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={settings.watermark.opacity}
                        onChange={(event) =>
                            update({
                                ...settings,
                                watermark: {
                                    ...settings.watermark,
                                    opacity: Number(
                                        event.target.value,
                                    ),
                                },
                            })
                        }
                    />
                    <span className="representative-letter-range-value">
                        {settings.watermark.opacity.toFixed(2)}
                    </span>
                </label>

                <label className="form-label">
                    Width (mm)
                    <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={settings.watermark.width}
                        onChange={(event) =>
                            update({
                                ...settings,
                                watermark: {
                                    ...settings.watermark,
                                    width: Math.max(
                                        1,
                                        Number(event.target.value),
                                    ),
                                },
                            })
                        }
                    />
                </label>
            </div>
        </aside>
    )
}

export default RepresentativeLetterDocumentSettings
