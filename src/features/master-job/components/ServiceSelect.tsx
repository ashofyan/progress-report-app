import {
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from 'react'

import type {
    ServiceProduct,
} from '@/features/master-job/types/service.types'

interface ServiceSelectProps {
    services: ServiceProduct[]
    selectedCode: string
    isLoading: boolean
    errorMessage: string | null
    disabled?: boolean
    onSelect: (service: ServiceProduct) => void
}

const ServiceSelect = ({
                           services,
                           selectedCode,
                           isLoading,
                           errorMessage,
                           disabled = false,
                           onSelect,
                       }: ServiceSelectProps) => {
    const [isOpen, setIsOpen] =
        useState<boolean>(false)

    const [searchQuery, setSearchQuery] =
        useState<string>('')

    const wrapperRef =
        useRef<HTMLDivElement>(null)

    const selectedService = useMemo(
        () =>
            services.find(
                (service) =>
                    service.product_code === selectedCode,
            ) ?? null,
        [
            services,
            selectedCode,
        ],
    )

    const filteredServices = useMemo(() => {
        const query =
            searchQuery.trim().toLowerCase()

        if (query === '') {
            return services
        }

        return services.filter((service) => {
            const code =
                service.product_code.toLowerCase()

            const name =
                service.product_name.toLowerCase()

            return (
                code.includes(query) ||
                name.includes(query)
            )
        })
    }, [
        services,
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
        service: ServiceProduct,
    ): void => {
        onSelect(service)

        setSearchQuery('')
        setIsOpen(false)
    }

    return (
        <div
            ref={wrapperRef}
            className="service-select"
        >
            <button
                type="button"
                className={`service-select-trigger ${
                    isOpen ? 'active' : ''
                }`}
                disabled={disabled}
                onClick={handleToggle}
            >
        <span
            className={
                selectedService === null &&
                selectedCode === ''
                    ? 'placeholder'
                    : 'selected-value'
            }
        >
  {selectedService === null
      ? selectedCode === ''
          ? 'Pilih Nama Jasa/Pekerjaan'
          : selectedCode
      : `${selectedService.product_name} (${selectedService.product_code})`}
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
                <div className="service-select-dropdown">
                    <div className="service-select-search">
                        <i className="bi bi-search" />

                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Search..."
                            autoFocus
                            onChange={handleSearchChange}
                        />
                    </div>

                    <div className="service-select-options">
                        {isLoading && (
                            <div className="service-select-state">
                                <span className="spinner-border spinner-border-sm" />

                                Memuat data...
                            </div>
                        )}

                        {!isLoading &&
                            errorMessage !== null && (
                                <div className="service-select-state error">
                                    {errorMessage}
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null &&
                            filteredServices.length === 0 && (
                                <div className="service-select-state">
                                    Data tidak ditemukan.
                                </div>
                            )}

                        {!isLoading &&
                            errorMessage === null &&
                            filteredServices.map(
                                (service) => (
                                    <button
                                        key={service.id}
                                        type="button"
                                        className={`service-select-option ${
                                            selectedCode ===
                                            service.product_code
                                                ? 'selected'
                                                : ''
                                        }`}
                                        onClick={() =>
                                            handleSelect(service)
                                        }
                                    >
                    <span>
                      {service.product_name}
                    </span>

                                        <span className="service-select-code">
                      (
                                            {
                                                service.product_code
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

export default ServiceSelect
