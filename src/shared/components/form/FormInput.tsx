import type { ChangeEvent } from 'react'

interface FormInputProps {
    id: string
    label: string
    type: 'email' | 'password' | 'text'
    name: string
    value: string
    placeholder: string
    icon: string
    error?: string
    autoComplete?: string
    onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

const FormInput = ({
                       id,
                       label,
                       type,
                       name,
                       value,
                       placeholder,
                       icon,
                       error,
                       autoComplete,
                       onChange,
                   }: FormInputProps) => {
    return (
        <div className="login-form-group">
            <label htmlFor={id} className="login-form-label">
                {label}
            </label>

            <div
                className={`login-input-wrapper ${
                    error !== undefined ? 'login-input-error' : ''
                }`}
            >
                <i className={`bi ${icon} login-input-icon`} />

                <input
                    id={id}
                    type={type}
                    name={name}
                    value={value}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className="login-input"
                    onChange={onChange}
                />
            </div>

            {error !== undefined && (
                <div className="login-error-message">{error}</div>
            )}
        </div>
    )
}

export default FormInput
