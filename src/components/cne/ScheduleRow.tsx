import React from 'react';
import { Lock } from 'lucide-react';
import { CNERecord, SessionUser } from '../../types';
import { isCneAuthorized, formatCneDateTimeDisplay } from '../../utils';

interface ScheduleRowProps {
  cls: CNERecord;
  idx: number;
  user: SessionUser | null;
  isAreaIncharge: boolean;
  rpDisplay: string;
  onSelect: (cls: CNERecord) => void;
}

export const ScheduleRow: React.FC<ScheduleRowProps> = React.memo(({
  cls,
  idx,
  user,
  isAreaIncharge,
  rpDisplay,
  onSelect
}) => {
  const isCompleted = (cls.status || '').toLowerCase() === 'completed';
  const isCanceled = (cls.status || '').toLowerCase().includes('cancel');

  return (
    <tr
      key={cls.cneId ? `${cls.cneId}-${idx}` : `cne-class-${idx}`}
      onClick={() => onSelect(cls)}
      className="hover:bg-slate-50/90 cursor-pointer transition-colors group"
    >
      <td className="py-3 px-4 whitespace-nowrap">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
            (cls.cneType || 'CENTRAL').toUpperCase() === 'CENTRAL'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-teal-50 text-teal-700 border border-teal-200'
          }`}
        >
          {(cls.cneType || 'CENTRAL').toUpperCase()}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="font-bold text-slate-900 line-clamp-2 max-w-xs md:max-w-sm" title={cls.topic}>
          {cls.topic}
        </div>
        {cls.isLocked && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 mt-0.5">
            <Lock className="w-2.5 h-2.5" /> Questions Locked
          </span>
        )}
        {cls.description && (
          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
            {cls.description}
          </div>
        )}
      </td>
      <td className="py-3 px-4 whitespace-nowrap">
        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {cls.area}
        </span>
        {isAreaIncharge && isCneAuthorized(user, cls.area, cls.cneType) && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            Your Ward
          </span>
        )}
      </td>
      <td className="py-3 px-4 whitespace-nowrap">
        <div className="font-semibold text-slate-800">
          {formatCneDateTimeDisplay(cls.date, cls.toDate)}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="line-clamp-2 max-w-[220px] text-slate-600 text-xs leading-relaxed" title={rpDisplay}>
          {rpDisplay}
        </div>
      </td>
      <td className="py-3 px-4 whitespace-nowrap">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
            isCompleted
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : isCanceled
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {isCompleted ? 'Completed' : isCanceled ? 'Canceled' : 'Scheduled'}
        </span>
      </td>
    </tr>
  );
});

ScheduleRow.displayName = 'ScheduleRow';
