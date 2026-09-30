import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from 'react'

import type { KaryawanItem } from '@/features/notes/types/karyawan.types'

interface KaryawanSelectProps {
    karyawanList: KaryawanItem[]
    selectedCode?: string
    isLoading: boolean
    errorMessage: string | null
    disabled?: boolean
    placeholder?: string
    onSearch?: (query: string) => void
    onSelect: (karyawan: KaryawanItem) => void
}

export const KaryawanSelect = ({
    karyawanList,
    selectedCode = '',
    isLoading,
    errorMessage,
    disabled = false,
    placeholder = 'Pilih Karyawan...',
    onSearch,
    onSelect,
}: KaryawanSelectProps) => {
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const containerRef = useRef<HTMLDivElement>(null)
    const onSearchRef = useRef(onSearch)

    useEffect(() => {
        onSearchRef.current = onSearch
    }, [onSearch])

    const selectedKaryawan = useMemo(
        () =>
            karyawanList.find((k) => k.code_employee === selectedCode) ?? null,
        [karyawanList, selectedCode],
    )

    // Debounced search
    useEffect(() => {
        if (!isOpen || onSearchRef.current === undefined) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            onSearchRef.current?.(searchQuery.trim())
        }, 250)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [isOpen, searchQuery])

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setSearchQuery(event.target.value)
    }

    const handleToggle = (): void => {
        if (disabled) return
        setIsOpen((prev) => !prev)
    }

    const handleSelect = (karyawan: KaryawanItem): void => {
        onSelect(karyawan)
        setSearchQuery('')
        setIsOpen(false)
    }

    return (
        <div className="client-select karyawan-select" ref={containerRef}>
            <button
                type="button"
                className={`client-select-trigger ${isOpen ? 'active' : ''} ${
                    selectedCode !== '' ? 'selected' : ''
                }`}
                disabled={disabled}
                onClick={handleToggle}
            >
                <span
                    className={
                        selectedKaryawan === null && selectedCode === ''
                            ? 'placeholder'
                            : 'selected-value'
                    }
                >
                    {selectedKaryawan === null
                        ? selectedCode === ''
                            ? placeholder
                            : selectedCode
                        : `${selectedKaryawan.text} (${selectedKaryawan.code_employee})`}
                </span>

                <i
                    className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}
                />
            </button>

            {isOpen && (
                <div className="client-select-dropdown shadow-lg">
                    <div className="client-select-search">
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Cari nama atau kode karyawan..."
                            autoFocus
                            onChange={handleSearchChange}
                        />
                    </div>

                    <div
                        className="client-select-options"
                        style={{ maxHeight: '220px', overflowY: 'auto' }}
                    >
                        {isLoading && (
                            <div className="client-select-state">
                                <span className="spinner-border spinner-border-sm me-2" />
                                Memuat data karyawan...
                            </div>
                        )}

                        {!isLoading && errorMessage !== null && (
                            <div className="client-select-state error">
                                {errorMessage}
                            </div>
                        )}

                        {!isLoading &&
                            errorMessage === null &&
                            karyawanList.length === 0 && (
                                <div className="client-select-state">
                                    Karyawan tidak ditemukan.
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null &&
                            karyawanList.map((karyawan) => (
                                <button
                                    key={karyawan.id || karyawan.code_employee}
                                    type="button"
                                    className={`client-select-option d-flex align-items-center justify-content-between ${
                                        selectedCode === karyawan.code_employee
                                            ? 'selected'
                                            : ''
                                    }`}
                                    onClick={() => handleSelect(karyawan)}
                                >
                                    <div className="d-flex flex-column text-start">
                                        <span className="fw-medium text-dark">
                                            {karyawan.text}
                                        </span>
                                        {karyawan.asal_pt && (
                                            <span
                                                className="text-muted"
                                                style={{ fontSize: '11px' }}
                                            >
                                                {karyawan.asal_pt}
                                            </span>
                                        )}
                                    </div>

                                    <span
                                        className="client-select-code badge bg-light text-secondary border ms-2"
                                        style={{ fontSize: '11px' }}
                                    >
                                        {karyawan.code_employee}
                                    </span>
                                </button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default KaryawanSelect
