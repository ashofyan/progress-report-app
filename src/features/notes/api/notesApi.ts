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
    NoteType,
    ShareInvitedRequest,
    UpdateMeetingNoteRequest,
    UpdateNoteRequest,
    UpdateStandardNoteRequest,
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

// ==========================================
// Standard Notes API (/api/notes)
// ==========================================

const getStandardNotes = async (
    page = 1,
): Promise<NoteApiResult<NoteListResponse>> => {
    return notesHttpClient
        .get<NoteListResponse>('/notes', {
            params: { page },
        })
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                const responseData = response.data
                const normalizedData = (responseData.data || []).map((note) => ({
                    ...note,
                    type: (note.type || 'standard') as NoteType,
                }))

                return {
                    success: true,
                    status: response.status,
                    message: 'Berhasil memuat daftar catatan.',
                    data: {
                        ...responseData,
                        data: normalizedData,
                    },
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

const getStandardById = async (
    id: number,
): Promise<NoteApiResult<Note>> => {
    try {
        const response = await notesHttpClient.get<NoteSingleResponse | { data: Note }>(
            `/notes/${id}`,
        )

        if (response.status >= 200 && response.status < 300) {
            const rawNote =
                'data' in response.data ? response.data.data : (response.data as unknown as Note)
            const noteData: Note = {
                ...rawNote,
                type: (rawNote.type || 'standard') as NoteType,
            }
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

    const listResult = await getStandardNotes(1)
    if (listResult.success && listResult.data) {
        const found = listResult.data.data.find((n: Note) => n.id === id)
        if (found) {
            return {
                success: true,
                status: 200,
                message: 'Berhasil memuat catatan.',
                data: {
                    ...found,
                    type: 'standard',
                },
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
                const noteData: Note = {
                    ...response.data.data,
                    type: (response.data.data.type || 'standard') as NoteType,
                }
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message || 'Catatan berhasil disimpan.',
                    data: noteData,
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

const updateStandard = async (
    id: number,
    payload: UpdateStandardNoteRequest,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .put<NoteSingleResponse>(`/notes/${id}`, payload)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                const noteData: Note = {
                    ...response.data.data,
                    type: (response.data.data.type || 'standard') as NoteType,
                }
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message || 'Catatan berhasil diperbarui.',
                    data: noteData,
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

const shareStandardPublic = async (
    id: number,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .post<NoteSingleResponse>(`/notes/${id}/share-public`)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                const noteData: Note = {
                    ...response.data.data,
                    type: (response.data.data.type || 'standard') as NoteType,
                }
                return {
                    success: true,
                    status: response.status,
                    message:
                        response.data.message ||
                        'Catatan berhasil dibagikan ke semua tim (Read-Only).',
                    data: noteData,
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

const shareStandardInvited = async (
    id: number,
    payload: ShareInvitedRequest,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .post<NoteSingleResponse>(`/notes/${id}/share-invited`, payload)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                const noteData: Note = {
                    ...response.data.data,
                    type: (response.data.data.type || 'standard') as NoteType,
                }
                return {
                    success: true,
                    status: response.status,
                    message:
                        response.data.message ||
                        'Undangan akses catatan berhasil disimpan.',
                    data: noteData,
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

// ==========================================
// Meeting Notes API (/api/meeting-notes & /api/notulen)
// ==========================================

const getMeetingNotes = async (
    page = 1,
): Promise<NoteApiResult<NoteListResponse>> => {
    return notesHttpClient
        .get<NoteListResponse>('/meeting-notes', {
            params: { page },
        })
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                const responseData = response.data
                const normalizedData = (responseData.data || []).map((note) => ({
                    ...note,
                    type: 'meeting' as NoteType,
                }))

                const paginationMeta = responseData.meta
                    ? {
                          ...responseData.meta,
                          current_page: responseData.meta.current_page ?? page,
                          per_page: responseData.meta.per_page ?? 15,
                          total: responseData.meta.total ?? normalizedData.length,
                          last_page:
                              responseData.meta.last_page ??
                              Math.max(
                                  1,
                                  Math.ceil(
                                      (responseData.meta.total ?? normalizedData.length) /
                                          (responseData.meta.per_page ?? 15),
                                  ),
                              ),
                          from: responseData.meta.from ?? (normalizedData.length > 0 ? (page - 1) * 15 + 1 : null),
                          to: responseData.meta.to ?? (normalizedData.length > 0 ? (page - 1) * 15 + normalizedData.length : null),
                      }
                    : undefined

                return {
                    success: true,
                    status: response.status,
                    message: 'Berhasil memuat daftar notulen.',
                    data: {
                        ...responseData,
                        data: normalizedData,
                        meta: paginationMeta,
                    },
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

const getMeetingById = async (
    id: number,
): Promise<NoteApiResult<Note>> => {
    try {
        const response = await notesHttpClient.get<NoteSingleResponse | { data: Note }>(
            `/meeting-notes/${id}`,
        )

        if (response.status >= 200 && response.status < 300) {
            const rawNote =
                'data' in response.data ? response.data.data : (response.data as unknown as Note)
            const noteData: Note = {
                ...rawNote,
                type: 'meeting',
            }
            return {
                success: true,
                status: response.status,
                message: 'Berhasil memuat notulen meeting.',
                data: noteData,
            }
        }
    } catch {
        // Fallback to checking list if single endpoint is not implemented on server
    }

    const listResult = await getMeetingNotes(1)
    if (listResult.success && listResult.data) {
        const found = listResult.data.data.find((n: Note) => n.id === id)
        if (found) {
            return {
                success: true,
                status: 200,
                message: 'Berhasil memuat notulen meeting.',
                data: {
                    ...found,
                    type: 'meeting',
                },
            }
        }
    }

    return {
        success: false,
        status: 404,
        message: 'Notulen meeting tidak ditemukan.',
    }
}

const createMeeting = async (
    payload: CreateMeetingNoteRequest,
): Promise<NoteApiResult<Note>> => {
    const requestBody: Record<string, unknown> = {
        meeting_scope: payload.meeting_scope,
        client_id: payload.meeting_scope === 'client' ? (payload.client_id ?? null) : null,
        title: payload.title,
        content: payload.content,
    }

    if (payload.author_employee_name) {
        requestBody.author_employee_name = payload.author_employee_name
    }

    if (payload.attendees && payload.attendees.length > 0) {
        requestBody.attendees = payload.attendees
    }

    if (payload.attendee_codes && payload.attendee_codes.length > 0) {
        requestBody.attendee_codes = payload.attendee_codes
    }

    return notesHttpClient
        .post<NoteSingleResponse>('/meeting-notes', requestBody)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                const noteData: Note = {
                    ...response.data.data,
                    type: 'meeting',
                }
                return {
                    success: true,
                    status: response.status,
                    message:
                        response.data.message ||
                        'Notulen berhasil disimpan dan dibagikan otomatis ke peserta hadir.',
                    data: noteData,
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

const updateMeeting = async (
    id: number,
    payload: UpdateMeetingNoteRequest,
): Promise<NoteApiResult<Note>> => {
    const requestBody: Record<string, unknown> = {}
    if (payload.title !== undefined) requestBody.title = payload.title
    if (payload.content !== undefined) requestBody.content = payload.content
    if (payload.meeting_scope !== undefined) requestBody.meeting_scope = payload.meeting_scope
    if (payload.client_id !== undefined) requestBody.client_id = payload.client_id

    return notesHttpClient
        .put<NoteSingleResponse>(`/meeting-notes/${id}`, requestBody)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                const noteData: Note = {
                    ...response.data.data,
                    type: 'meeting',
                }
                return {
                    success: true,
                    status: response.status,
                    message: response.data.message || 'Notulen berhasil diperbarui.',
                    data: noteData,
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

const shareMeetingPublic = async (
    id: number,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .post<NoteSingleResponse>(`/meeting-notes/${id}/share-public`)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                const noteData: Note = {
                    ...response.data.data,
                    type: 'meeting',
                }
                return {
                    success: true,
                    status: response.status,
                    message:
                        response.data.message ||
                        'Notulen berhasil dibagikan ke semua tim (Read-Only).',
                    data: noteData,
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

const shareMeetingInvited = async (
    id: number,
    payload: ShareInvitedRequest,
): Promise<NoteApiResult<Note>> => {
    return notesHttpClient
        .post<NoteSingleResponse>(`/meeting-notes/${id}/share-invited`, payload)
        .then((response) => {
            if (response.status >= 200 && response.status < 300) {
                const noteData: Note = {
                    ...response.data.data,
                    type: 'meeting',
                }
                return {
                    success: true,
                    status: response.status,
                    message:
                        response.data.message ||
                        'Undangan akses notulen berhasil disimpan.',
                    data: noteData,
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

// ==========================================
// Polymorphic & Backward Compatible API
// ==========================================

const getAll = async (
    page = 1,
    type?: NoteType | 'all',
): Promise<NoteApiResult<NoteListResponse>> => {
    if (type === 'standard') {
        return getStandardNotes(page)
    }
    if (type === 'meeting') {
        return getMeetingNotes(page)
    }

    // Default: fetch both standard and meeting notes concurrently and merge
    const [standardRes, meetingRes] = await Promise.allSettled([
        getStandardNotes(page),
        getMeetingNotes(page),
    ])

    const standardList =
        standardRes.status === 'fulfilled' && standardRes.value.success && standardRes.value.data
            ? standardRes.value.data.data
            : []
    const meetingList =
        meetingRes.status === 'fulfilled' && meetingRes.value.success && meetingRes.value.data
            ? meetingRes.value.data.data
            : []

    if (
        (standardRes.status === 'rejected' || !standardRes.value.success) &&
        (meetingRes.status === 'rejected' || !meetingRes.value.success)
    ) {
        return {
            success: false,
            status: 0,
            message: 'Tidak dapat memuat catatan maupun notulen.',
        }
    }

    const merged = [...standardList, ...meetingList].sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime()
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime()
        return timeB - timeA
    })

    const standardMeta =
        standardRes.status === 'fulfilled' ? standardRes.value.data?.meta : undefined
    const meetingMeta =
        meetingRes.status === 'fulfilled' ? meetingRes.value.data?.meta : undefined

    const total = (standardMeta?.total ?? standardList.length) + (meetingMeta?.total ?? meetingList.length)

    return {
        success: true,
        status: 200,
        message: 'Berhasil memuat daftar catatan dan notulen.',
        data: {
            data: merged,
            meta: {
                current_page: page,
                per_page: 15,
                total,
                last_page: Math.max(1, Math.ceil(total / 15)),
                from: merged.length > 0 ? (page - 1) * 15 + 1 : null,
                to: merged.length > 0 ? (page - 1) * 15 + merged.length : null,
            },
        },
    }
}

const getById = async (
    id: number,
    type?: NoteType,
): Promise<NoteApiResult<Note>> => {
    if (type === 'standard') {
        return getStandardById(id)
    }
    if (type === 'meeting') {
        return getMeetingById(id)
    }

    // Try standard notes first
    const standardResult = await getStandardById(id)
    if (standardResult.success && standardResult.data) {
        return standardResult
    }

    // Fallback to meeting notes
    const meetingResult = await getMeetingById(id)
    if (meetingResult.success && meetingResult.data) {
        return meetingResult
    }

    return {
        success: false,
        status: 404,
        message: 'Catatan atau notulen tidak ditemukan.',
    }
}

const update = async (
    id: number,
    payload: UpdateNoteRequest,
    type?: NoteType,
): Promise<NoteApiResult<Note>> => {
    if (type === 'meeting' || payload.meeting_scope !== undefined || payload.client_id !== undefined) {
        return updateMeeting(id, payload)
    }
    return updateStandard(id, payload)
}

const sharePublic = async (
    id: number,
    type?: NoteType,
): Promise<NoteApiResult<Note>> => {
    if (type === 'meeting') {
        return shareMeetingPublic(id)
    }
    return shareStandardPublic(id)
}

const shareInvited = async (
    id: number,
    payload: ShareInvitedRequest,
    type?: NoteType,
): Promise<NoteApiResult<Note>> => {
    if (type === 'meeting') {
        return shareMeetingInvited(id, payload)
    }
    return shareStandardInvited(id, payload)
}

export const notesApi = {
    // General / Polymorphic
    getAll,
    getById,
    update,
    sharePublic,
    shareInvited,

    // Standard Notes
    getStandardNotes,
    getStandardById,
    createStandard,
    updateStandard,
    shareStandardPublic,
    shareStandardInvited,

    // Meeting Notes
    getMeetingNotes,
    getMeetingById,
    createMeeting,
    updateMeeting,
    shareMeetingPublic,
    shareMeetingInvited,
}
