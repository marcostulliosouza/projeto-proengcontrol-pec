import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  className = '',
  ...props
}, ref) => {
  const inputClasses = `form-input ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label className="form-label">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="form-error">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-secondary-500 text-sm mt-1">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;