import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (fontSize: string) => ReturnType
            unsetFontSize: () => ReturnType
        }
        lineHeight: {
            setLineHeight: (lineHeight: string) => ReturnType
            unsetLineHeight: () => ReturnType
        }
    }
}

export const FontSize = Extension.create({
    name: 'fontSize',

    addOptions() {
        return {
            types: ['textStyle'],
        }
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element: HTMLElement) =>
                            element.style.fontSize?.replace(/['"]+/g, '') || null,
                        renderHTML: (attributes: { fontSize?: string | null }) => {
                            if (!attributes.fontSize) {
                                return {}
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            }
                        },
                    },
                },
            },
        ]
    },

    addCommands() {
        return {
            setFontSize:
                (fontSize: string) =>
                ({ chain }) => {
                    return chain().setMark('textStyle', { fontSize }).run()
                },
            unsetFontSize:
                () =>
                ({ chain }) => {
                    return chain()
                        .setMark('textStyle', { fontSize: null })
                        .removeEmptyTextStyle()
                        .run()
                },
        }
    },
})

export const LineHeight = Extension.create({
    name: 'lineHeight',

    addOptions() {
        return {
            types: ['paragraph', 'heading'],
        }
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    lineHeight: {
                        default: null,
                        parseHTML: (element: HTMLElement) =>
                            element.style.lineHeight || null,
                        renderHTML: (attributes: { lineHeight?: string | null }) => {
                            if (!attributes.lineHeight) {
                                return {}
                            }
                            return {
                                style: `line-height: ${attributes.lineHeight}`,
                            }
                        },
                    },
                },
            },
        ]
    },

    addCommands() {
        return {
            setLineHeight:
                (lineHeight: string) =>
                ({ chain }) => {
                    return chain()
                        .updateAttributes('paragraph', { lineHeight })
                        .updateAttributes('heading', { lineHeight })
                        .run()
                },
            unsetLineHeight:
                () =>
                ({ chain }) => {
                    return chain()
                        .resetAttributes('paragraph', 'lineHeight')
                        .resetAttributes('heading', 'lineHeight')
                        .run()
                },
        }
    },
})

import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ResizableImageComponent from '@/features/representative-letter/components/editor/ResizableImageComponent'

export const ResizableImage = Image.extend({
    name: 'image',

    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '100%',
                parseHTML: (element) => element.getAttribute('width') || element.style.width || '100%',
                renderHTML: (attributes) => {
                    if (!attributes.width) return {}
                    return {
                        width: attributes.width,
                        style: `width: ${attributes.width}`,
                    }
                },
            },
            height: {
                default: 'auto',
                parseHTML: (element) => element.getAttribute('height') || element.style.height || 'auto',
                renderHTML: (attributes) => {
                    if (!attributes.height || attributes.height === 'auto') return {}
                    return {
                        height: attributes.height,
                    }
                },
            },
            alignment: {
                default: 'center',
                parseHTML: (element) => element.getAttribute('data-alignment') || 'center',
                renderHTML: (attributes) => {
                    return {
                        'data-alignment': attributes.alignment || 'center',
                    }
                },
            },
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageComponent)
    },
})
