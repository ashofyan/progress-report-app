import { useCallback, useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'saved' | 'saving' | 'unsaved' | 'failed'

export interface UseAutosaveOptions {
    /**
     * Debounce wait time in milliseconds (pause duration after user stops typing).
     * Defaults to 1500ms.
     */
    debounceMs?: number

    /**
     * Throttle limit (max wait) in milliseconds (maximum delay before autosave is forced during continuous typing).
     * Defaults to 5000ms.
     */
    throttleMs?: number

    /**
     * Whether autosave is currently active/enabled.
     * Defaults to true.
     */
    enabled?: boolean

    /**
     * Optional callback on successful save.
     */
    onSuccess?: () => void

    /**
     * Optional callback on save error.
     */
    onError?: (error: unknown) => void
}

export interface UseAutosaveReturn {
    saveState: AutosaveStatus
    lastSavedAt: Date | null
    errorMessage: string | null
    notifyChange: () => void
    triggerSaveNow: () => Promise<boolean>
    setSaveState: (state: AutosaveStatus) => void
    resetAutosave: () => void
}

/**
 * Custom hook implementing Debouncing and Throttling for autosaved operations.
 *
 * Mechanics:
 * - Debouncing: Postpones invocation until the user has stopped typing/editing for `debounceMs`.
 * - Throttling (Max Wait): Guarantees that if the user edits continuously without pause,
 *   a save will be triggered at least once every `throttleMs`.
 * - Concurrency Safe: Avoids parallel duplicate network requests; if changes occur while saving,
 *   a follow-up save is automatically scheduled once the active request completes.
 */
export const useAutosave = (
    saveFn: () => Promise<boolean | void>,
    options: UseAutosaveOptions = {},
): UseAutosaveReturn => {
    const {
        debounceMs = 1500,
        throttleMs = 5000,
        enabled = true,
        onSuccess,
        onError,
    } = options

    const [saveState, setSaveState] = useState<AutosaveStatus>('saved')
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Callback refs
    const saveFnRef = useRef(saveFn)
    const onSuccessRef = useRef(onSuccess)
    const onErrorRef = useRef(onError)

    useEffect(() => {
        saveFnRef.current = saveFn
        onSuccessRef.current = onSuccess
        onErrorRef.current = onError
    }, [saveFn, onSuccess, onError])

    // Timing and concurrency control refs
    const debounceTimerRef = useRef<number | null>(null)
    const firstChangeTimestampRef = useRef<number | null>(null)
    const isSavingRef = useRef<boolean>(false)
    const hasPendingChangesWhileSavingRef = useRef<boolean>(false)
    const isMountedRef = useRef<boolean>(true)

    const clearDebounceTimer = useCallback(() => {
        if (debounceTimerRef.current !== null) {
            window.clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
        }
    }, [])

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            clearDebounceTimer()
        }
    }, [clearDebounceTimer])

    // Prevent accidental tab closure if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saveState === 'unsaved' || isSavingRef.current || hasPendingChangesWhileSavingRef.current) {
                e.preventDefault()
                e.returnValue = ''
                return ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [saveState])

    const performSave = useCallback(async (): Promise<boolean> => {
        clearDebounceTimer()
        firstChangeTimestampRef.current = null

        if (isSavingRef.current) {
            // A save request is already in-flight.
            // Queue pending save to run right after current finishes.
            hasPendingChangesWhileSavingRef.current = true
            return false
        }

        isSavingRef.current = true
        hasPendingChangesWhileSavingRef.current = false

        if (isMountedRef.current) {
            setSaveState('saving')
            setErrorMessage(null)
        }

        try {
            const result = await saveFnRef.current()

            // If save function returns false (e.g. validation paused), keep unsaved without marking failed
            if (result === false) {
                if (isMountedRef.current) {
                    isSavingRef.current = false
                    setSaveState('unsaved')
                }
                return false
            }

            if (isMountedRef.current) {
                isSavingRef.current = false
                const now = new Date()
                setLastSavedAt(now)

                if (hasPendingChangesWhileSavingRef.current) {
                    // Changes occurred during the network save operation:
                    // Mark unsaved and schedule the next debounced save
                    hasPendingChangesWhileSavingRef.current = false
                    setSaveState('unsaved')
                    firstChangeTimestampRef.current = Date.now()
                    debounceTimerRef.current = window.setTimeout(() => {
                        void performSave()
                    }, debounceMs)
                } else {
                    setSaveState('saved')
                }

                if (onSuccessRef.current) {
                    onSuccessRef.current()
                }
            }
            return true
        } catch (err: unknown) {
            if (isMountedRef.current) {
                isSavingRef.current = false
                setSaveState('failed')
                const msg = err instanceof Error ? err.message : 'Gagal menyimpan perubahan otomatis.'
                setErrorMessage(msg)
                if (onErrorRef.current) {
                    onErrorRef.current(err)
                }
            }
            return false
        }
    }, [clearDebounceTimer, debounceMs])

    const notifyChange = useCallback(() => {
        if (!enabled) return

        if (isMountedRef.current && saveState !== 'unsaved') {
            setSaveState('unsaved')
            setErrorMessage(null)
        }

        const now = Date.now()

        // 1. Record first change timestamp for throttling
        if (firstChangeTimestampRef.current === null) {
            firstChangeTimestampRef.current = now
        }

        const elapsed = now - firstChangeTimestampRef.current

        // 2. Throttling trigger:
        // If elapsed time has reached or exceeded throttleMs, save immediately!
        if (elapsed >= throttleMs) {
            clearDebounceTimer()
            void performSave()
            return
        }

        // 3. Debouncing with Throttle upper bound:
        // Delay save by debounceMs, capped at the remaining throttle time
        const remainingUntilThrottle = throttleMs - elapsed
        const delay = Math.min(debounceMs, remainingUntilThrottle)

        clearDebounceTimer()
        debounceTimerRef.current = window.setTimeout(() => {
            void performSave()
        }, delay)
    }, [clearDebounceTimer, debounceMs, enabled, performSave, saveState, throttleMs])

    const triggerSaveNow = useCallback(async (): Promise<boolean> => {
        clearDebounceTimer()
        return performSave()
    }, [clearDebounceTimer, performSave])

    const resetAutosave = useCallback(() => {
        clearDebounceTimer()
        firstChangeTimestampRef.current = null
        hasPendingChangesWhileSavingRef.current = false
        if (isMountedRef.current) {
            setSaveState('saved')
            setErrorMessage(null)
        }
    }, [clearDebounceTimer])

    return {
        saveState,
        lastSavedAt,
        errorMessage,
        notifyChange,
        triggerSaveNow,
        setSaveState,
        resetAutosave,
    }
}

export default useAutosave
