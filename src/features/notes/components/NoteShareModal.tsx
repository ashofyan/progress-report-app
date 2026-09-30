import {
    useCallback,
    useState,
    type FormEvent,
} from 'react'

import { notesApi } from '@/features/notes/api/notesApi'
import KaryawanSelect from '@/features/notes/components/KaryawanSelect'
import { useKaryawanSearch } from '@/features/notes/hooks/useKaryawanSearch'
import type { KaryawanItem } from '@/features/notes/types/karyawan.types'
import type {
    Note,
    ShareInvitedItem,
    SharePermission,
} from '@/features/notes/types/notes.types'

interface NoteShareModalProps {
    note: Note
    isOpen: boolean
    onClose: () => void
    onUpdated: (updatedNote: Note) => void
}

export const NoteShareModal = ({
    note,
    isOpen,
    onClose,
    onUpdated,
}: NoteShareModalProps) => {
    const [activeTab, setActiveTab] = useState<'invited' | 'public'>('invited')
    const [invitedList, setInvitedList] = useState<ShareInvitedItem[]>(() => {
        if (!note.shares || note.shares.length === 0) return []
        return note.shares.map((s) => ({
            employee_code: s.employee_code,
            permission: s.permission,
        }))
    })

    const {
        karyawanList,
        isLoading: isLoadingKaryawan,
        errorMessage: karyawanErrorMessage,
        searchKaryawan,
    } = useKaryawanSearch()

    const [selectedKaryawan, setSelectedKaryawan] = useState<KaryawanItem | null>(null)
    const [newPermission, setNewPermission] = useState<SharePermission>('read')
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const handleKaryawanSearch = useCallback(
        (query: string) => {
            void searchKaryawan(query)
        },
        [searchKaryawan],
    )

    if (!isOpen) return null

    const handleAddInvited = () => {
        if (!selectedKaryawan || !selectedKaryawan.code_employee) {
            setErrorMessage('Pilih karyawan terlebih dahulu dari daftar.')
            return
        }

        const trimmed = selectedKaryawan.code_employee.trim()
        const exists = invitedList.some(
            (item) => item.employee_code.toLowerCase() === trimmed.toLowerCase(),
        )
        if (exists) {
            setErrorMessage(`Karyawan "${selectedKaryawan.text}" sudah ada dalam daftar undangan.`)
            return
        }

        setErrorMessage(null)
        setInvitedList([
            ...invitedList,
            { employee_code: trimmed, permission: newPermission },
        ])
        setSelectedKaryawan(null)
        setNewPermission('read')
    }

    const handleRemoveInvited = (codeToRemove: string) => {
        setInvitedList(invitedList.filter((item) => item.employee_code !== codeToRemove))
    }

    const handlePermissionChange = (
        employeeCode: string,
        permission: SharePermission,
    ) => {
        setInvitedList(
            invitedList.map((item) =>
                item.employee_code === employeeCode ? { ...item, permission } : item,
            ),
        )
    }

    const handleSaveInvited = async (e: FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)
        setSuccessMessage(null)

        if (invitedList.length === 0) {
            setErrorMessage('Tambahkan minimal 1 anggota untuk dibagikan.')
            return
        }

        setIsSubmitting(true)
        const result = await notesApi.shareInvited(note.id, {
            shares: invitedList,
        })
        setIsSubmitting(false)

        if (result.success && result.data) {
            setSuccessMessage(result.message || 'Izin akses berhasil diperbarui.')
            onUpdated(result.data)
            setTimeout(() => {
                onClose()
            }, 1200)
        } else {
            setErrorMessage(result.message)
        }
    }

    const handleMakePublic = async () => {
        if (!window.confirm('Catatan ini akan dapat dibaca oleh seluruh anggota tim. Lanjutkan?')) {
            return
        }

        setErrorMessage(null)
        setSuccessMessage(null)
        setIsSubmitting(true)

        const result = await notesApi.sharePublic(note.id)
        setIsSubmitting(false)

        if (result.success && result.data) {
            setSuccessMessage(result.message || 'Catatan berhasil dibagikan ke publik.')
            onUpdated(result.data)
            setTimeout(() => {
                onClose()
            }, 1200)
        } else {
            setErrorMessage(result.message)
        }
    }

    return (
        <div className="notes-modal-backdrop" onClick={onClose}>
            <div
                className="notes-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="notes-modal-header">
                    <h2>
                        <i className="bi bi-share text-danger" />
                        <span>Bagikan Catatan</span>
                    </h2>
                    <button
                        type="button"
                        className="notes-modal-close"
                        onClick={onClose}
                        aria-label="Tutup"
                        disabled={isSubmitting}
                    >
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                <div className="notes-modal-body">
                    {/* Note Summary */}
                    <div className="notes-modal-summary">
                        <div className="notes-modal-summary-title">
                            {note.title || 'Tanpa Judul'}
                        </div>
                        <div className="notes-modal-summary-badge">
                            <span className="text-muted small">Akses saat ini:</span>
                            <span
                                className={`notes-tag ${
                                    note.share_type === 'public'
                                        ? 'tag-public'
                                        : note.share_type === 'invited'
                                        ? 'tag-invited'
                                        : 'tag-private'
                                }`}
                            >
                                {note.share_type === 'public' && 'Publik'}
                                {note.share_type === 'invited' && 'Diundang'}
                                {note.share_type === 'private' && 'Privat'}
                            </span>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="alert alert-danger py-2 small mb-3" role="alert">
                            <i className="bi bi-exclamation-circle me-1" />
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="alert alert-success py-2 small mb-3" role="alert">
                            <i className="bi bi-check-circle me-1" />
                            {successMessage}
                        </div>
                    )}

                    {/* Modal Tab Switcher */}
                    <div className="notes-modal-tabs">
                        <button
                            type="button"
                            className={`notes-modal-tab ${
                                activeTab === 'invited' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('invited')}
                        >
                            <i className="bi bi-people" />
                            <span>Undang Anggota</span>
                        </button>
                        <button
                            type="button"
                            className={`notes-modal-tab ${
                                activeTab === 'public' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('public')}
                        >
                            <i className="bi bi-globe" />
                            <span>Semua Tim (Publik)</span>
                        </button>
                    </div>

                    {activeTab === 'invited' ? (
                        <form onSubmit={handleSaveInvited}>
                            {/* Invite Section */}
                            <div className="notes-invite-section">
                                <label className="notes-section-label">
                                    Tambah Anggota Baru
                                </label>
                                <div className="d-flex flex-column gap-2">
                                    <KaryawanSelect
                                        karyawanList={karyawanList}
                                        selectedCode={selectedKaryawan?.code_employee ?? ''}
                                        isLoading={isLoadingKaryawan}
                                        errorMessage={karyawanErrorMessage}
                                        placeholder="Cari nama atau NIK karyawan..."
                                        onSearch={handleKaryawanSearch}
                                        onSelect={(k) => setSelectedKaryawan(k)}
                                    />

                                    <div className="d-flex align-items-center gap-2 mt-1">
                                        <div className="flex-grow-1">
                                            <select
                                                className="form-select form-select-sm"
                                                value={newPermission}
                                                onChange={(e) =>
                                                    setNewPermission(
                                                        e.target.value as SharePermission,
                                                    )
                                                }
                                            >
                                                <option value="read">Hanya Baca (Read-Only)</option>
                                                <option value="edit">Bisa Mengubah (Can Edit)</option>
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            className="notes-primary-button"
                                            style={{
                                                height: '34px',
                                                padding: '0 16px',
                                                flexShrink: 0,
                                                whiteSpace: 'nowrap',
                                            }}
                                            onClick={handleAddInvited}
                                        >
                                            <i className="bi bi-plus-lg me-1" />
                                            <span>Tambahkan</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Members List */}
                            <div className="notes-members-section">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <label className="notes-section-label mb-0">
                                        Daftar Akses Anggota
                                    </label>
                                    <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill">
                                        {invitedList.length} orang
                                    </span>
                                </div>

                                {invitedList.length === 0 ? (
                                    <div className="notes-empty-hint">
                                        Belum ada anggota yang diundang.
                                    </div>
                                ) : (
                                    <div className="notes-members-list">
                                        {invitedList.map((item) => {
                                            const matched = karyawanList.find(
                                                (k) =>
                                                    k.code_employee.toLowerCase() ===
                                                    item.employee_code.toLowerCase(),
                                            )
                                            const displayName = matched
                                                ? matched.text
                                                : item.employee_code

                                            return (
                                                <div
                                                    key={item.employee_code}
                                                    className="notes-member-item"
                                                >
                                                    <div className="notes-member-info">
                                                        <div className="notes-member-avatar">
                                                            <i className="bi bi-person-fill" />
                                                        </div>
                                                        <div className="notes-member-meta">
                                                            <span className="notes-member-name">
                                                                {displayName}
                                                            </span>
                                                            {matched && (
                                                                <span className="notes-member-code">
                                                                    NIK: {item.employee_code}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="notes-member-actions">
                                                        <select
                                                            className="form-select form-select-sm"
                                                            style={{
                                                                width: '90px',
                                                                fontSize: '12px',
                                                                height: '30px',
                                                            }}
                                                            value={item.permission}
                                                            onChange={(e) =>
                                                                handlePermissionChange(
                                                                    item.employee_code,
                                                                    e.target
                                                                        .value as SharePermission,
                                                                )
                                                            }
                                                        >
                                                            <option value="read">Read</option>
                                                            <option value="edit">Edit</option>
                                                        </select>

                                                        <button
                                                            type="button"
                                                            className="notes-member-remove-btn"
                                                            title="Hapus akses"
                                                            onClick={() =>
                                                                handleRemoveInvited(
                                                                    item.employee_code,
                                                                )
                                                            }
                                                        >
                                                            <i className="bi bi-trash" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="notes-modal-footer mt-4">
                                <button
                                    type="button"
                                    className="notes-secondary-button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="notes-primary-button"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && (
                                        <span className="spinner-border spinner-border-sm me-1" />
                                    )}
                                    <span>Simpan Izin</span>
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="notes-public-panel text-center py-4">
                            <div className="notes-public-icon mb-3">
                                <i className="bi bi-globe-americas" />
                            </div>
                            <h6 className="fw-semibold text-dark mb-1">
                                Bagikan ke Seluruh Tim
                            </h6>
                            <p className="text-muted small px-3 mb-4">
                                Catatan ini akan dapat diakses dan dibaca oleh seluruh anggota
                                organisasi ALS Holdings berstatus Read-Only.
                            </p>
                            <div className="d-flex justify-content-center gap-2">
                                <button
                                    type="button"
                                    className="notes-secondary-button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    className="notes-primary-button"
                                    onClick={handleMakePublic}
                                    disabled={isSubmitting || note.share_type === 'public'}
                                >
                                    {isSubmitting && (
                                        <span className="spinner-border spinner-border-sm me-1" />
                                    )}
                                    {note.share_type === 'public'
                                        ? 'Sudah Dibagikan ke Publik'
                                        : 'Jadikan Catatan Publik'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default NoteShareModal
