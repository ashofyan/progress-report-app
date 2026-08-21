import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from 'react'

import type {
    MarketingClient,
} from '@/features/additional-task/types/client.types'

interface ClientSelectProps {
    clients: MarketingClient[]
    selectedCode: string
    isLoading: boolean
    errorMessage: string | null
    disabled?: boolean
    onSearch?: (query: string) => void
    onSelect: (client: MarketingClient) => void
}

const getClientName = (
    client: MarketingClient,
): string => {
    return (
        client.company_name ||
        client.customer_name ||
        client.customer_code
    )
}

const ClientSelect = ({
                          clients,
                          selectedCode,
                          isLoading,
                          errorMessage,
                          disabled = false,
                          onSearch,
                          onSelect,
                      }: ClientSelectProps) => {
    const [isOpen, setIsOpen] =
        useState<boolean>(false)

    const [searchQuery, setSearchQuery] =
        useState<string>('')

    const onSearchRef = useRef(onSearch)

    useEffect(() => {
        onSearchRef.current = onSearch
    }, [onSearch])

    const selectedClient = useMemo(
        () =>
            clients.find(
                (client) =>
                    client.customer_code === selectedCode,
            ) ?? null,
        [
            clients,
            selectedCode,
        ],
    )

    useEffect(() => {
        if (
            !isOpen ||
            onSearchRef.current === undefined
        ) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            onSearchRef.current?.(searchQuery.trim())
        }, 350)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [
        isOpen,
        searchQuery,
    ])

    const handleSearchChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        setSearchQuery(event.target.value)
    }

    const handleToggle = (): void => {
        if (disabled) {
            return
        }

        setIsOpen((previous) => !previous)
    }

    const handleSelect = (
        client: MarketingClient,
    ): void => {
        onSelect(client)
        setSearchQuery('')
        setIsOpen(false)
    }

    return (
        <div className="client-select">
            <button
                type="button"
                className={`client-select-trigger ${
                    isOpen ? 'active' : ''
                } ${
                    selectedCode !== '' ? 'selected' : ''
                }`}
                disabled={disabled}
                onClick={handleToggle}
            >
                <span
                    className={
                        selectedClient === null &&
                        selectedCode === ''
                            ? 'placeholder'
                            : 'selected-value'
                    }
                >
                    {selectedClient === null
                        ? selectedCode === ''
                            ? 'Pilih Kode Client'
                            : selectedCode
                        : `${getClientName(
                            selectedClient,
                        )} (${selectedClient.customer_code})`}
                </span>

                <i
                    className={`bi ${
                        isOpen
                            ? 'bi-chevron-up'
                            : 'bi-chevron-down'
                    }`}
                />
            </button>

            {isOpen && (
                <div className="client-select-dropdown">
                    <div className="client-select-search">
                        <i className="bi bi-search" />

                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Search..."
                            autoFocus
                            onChange={handleSearchChange}
                        />
                    </div>

                    <div className="client-select-options">
                        {isLoading && (
                            <div className="client-select-state">
                                <span className="spinner-border spinner-border-sm" />
                                Memuat data...
                            </div>
                        )}

                        {!isLoading &&
                            errorMessage !== null && (
                                <div className="client-select-state error">
                                    {errorMessage}
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null &&
                            clients.length === 0 && (
                                <div className="client-select-state">
                                    Data tidak ditemukan.
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null &&
                            clients.map(
                                (client) => (
                                    <button
                                        key={client.id}
                                        type="button"
                                        className={`client-select-option ${
                                            selectedCode ===
                                            client.customer_code
                                                ? 'selected'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            handleSelect(client)
                                        }
                                    >
                                        <span>
                                            {getClientName(
                                                client,
                                            )}
                                        </span>

                                        <span className="client-select-code">
                                            (
                                            {
                                                client.customer_code
                                            }
                                            )
                                        </span>
                                    </button>
                                ),
                            )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ClientSelect
