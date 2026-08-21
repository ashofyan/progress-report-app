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
}

interface LoginFormErrors {
    username?: string
    password?: string
    general?: string
}

const LoginForm = () => {
    const navigate = useNavigate()
    const { login } = useAuth()

    const [formData, setFormData] =
        useState<LoginFormData>({
            username: '',
            password: '',
        })

    const [errors, setErrors] =
        useState<LoginFormErrors>({})

    const [isSubmitting, setIsSubmitting] =
        useState<boolean>(false)

    const handleChange = (
        event: ChangeEvent<HTMLInputElement>,
    ): void => {
        const { name, value } = event.target

        if (name === 'username') {
            setFormData((previous) => ({
                ...previous,
                username: value,
            }))

            return
        }

        if (name === 'password') {
            setFormData((previous) => ({
                ...previous,
                password: value,
            }))
        }
    }

    const validateForm = (): boolean => {
        const validationErrors: LoginFormErrors = {}

        if (formData.username.trim() === '') {
            validationErrors.username =
                'Email wajib diisi.'
        }

        if (formData.password.trim() === '') {
            validationErrors.password =
                'Password wajib diisi.'
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
                general: result.message,
            })

            return
        }

        navigate('/dashboard', {
            replace: true,
        })
    }

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
        >
            {errors.general !== undefined && (
                <div
                    className="alert alert-danger"
                    role="alert"
                >
                    {errors.general}
                </div>
            )}

            <FormInput
                id="username"
                label="Email Address"
                type="email"
                name="username"
                value={formData.username}
                placeholder="you@email.com"
                icon="bi-envelope-at"
                autoComplete="username"
                error={errors.username}
                onChange={handleChange}
            />

            <FormInput
                id="password"
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                placeholder="Enter your password"
                icon="bi-key"
                autoComplete="current-password"
                error={errors.password}
                onChange={handleChange}
            />

            <button
                type="submit"
                className="login-button"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <>
            <span
                className="
                spinner-border
                spinner-border-sm
                me-2
              "
                aria-hidden="true"
            />

                        Logging in...
                    </>
                ) : (
                    'Login'
                )}
            </button>
        </form>
    )
}

export default LoginForm
