import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'

export const ResizableImageComponent = ({
    node,
    updateAttributes,
    selected,
    editor,
}: NodeViewProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const imgRef = useRef<HTMLImageElement>(null)
    const [isResizing, setIsResizing] = useState(false)
    const [resizeDirection, setResizeDirection] = useState<string | null>(null)
    const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

    const width = node.attrs.width || '100%'
    const alignment = node.attrs.alignment || 'center'
    const isEditable = editor.isEditable

    // Handle Quick Alignment
    const handleSetAlignment = useCallback(
        (align: 'left' | 'center' | 'right') => {
            updateAttributes({ alignment: align })
        },
        [updateAttributes],
    )

    // Handle Preset Widths
    const handleSetPresetWidth = useCallback(
        (presetWidth: string) => {
            updateAttributes({ width: presetWidth, height: 'auto' })
        },
        [updateAttributes],
    )

    // Handle Delete Image
    const handleDelete = useCallback(() => {
        editor.commands.deleteSelection()
    }, [editor])

    // Drag to Resize Handlers
    const handleMouseDown = useCallback(
        (direction: string, e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (!isEditable) return

            const imgEl = imgRef.current
            if (!imgEl) return

            const rect = imgEl.getBoundingClientRect()
            startPosRef.current = {
                x: e.clientX,
                y: e.clientY,
                width: rect.width,
                height: rect.height,
            }

            setIsResizing(true)
            setResizeDirection(direction)
        },
        [isEditable],
    )

    useEffect(() => {
        if (!isResizing) return

        const handleMouseMove = (e: MouseEvent) => {
            const { x: startX, width: startWidth } = startPosRef.current
            let diffX = e.clientX - startX

            if (resizeDirection === 'w' || resizeDirection === 'nw' || resizeDirection === 'sw') {
                diffX = -diffX
            }

            // Container max boundary
            const parentWidth = containerRef.current?.parentElement?.clientWidth || 800
            const newWidth = Math.max(80, Math.min(parentWidth, startWidth + diffX))
            const widthPercent = Math.round((newWidth / parentWidth) * 100)

            // Prefer percentage if within 10-100%
            const finalWidth = widthPercent >= 98 ? '100%' : `${widthPercent}%`
            updateAttributes({ width: finalWidth, height: 'auto' })
        }

        const handleMouseUp = () => {
            setIsResizing(false)
            setResizeDirection(null)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isResizing, resizeDirection, updateAttributes])

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent:
            alignment === 'left'
                ? 'flex-start'
                : alignment === 'right'
                  ? 'flex-end'
                  : 'center',
        margin: '12px 0',
        width: '100%',
        clear: 'both',
    }

    return (
        <NodeViewWrapper
            ref={containerRef}
            className={`resizable-image-wrapper alignment-${alignment}`}
            style={containerStyle}
        >
            <div
                className={`resizable-image-box ${selected ? 'is-selected' : ''} ${
                    isResizing ? 'is-resizing' : ''
                }`}
                style={{ width: width, maxWidth: '100%' }}
            >
                {/* Image Element */}
                <img
                    ref={imgRef}
                    src={node.attrs.src}
                    alt={node.attrs.alt || ''}
                    title={node.attrs.title || ''}
                    className="resizable-image-element"
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                    }}
                />

                {/* Interactive Drag Handles & Quick Toolbar when Selected & Editable */}
                {isEditable && selected && (
                    <>
                        {/* Drag Corner Handles */}
                        <div
                            className="image-resize-handle handle-nw"
                            onMouseDown={(e) => handleMouseDown('nw', e)}
                        />
                        <div
                            className="image-resize-handle handle-ne"
                            onMouseDown={(e) => handleMouseDown('ne', e)}
                        />
                        <div
                            className="image-resize-handle handle-se"
                            onMouseDown={(e) => handleMouseDown('se', e)}
                        />
                        <div
                            className="image-resize-handle handle-sw"
                            onMouseDown={(e) => handleMouseDown('sw', e)}
                        />

                        {/* Drag Side Handles */}
                        <div
                            className="image-resize-handle handle-e"
                            onMouseDown={(e) => handleMouseDown('e', e)}
                        />
                        <div
                            className="image-resize-handle handle-w"
                            onMouseDown={(e) => handleMouseDown('w', e)}
                        />

                        {/* Floating Quick Action Toolbar (Preset Size & Alignment) */}
                        <div
                            className="image-floating-toolbar"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {/* Alignment Group */}
                            <div className="btn-group btn-group-sm">
                                <button
                                    type="button"
                                    className={`btn btn-light ${alignment === 'left' ? 'active text-primary fw-bold' : ''}`}
                                    onClick={() => handleSetAlignment('left')}
                                    title="Rata Kiri"
                                >
                                    <i className="bi bi-text-left" />
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-light ${alignment === 'center' ? 'active text-primary fw-bold' : ''}`}
                                    onClick={() => handleSetAlignment('center')}
                                    title="Rata Tengah"
                                >
                                    <i className="bi bi-text-center" />
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-light ${alignment === 'right' ? 'active text-primary fw-bold' : ''}`}
                                    onClick={() => handleSetAlignment('right')}
                                    title="Rata Kanan"
                                >
                                    <i className="bi bi-text-right" />
                                </button>
                            </div>

                            <span className="toolbar-divider" />

                            {/* Preset Width Group */}
                            <div className="btn-group btn-group-sm">
                                <button
                                    type="button"
                                    className={`btn btn-light ${width === '25%' ? 'active text-primary fw-bold' : ''}`}
                                    onClick={() => handleSetPresetWidth('25%')}
                                    title="Ukuran 25%"
                                >
                                    25%
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-light ${width === '50%' ? 'active text-primary fw-bold' : ''}`}
                                    onClick={() => handleSetPresetWidth('50%')}
                                    title="Ukuran 50%"
                                >
                                    50%
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-light ${width === '75%' ? 'active text-primary fw-bold' : ''}`}
                                    onClick={() => handleSetPresetWidth('75%')}
                                    title="Ukuran 75%"
                                >
                                    75%
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-light ${width === '100%' ? 'active text-primary fw-bold' : ''}`}
                                    onClick={() => handleSetPresetWidth('100%')}
                                    title="Ukuran 100% (Penuh)"
                                >
                                    100%
                                </button>
                            </div>

                            <span className="toolbar-divider" />

                            {/* Delete Button */}
                            <button
                                type="button"
                                className="btn btn-light text-danger btn-sm"
                                onClick={handleDelete}
                                title="Hapus Gambar"
                            >
                                <i className="bi bi-trash" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </NodeViewWrapper>
    )
}
export default ResizableImageComponent
