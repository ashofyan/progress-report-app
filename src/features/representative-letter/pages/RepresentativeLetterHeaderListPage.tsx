import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { representativeLetterApi } from '@/features/representative-letter/api/representativeLetterApi'
import type {
    RepresentativeLetterHeader,
    RepresentativeLetterHeaderFormPayload,
    RepresentativeLetterMeta,
} from '@/features/representative-letter/types/representative-letter.types'

import '@/features/representative-letter/styles/representative-letter.scss'

interface HeaderFormState {
    code: string
    name: string
    isActive: boolean
    file: File | null
}

const defaultMeta: RepresentativeLetterMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
}

const emptyFormState: HeaderFormState = {
    code: '',
    name: '',
    isActive: false,
    file: null,
}

const RepresentativeLetterHeaderListPage = () => {
    const navigate = useNavigate()

    const [headers, setHeaders] =
        useState<RepresentativeLetterHeader[]>([])
    const [meta, setMeta] =
        useState<RepresentativeLetterMeta>(defaultMeta)
    const [currentPage, setCurrentPage] =
        useState<number>(1)
    const [editingHeader, setEditingHeader] =
        useState<RepresentativeLetterHeader | null>(null)
    const [formState, setFormState] =
        useState<HeaderFormState>(emptyFormState)
    const [previewUrl, setPreviewUrl] =
        useState<string | null>(null)
    const [isLoading, setIsLoading] =
        useState<boolean>(false)
    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)
    const [activatingHeaderId, setActivatingHeaderId] =
        useState<number | null>(null)
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null)

    const fetchHeaders = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setErrorMessage(null)

        const result =
            await representativeLetterApi.getHeaders({
                page: currentPage,
                per_page: 20,
            })

        if (
            result.success &&
            result.data !== undefined
        ) {
            setHeaders(result.data)
            setMeta(result.meta ?? defaultMeta)
            setIsLoading(false)
            return
        }

        setHeaders([])
        setMeta(defaultMeta)
        setErrorMessage(result.message)
        setIsLoading(false)
    }, [currentPage])

    useEffect(() => {
        queueMicrotask(() => {
            void fetchHeaders()
        })
    }, [fetchHeaders])

    useEffect(() => {
        return () => {
            if (previewUrl !== null) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    const resetForm = (): void => {
        if (previewUrl !== null) {
            URL.revokeObjectURL(previewUrl)
        }

        setEditingHeader(null)
        setFormState(emptyFormState)
        setPreviewUrl(null)
        setErrorMessage(null)
    }

    const startEdit = (
        header: RepresentativeLetterHeader,
    ): void => {
        if (previewUrl !== null) {
            URL.revokeObjectURL(previewUrl)
        }

        setEditingHeader(header)
        setFormState({
            code: header.code,
            name: header.name,
            isActive: header.is_active,
            file: null,
        })
        setPreviewUrl(null)
        setErrorMessage(null)
    }

    const handleFileChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        const file = event.target.files?.[0] ?? null

        if (previewUrl !== null) {
            URL.revokeObjectURL(previewUrl)
        }

        setFormState((current) => ({
            ...current,
            file,
        }))
        setPreviewUrl(
            file === null ? null : URL.createObjectURL(file),
        )
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrorMessage(null)

        if (editingHeader === null && formState.code.trim() === '') {
            setErrorMessage('Code wajib diisi.')
            return
        }

        if (formState.name.trim() === '') {
            setErrorMessage('Name wajib diisi.')
            return
        }

        if (editingHeader === null && formState.file === null) {
            setErrorMessage('Header Image wajib diisi.')
            return
        }

        setIsSubmitting(true)

        const payload: RepresentativeLetterHeaderFormPayload =
            editingHeader === null
                ? {
                    code: formState.code.trim(),
                    name: formState.name.trim(),
                    header_image:
                        formState.file === null
                            ? undefined
                            : formState.file,
                    is_active: formState.isActive,
                }
                : {
                    name: formState.name.trim(),
                    header_image:
                        formState.file === null
                            ? undefined
                            : formState.file,
                    is_active: formState.isActive,
                }

        const result =
            editingHeader === null
                ? await representativeLetterApi.createHeader(
                    payload,
                )
                : await representativeLetterApi.updateHeader(
                    editingHeader.id,
                    payload,
                )

        setIsSubmitting(false)

        if (result.success) {
            resetForm()
            await fetchHeaders()
            return
        }

        setErrorMessage(result.message)
    }

    const handleActivate = async (
        header: RepresentativeLetterHeader,
    ): Promise<void> => {
        setActivatingHeaderId(header.id)
        setErrorMessage(null)

        const result =
            await representativeLetterApi.activateHeader(
                header.id,
            )

        setActivatingHeaderId(null)

        if (result.success) {
            await fetchHeaders()
            return
        }

        setErrorMessage(result.message)
    }

    return (
        <div className="representative-letter-page-shell">
            <div className="representative-letter-heading">
                <h1 className="representative-letter-title">
                    Representative Letter Header
                </h1>

                <div className="representative-letter-actions">
                    <button
                        type="button"
                        className="btn btn-light"
                        onClick={() =>
                            navigate('/representative-letter')
                        }
                    >
                        Kembali
                    </button>
                </div>
            </div>

            {errorMessage !== null && (
                <div className="alert alert-danger">
                    {errorMessage}
                </div>
            )}

            <section className="representative-letter-header-layout">
                <form
                    className="representative-letter-header-form"
                    onSubmit={handleSubmit}
                >
                    <h2>
                        {editingHeader === null
                            ? 'Create Header'
                            : 'Edit Header'}
                    </h2>

                    <label className="form-label">
                        Code
                        <input
                            className="form-control"
                            value={formState.code}
                            disabled={editingHeader !== null}
                            onChange={(
                                event: ChangeEvent<HTMLInputElement>,
                            ) =>
                                setFormState((current) => ({
                                    ...current,
                                    code: event.target.value,
                                }))
                            }
                        />
                    </label>

                    <label className="form-label">
                        Name
                        <input
                            className="form-control"
                            value={formState.name}
                            onChange={(
                                event: ChangeEvent<HTMLInputElement>,
                            ) =>
                                setFormState((current) => ({
                                    ...current,
                                    name: event.target.value,
                                }))
                            }
                        />
                    </label>

                    <label className="form-label">
                        Header Image
                        <input
                            type="file"
                            className="form-control"
                            accept=".png,.jpg,.jpeg,.webp"
                            onChange={handleFileChange}
                        />
                    </label>

                    {(previewUrl !== null ||
                        editingHeader !== null) && (
                        <div className="representative-letter-header-preview">
                            <img
                                src={
                                    previewUrl ??
                                    editingHeader?.image.url
                                }
                                alt="Preview Header"
                            />
                        </div>
                    )}

                    <label className="form-check form-switch">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={formState.isActive}
                            onChange={(
                                event: ChangeEvent<HTMLInputElement>,
                            ) =>
                                setFormState((current) => ({
                                    ...current,
                                    isActive:
                                        event.target.checked,
                                }))
                            }
                        />
                        <span className="form-check-label">
                            Set Active
                        </span>
                    </label>

                    <div className="representative-letter-form-footer">
                        {editingHeader !== null && (
                            <button
                                type="button"
                                className="btn btn-light"
                                disabled={isSubmitting}
                                onClick={resetForm}
                            >
                                Batal Edit
                            </button>
                        )}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && (
                                <span className="spinner-border spinner-border-sm me-2" />
                            )}
                            Simpan Header
                        </button>
                    </div>
                </form>

                <div className="representative-letter-board">
                    {isLoading && (
                        <div className="representative-letter-state">
                            Memuat header...
                        </div>
                    )}

                    {!isLoading && headers.length === 0 && (
                        <div className="representative-letter-state">
                            Belum ada header.
                        </div>
                    )}

                    {!isLoading && headers.length > 0 && (
                        <div className="table-responsive">
                            <table className="table representative-letter-table">
                                <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Name</th>
                                    <th>Preview Header</th>
                                    <th>Status</th>
                                    <th>Created By</th>
                                    <th>Created At</th>
                                    <th>Action</th>
                                </tr>
                                </thead>
                                <tbody>
                                {headers.map((header) => (
                                    <tr key={header.id}>
                                        <td>{header.code}</td>
                                        <td>{header.name}</td>
                                        <td>
                                            <img
                                                className="representative-letter-header-thumb"
                                                src={header.image.url}
                                                alt={header.name}
                                            />
                                        </td>
                                        <td>
                                            <span
                                                className={`representative-letter-header-status ${
                                                    header.is_active
                                                        ? 'active'
                                                        : 'inactive'
                                                }`}
                                            >
                                                {header.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>{header.created_by}</td>
                                        <td>
                                            {header.created_at ??
                                                '-'}
                                        </td>
                                        <td>
                                            <div className="representative-letter-row-actions">
                                                <button
                                                    type="button"
                                                    className="representative-letter-action-button"
                                                    title="View/Edit"
                                                    onClick={() =>
                                                        startEdit(
                                                            header,
                                                        )
                                                    }
                                                >
                                                    <i className="bi bi-pencil-square" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="representative-letter-action-button"
                                                    title="Activate"
                                                    disabled={
                                                        header.is_active ||
                                                        activatingHeaderId ===
                                                            header.id
                                                    }
                                                    onClick={() =>
                                                        void handleActivate(
                                                            header,
                                                        )
                                                    }
                                                >
                                                    {activatingHeaderId ===
                                                    header.id ? (
                                                        <span className="spinner-border spinner-border-sm" />
                                                    ) : (
                                                        <i className="bi bi-check2-circle" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!isLoading && headers.length > 0 && (
                        <div className="representative-letter-pagination">
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={currentPage <= 1}
                                onClick={() =>
                                    setCurrentPage((previous) =>
                                        Math.max(
                                            1,
                                            previous - 1,
                                        ),
                                    )
                                }
                            >
                                <i className="bi bi-caret-left-fill" />
                            </button>
                            <span className="representative-letter-page-info">
                                {meta.current_page} /{' '}
                                {meta.last_page}
                            </span>
                            <button
                                type="button"
                                className="pagination-arrow"
                                disabled={
                                    currentPage >= meta.last_page
                                }
                                onClick={() =>
                                    setCurrentPage((previous) =>
                                        Math.min(
                                            meta.last_page,
                                            previous + 1,
                                        ),
                                    )
                                }
                            >
                                <i className="bi bi-caret-right-fill" />
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}

export default RepresentativeLetterHeaderListPage
