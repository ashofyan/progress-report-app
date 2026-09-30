import { useCallback } from 'react'

import KaryawanSelect from '@/features/notes/components/KaryawanSelect'
import { useKaryawanSearch } from '@/features/notes/hooks/useKaryawanSearch'
import type { KaryawanItem } from '@/features/notes/types/karyawan.types'

interface MeetingAttendeesInputProps {
    value: string[]
    onChange: (codes: string[]) => void
    disabled?: boolean
}

export const MeetingAttendeesInput = ({
    value,
    onChange,
    disabled = false,
}: MeetingAttendeesInputProps) => {
    const {
        karyawanList,
        isLoading,
        errorMessage,
        searchKaryawan,
    } = useKaryawanSearch()

    const handleSearch = useCallback(
        (query: string) => {
            void searchKaryawan(query)
        },
        [searchKaryawan],
    )

    const handleSelectKaryawan = (karyawan: KaryawanItem) => {
        if (!karyawan.code_employee) return
        const exists = value.some(
            (c) => c.toLowerCase() === karyawan.code_employee.toLowerCase(),
        )
        if (exists) return

        onChange([...value, karyawan.code_employee])
    }

    const handleRemoveCode = (codeToRemove: string) => {
        onChange(value.filter((code) => code !== codeToRemove))
    }

    return (
        <div className="notes-attendees-field">
            {/* List of selected attendees as Notion pills */}
            <div className="notes-attendees-tags mb-2 d-flex flex-wrap gap-1">
                {value.length === 0 ? (
                    <span className="text-muted small fst-italic">
                        Belum ada peserta dipilih. Cari & pilih karyawan pada dropdown di bawah.
                    </span>
                ) : (
                    value.map((code) => {
                        const matched = karyawanList.find(
                            (k) => k.code_employee.toLowerCase() === code.toLowerCase(),
                        )
                        const displayName = matched ? matched.text : code

                        return (
                            <span
                                key={code}
                                className="notion-pill"
                                style={{
                                    fontSize: '12px',
                                    padding: '4px 10px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e1e4e8',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                }}
                            >
                                <i className="bi bi-person text-secondary me-1" />
                                <span className="fw-medium text-dark">{displayName}</span>
                                {matched && (
                                    <span
                                        className="text-muted ms-1"
                                        style={{ fontSize: '11px' }}
                                    >
                                        ({code})
                                    </span>
                                )}
                                {!disabled && (
                                    <button
                                        type="button"
                                        className="btn-close ms-2"
                                        style={{ fontSize: '0.6rem' }}
                                        aria-label={`Hapus ${displayName}`}
                                        onClick={() => handleRemoveCode(code)}
                                    />
                                )}
                            </span>
                        )
                    })
                )}
            </div>

            {/* Karyawan Selected Dropdown */}
            {!disabled && (
                <div style={{ maxWidth: '380px' }}>
                    <KaryawanSelect
                        karyawanList={karyawanList}
                        isLoading={isLoading}
                        errorMessage={errorMessage}
                        placeholder="+ Pilih Peserta Rapat..."
                        onSearch={handleSearch}
                        onSelect={handleSelectKaryawan}
                    />
                </div>
            )}
        </div>
    )
}

export default MeetingAttendeesInput
