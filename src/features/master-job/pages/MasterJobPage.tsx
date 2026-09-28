import MasterJobBoard from '@/features/master-job/components/MasterJobBoard'

import '@/features/master-job/styles/master-job.scss'

const MasterJobPage = () => {
    return (
        <div className="master-job-page">
            <div className="master-job-heading">
                <h1 className="master-job-title">
                    Master Pekerjaan
                </h1>

                <div className="master-job-breadcrumb">
          <span className="active">
            Master Data
          </span>

                    <span>/</span>

                    <span>Pekerjaan</span>
                </div>
            </div>

            <MasterJobBoard />
        </div>
    )
}

export default MasterJobPage
