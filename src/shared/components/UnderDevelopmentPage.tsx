interface UnderDevelopmentPageProps {
    title: string
}

const UnderDevelopmentPage = ({
                                  title,
                              }: UnderDevelopmentPageProps) => {
    return (
        <div className="under-development-page">
            <div className="under-development-content">
                <div className="under-development-icon">
                    <i className="bi bi-gear-fill" />
                </div>

                <h1>{title}</h1>

                <p>Fitur dalam pengembangan</p>
            </div>
        </div>
    )
}

export default UnderDevelopmentPage
