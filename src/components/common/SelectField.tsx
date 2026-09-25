import React from 'react';

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  labelBadge?: string;
  error?: string;
  containerClassName?: string;
  children: React.ReactNode;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  labelBadge,
  error,
  containerClassName = '',
  className = '',
  disabled,
  required,
  children,
  ...props
}) => {
  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {(label || labelBadge) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              {label} {required && <span className="text-rose-500">*</span>}
            </label>
          )}
          {labelBadge && (
            <span className="text-[10px] text-slate-500 font-medium">
              {labelBadge}
            </span>
          )}
        </div>
      )}
      <select
        disabled={disabled}
        required={required}
        className={`w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none transition-all ${
          disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
            : 'text-slate-800'
        } ${error ? 'border-rose-400 focus:ring-rose-500' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
    </div>
  );
};
