import {
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import FormInput from '@/shared/components/form/FormInput'

interface LoginFormData {
    username: string
    password: string
    rememberMe: boolean
}

interface LoginFormErrors {
    username?: string
    password?: string
    general?: string
}

const LoginForm = () => {
    const navigate = useNavigate()
    const { login } = useAuth()

    const [formData, setFormData] = useState<LoginFormData>({
        username: '',
        password: '',
        rememberMe: true,
    })

    const [showPassword, setShowPassword] = useState<boolean>(false)
    const [errors, setErrors] = useState<LoginFormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

    const handleChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        const { name, value, type, checked } = event.target

        setFormData((previous) => ({
            ...previous,
            [name]: type === 'checkbox' ? checked : value,
        }))

        // Clear field error on change
        if (errors[name as keyof LoginFormErrors]) {
            setErrors((previous) => ({
                ...previous,
                [name]: undefined,
                general: undefined,
            }))
        }
    }

    const validateForm = (): boolean => {
        const validationErrors: LoginFormErrors = {}

        if (formData.username.trim() === '') {
            validationErrors.username = 'Alamat email atau ID pengguna wajib diisi.'
        }

        if (formData.password.trim() === '') {
            validationErrors.password = 'Kata sandi akun wajib diisi.'
        }

        setErrors(validationErrors)

        return (
            validationErrors.username === undefined &&
            validationErrors.password === undefined
        )
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()
        setErrors({})

        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)

        const result = await login({
            username: formData.username.trim(),
            password: formData.password,
        })

        setIsSubmitting(false)

        if (!result.success) {
            setErrors({
                general: result.message || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.',
            })
            return
        }

        navigate('/dashboard', {
            replace: true,
        })
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="login-form">
            {errors.general !== undefined && (
                <div className="login-alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle-fill login-alert-icon" />
                    <div className="login-alert-text">{errors.general}</div>
                </div>
            )}

            <FormInput
                id="username"
                label="Email / Username"
                type="text"
                name="username"
                value={formData.username}
                placeholder="nama@alsholdings.com"
                icon="bi-envelope-at"
                autoComplete="username"
                disabled={isSubmitting}
                error={errors.username}
                onChange={handleChange}
            />

            <FormInput
                id="password"
                label="Kata Sandi"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                placeholder="Masukkan kata sandi akun"
                icon="bi-shield-lock"
                autoComplete="current-password"
                disabled={isSubmitting}
                error={errors.password}
                onChange={handleChange}
                endAction={
                    <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowPassword((prev) => !prev)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                    </button>
                }
            />

            <div className="login-form-options">
                <label className="login-remember-checkbox">
                    <input
                        type="checkbox"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                    <span className="login-checkbox-custom" />
                    <span className="login-checkbox-label">Ingat sesi saya</span>
                </label>
            </div>

            <button
                type="submit"
                className="login-submit-button"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <>
                        <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                        />
                        <span>Memproses Masuk...</span>
                    </>
                ) : (
                    <>
                        <span>Masuk ke Dashboard</span>
                        <i className="bi bi-arrow-right ms-2" />
                    </>
                )}
            </button>
        </form>
    )
}

export default LoginForm
