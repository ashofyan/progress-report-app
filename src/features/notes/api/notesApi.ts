import type { AxiosResponse } from 'axios'

import notesHttpClient from '@/features/notes/services/notesHttpClient'
import type {
    CreateMeetingNoteRequest,
    CreateStandardNoteRequest,
    LaravelValidationErrorResponse,
    Note,
    NoteApiResult,
    NoteErrorResponse,
    NoteListResponse,
    NoteSingleResponse,
    ShareInvitedRequest,
    UpdateNoteRequest,
} from '@/features/notes/types/notes.types'

type PossibleError = NoteErrorResponse | LaravelValidationErrorResponse

const getErrorResult = (
    response: AxiosResponse<unknown>,
): NoteApiResult<never> => {
    const data = response.data as PossibleError | undefined

    if (data && 'errors' in data && data.errors) {
        return {
            success: false,
            status: response.status,
            message: data.message || 'Terjadi kesalahan validasi.',
            errors: data.errors,
        }
    }

    if (data && 'message' in data && data.message) {
        return {
            success: false,
            status: response.status,
            message: data.message,
        }
    }

    return {
        success: false,
        status: response.status,
        message: 'Terjadi kesalahan pada server.',
    }
}

const getAll = async (
    page = 1,
): Promise<NoteApiResult<NoteListResponse>> => {
    return notesHttpClient
        .get<NoteListResponse>('/notes', {
            params: { page },
        })
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                return {
                    success: true,
                    status: response.status,
                    message: 'Berhasil memuat daftar catatan.',
                    data: response.data,
                }
            }

            return getErrorResult(response)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server Notes.',
        }))
}

const getById = async (
    id: number,
): Promise<NoteApiResult<Note>> => {
    try {
        const response = await notesHttpClient.get<NoteSingleResponse | { data: Note }>(
            `/notes/${id}`,
        )

        if (response.status >= 200 && response.status < 300) {
            const noteData =
                'data' in response.data ? response.data.data : (response.data as unknown as Note)
            return {
                success: true,
                status: response.status,
                message: 'Berhasil memuat catatan.',
                data: noteData,
            }
        }
    } catch {
        // Fallback to checking list if single endpoint is not implemented on server
    }

    const listResult = await getAll(1)
    if (listResult.success && listResult.data) {
        const found = listResult.data.data.find((n: Note) => n.id === id)
        if (found) {
            return {
                success: true,
                status: 200,
                message: 'Berhasil memuat catatan.',
                data: found,
            }
        }
    }

    return {
        success: false,
        status: 404,
        message: 'Catatan tidak ditemukan.',
    }
}

const createStandard = async (
    payload: CreateStandardNoteRequest,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .post<NoteSingleResponse>('/notes', payload)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message || 'Catatan berhasil disimpan.',
                    data: response.data.data,
                }
            }

            return getErrorResult(response)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server Notes.',
        }))
}

const createMeeting = async (
    payload: CreateMeetingNoteRequest,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .post<NoteSingleResponse>('/notes/meeting', payload)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                return {
                    success: true,
                    status: response.status,
                    message:
                        response.data.message ||
                        'Notulen berhasil disimpan dan dibagikan otomatis ke peserta hadir.',
                    data: response.data.data,
                }
            }

            return getErrorResult(response)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server Notes.',
        }))
}

const update = async (
    id: number,
    payload: UpdateNoteRequest,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .put<NoteSingleResponse>(`/notes/${id}`, payload)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message || 'Catatan berhasil diperbarui.',
                    data: response.data.data,
                }
            }

            return getErrorResult(response)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server Notes.',
        }))
}

const sharePublic = async (
    id: number,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .post<NoteSingleResponse>(`/notes/${id}/share-public`)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                return {
                    success: true,
                    status: response.status,
                    message:
                        response.data.message ||
                        'Catatan berhasil dibagikan ke semua tim (Read-Only).',
                    data: response.data.data,
                }
            }

            return getErrorResult(response)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server Notes.',
        }))
}

const shareInvited = async (
    id: number,
    payload: ShareInvitedRequest,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .post<NoteSingleResponse>(`/notes/${id}/share-invited`, payload)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                return {
                    success: true,
                    status: response.status,
                    message:
                        response.data.message ||
                        'Undangan akses catatan berhasil disimpan.',
                    data: response.data.data,
                }
            }

            return getErrorResult(response)
        })
        .catch(() => ({
            success: false,
            status: 0,
            message: 'Tidak dapat terhubung ke server Notes.',
        }))
}

export const notesApi = {
    getAll,
    getById,
    createStandard,
    createMeeting,
    update,
    sharePublic,
    shareInvited,
}
