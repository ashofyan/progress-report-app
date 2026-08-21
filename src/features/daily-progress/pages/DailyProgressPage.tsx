import DailyProgressBoard from '@/features/daily-progress/components/DailyProgressBoard'

import '@/features/daily-progress/styles/daily-progress.scss'

const DailyProgressPage = () => {
    return (
        <div className="daily-progress-page">
            <div className="daily-progress-heading">
                <h1 className="daily-progress-title">
                    Daily Progress
                </h1>

                <div className="daily-progress-breadcrumb">
                    <span className="active">
                        Progress
                    </span>

                    <span>/</span>

                    <span>Daily Progress</span>
                </div>
            </div>

            <DailyProgressBoard />
        </div>
    )
}

export default DailyProgressPage
