import { useState } from 'react';

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  step?: string;
  error?: string;
  autoComplete?: string;
  onChange: (name: string, value: string) => void;
  onBlur?: (name: string, value: string) => void;
}

export default function Field({
  label,
  name,
  type = 'text',
  value,
  placeholder,
  required,
  disabled,
  min: minAttr,
  max: maxAttr,
  step: stepAttr,
  error,
  autoComplete,
  onChange,
  onBlur
}: FieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const inputId = `field-${name}`;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="block">
      <label htmlFor={inputId} className="label-cine block mb-1.5">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={minAttr}
          max={maxAttr}
          step={stepAttr}
          autoComplete={autoComplete}
          aria-describedby={errorId}
          onChange={(event) => onChange(name, event.target.value)}
          onBlur={onBlur ? () => onBlur(name, value) : undefined}
          // Añadidas clases dinámicas para cuando esté disabled o tenga error
          className={`input-cine w-full pr-10 text-sm transition-all duration-200
            ${error 
              ? 'border-red-500 bg-red-500/10 text-red-300 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-white/10 bg-black/20 text-white focus:border-cinema-gold'
            }
            ${disabled 
              ? 'opacity-40 cursor-not-allowed bg-black/40 border-white/5 select-none' 
              : ''
            }`}
        />
        
        {isPassword && !disabled && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-cinema-gray hover:text-white transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            )}
          </button>
        )}
      </div>

      {/* CORRECCIÓN: El error ahora se renderiza fuera del contenedor relativo para que se ubique abajo correctamente */}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1 animate-slide-down">
          <span className="text-red-500">🔴</span>
          {error}
        </p>
      )}
    </div>
  );
}