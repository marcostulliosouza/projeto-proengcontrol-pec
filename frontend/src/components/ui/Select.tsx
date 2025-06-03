import React, { forwardRef } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Option[];
  placeholder?: string;
  onChange?: (value: string | number) => void;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  options,
  placeholder,
  onChange,
  className = '',
  value,
  ...props
}, ref) => {
  const selectClasses = `form-input ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      const selectedValue = e.target.value;
      // Tentar converter para número se possível
      const numericValue = Number(selectedValue);
      onChange(isNaN(numericValue) ? selectedValue : numericValue);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="form-label">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={selectClasses}
        value={value || ''}
        onChange={handleChange}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="form-error">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-secondary-500 text-sm mt-1">{helperText}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;