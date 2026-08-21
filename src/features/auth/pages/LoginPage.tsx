import LoginForm from '@/features/auth/components/LoginForm'

import '@/features/auth/styles/login.scss'

const LoginPage = () => {
    return (
        <main className="login-page">
            <section className="login-card">
                <div className="login-header">
                    <h1 className="login-title">Welcome back!</h1>

                    <p className="login-subtitle">
                        Start managing your project progress report!
                    </p>
                </div>

                <LoginForm />
            </section>
        </main>
    )
}

export default LoginPage
