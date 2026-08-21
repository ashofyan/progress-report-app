import AdditionalTaskBoard from '@/features/additional-task/components/AdditionalTaskBoard'

import '@/features/additional-task/styles/additional-task.scss'

const AdditionalTaskPage = () => {
    return (
        <div className="additional-task-page">
            <div className="additional-task-heading">
                <h1 className="additional-task-title">
                    Master Pekerjaan Tambahan
                </h1>

                <div className="additional-task-breadcrumb">
                    <span className="active">
                        Master Data
                    </span>

                    <span>/</span>

                    <span>Pekerjaan Tambahan</span>
                </div>
            </div>

            <AdditionalTaskBoard />
        </div>
    )
}

export default AdditionalTaskPage
