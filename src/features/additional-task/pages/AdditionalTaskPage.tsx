import { useLocation } from 'react-router-dom'

import AdditionalTaskBoard from '@/features/additional-task/components/AdditionalTaskBoard'
import type { AdditionalTaskType } from '@/features/additional-task/types/additional-task.types'

import '@/features/additional-task/styles/additional-task.scss'

interface AdditionalTaskPageProps {
    defaultType?: AdditionalTaskType
}

const AdditionalTaskPage = ({ defaultType }: AdditionalTaskPageProps) => {
    const location = useLocation()

    const resolvedType: AdditionalTaskType =
        defaultType ??
        (location.pathname.includes('custom-pekerjaan')
            ? 'custom'
            : 'tambahan')

    const isCustom = resolvedType === 'custom'

    return (
        <div className="additional-task-page">
            <div className="additional-task-heading">
                <h1 className="additional-task-title">
                    {isCustom
                        ? 'Custom Pekerjaan'
                        : 'Pekerjaan Tambahan'}
                </h1>

                <div className="additional-task-breadcrumb">
                    {isCustom ? (
                        <>
                            <span className="active">
                                Master Data
                            </span>

                            <span>/</span>

                            <span>Custom Pekerjaan</span>
                        </>
                    ) : (
                        <span>Pekerjaan Tambahan</span>
                    )}
                </div>
            </div>

            <AdditionalTaskBoard defaultType={resolvedType} />
        </div>
    )
}

export default AdditionalTaskPage
