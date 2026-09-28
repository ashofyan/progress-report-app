import type { ChangeEvent, ReactNode } from 'react'

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
    disabled?: boolean
    endAction?: ReactNode
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
                       disabled = false,
                       endAction,
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
                } ${disabled ? 'disabled' : ''}`}
            >
                <i className={`bi ${icon} login-input-icon`} />

                <input
                    id={id}
                    type={type}
                    name={name}
                    value={value}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    disabled={disabled}
                    className="login-input"
                    onChange={onChange}
                />

                {endAction && (
                    <div className="login-input-end-action">
                        {endAction}
                    </div>
                )}
            </div>

            {error !== undefined && (
                <div className="login-error-message">
                    <i className="bi bi-exclamation-circle-fill me-1" />
                    {error}
                </div>
            )}
        </div>
    )
}

export default FormInput
