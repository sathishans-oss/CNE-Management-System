import React from 'react';
import { Check, Circle } from 'lucide-react';

interface PasswordRequirementGuidanceProps {
  password: string;
}

export const PasswordRequirementGuidance: React.FC<PasswordRequirementGuidanceProps> = ({ password }) => {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isRecommended = (
    password.length >= 10 ||
    /[^A-Za-z0-9]/.test(password) ||
    (/[a-z]/.test(password) && /[A-Z]/.test(password))
  );

  let strengthLevel = 0;
  let strengthLabel = '';
  let strengthTextColor = 'text-slate-400';
  let strengthBarColor = 'bg-slate-200';

  if (password.length > 0) {
    if (!hasMinLength || !hasLetter || !hasNumber) {
      strengthLevel = 1;
      strengthLabel = 'Weak';
      strengthTextColor = 'text-rose-600';
      strengthBarColor = 'bg-rose-500';
    } else {
      const isStrong = (
        password.length >= 10 &&
        /[^A-Za-z0-9]/.test(password) &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password)
      );

      if (isStrong) {
        strengthLevel = 4;
        strengthLabel = 'Strong';
        strengthTextColor = 'text-emerald-700';
        strengthBarColor = 'bg-emerald-500';
      } else if (isRecommended) {
        strengthLevel = 3;
        strengthLabel = 'Good';
        strengthTextColor = 'text-teal-700';
        strengthBarColor = 'bg-teal-500';
      } else {
        strengthLevel = 2;
        strengthLabel = 'Fair';
        strengthTextColor = 'text-amber-700';
        strengthBarColor = 'bg-amber-500';
      }
    }
  }

  return (
    <div className="space-y-2 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
      {/* Strength indicator */}
      {password.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Password strength:</span>
            <span className={`font-bold ${strengthTextColor}`}>{strengthLabel}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-full rounded-full transition-all ${
                  step <= strengthLevel ? strengthBarColor : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Requirements checklist */}
      <div className="space-y-1 pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
          Password requirements
        </span>
        <div className="space-y-1">
          <div className={`flex items-center gap-1.5 text-[11px] ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>
            {hasMinLength ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="w-3 h-3 text-slate-400 shrink-0" />
            )}
            <span>At least 8 characters</span>
          </div>

          <div className={`flex items-center gap-1.5 text-[11px] ${hasLetter ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>
            {hasLetter ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="w-3 h-3 text-slate-400 shrink-0" />
            )}
            <span>At least one letter</span>
          </div>

          <div className={`flex items-center gap-1.5 text-[11px] ${hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>
            {hasNumber ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="w-3 h-3 text-slate-400 shrink-0" />
            )}
            <span>At least one number</span>
          </div>

          <div className={`flex items-center gap-1.5 text-[11px] ${hasMinLength && hasLetter && hasNumber && isRecommended ? 'text-teal-700 font-medium' : 'text-slate-400'}`}>
            {hasMinLength && hasLetter && hasNumber && isRecommended ? (
              <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            ) : (
              <Circle className="w-3 h-3 text-slate-300 shrink-0" />
            )}
            <span>Stronger password recommended (symbols or 10+ chars)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
