export type NoteType = 'standard' | 'meeting'

export type MeetingScope = 'umum' | 'client'

export type ShareType = 'private' | 'public' | 'invited'

export type SharePermission = 'read' | 'edit'

export interface EditorJsBlock<T = Record<string, unknown>> {
    id?: string
    type: string
    data: T
}

export interface EditorJsContent {
    time?: number
    blocks: EditorJsBlock[]
    version?: string
}

export interface NoteShare {
    id: number
    note_id?: number
    meeting_note_id?: number
    employee_code: string
    employee_name?: string | null
    permission: SharePermission
    is_attendance?: boolean
    created_at?: string
    updated_at?: string
}

export interface Note {
    id: number
    author_employee_code: string
    author_employee_name?: string | null
    report_number?: string | null
    report_no?: string | null
    type?: NoteType
    meeting_scope?: MeetingScope | null
    client_id?: number | null
    title: string
    content: EditorJsContent
    share_type: ShareType
    shares?: NoteShare[]
    created_at?: string
    updated_at?: string
}

export interface NotePaginationMeta {
    current_page?: number
    from?: number | null
    last_page?: number
    per_page?: number
    to?: number | null
    total: number
}

export interface NotePaginationLinks {
    first?: string | null
    last?: string | null
    prev?: string | null
    next?: string | null
}

export interface NoteListResponse {
    data: Note[]
    links?: NotePaginationLinks
    meta?: NotePaginationMeta
}

export interface CreateStandardNotePayload {
    title: string
    content: EditorJsContent
    author_employee_name?: string
}

export interface MeetingAttendeePayload {
    employee_code: string
    employee_name?: string
}

export interface CreateMeetingNotePayload {
    report_number?: string | null
    meeting_scope: MeetingScope
    client_id?: number | null
    title: string
    attendees?: MeetingAttendeePayload[] | string[]
    attendee_codes?: string[]
    author_employee_name?: string
    content: EditorJsContent
}

export interface UpdateStandardNotePayload {
    title?: string
    content?: EditorJsContent
}

export interface UpdateMeetingNotePayload {
    report_number?: string | null
    title?: string
    content?: EditorJsContent
    meeting_scope?: MeetingScope
    client_id?: number | null
}

export interface UpdateNotePayload {
    report_number?: string | null
    title?: string
    content?: EditorJsContent
    meeting_scope?: MeetingScope
    client_id?: number | null
}

export interface ShareInvitedItem {
    employee_code: string
    employee_name?: string
    permission: SharePermission
}

export interface ShareInvitedPayload {
    shares: ShareInvitedItem[]
}

export interface NoteSingleResponse {
    data: Note
    success?: boolean
    message?: string
}

export interface NoteErrorResponse {
    message?: string
    success?: boolean
}

export interface LaravelValidationErrorResponse {
    message?: string
    errors?: Record<string, string[]>
}

export interface NoteApiResult<T> {
    success: boolean
    status: number
    message: string
    data?: T
    errors?: Record<string, string[]>
}

export type CreateStandardNoteRequest = CreateStandardNotePayload
export type CreateMeetingNoteRequest = CreateMeetingNotePayload
export type UpdateStandardNoteRequest = UpdateStandardNotePayload
export type UpdateMeetingNoteRequest = UpdateMeetingNotePayload
export type UpdateNoteRequest = UpdateNotePayload
export type ShareInvitedRequest = ShareInvitedPayload
export type NotesApiResponse<T> = NoteApiResult<T>
